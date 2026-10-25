import {readFileSync} from 'node:fs';
import {createGuide} from '../public/engine.mjs';
import {factsToQuestion, GuideError, parseWithBailian} from './bailian.mjs';

const knowledge = JSON.parse(readFileSync(new URL('../docs/research/hku-recycling/knowledge_base.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(readFileSync(new URL('../docs/research/hku-recycling/sources.json', import.meta.url), 'utf8'));
const answer = createGuide(knowledge, catalog);

export function createGuideService({env = process.env, fetchImpl = fetch, timeoutMs = 15_000, now = Date.now} = {}) {
  let active = false;
  let recent = [];
  return async function guide(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.question !== 'string' ||
        !body.question.trim() || body.question.length > 600 ||
        Object.keys(body).some(key => !['question', 'cleanliness'].includes(key)) ||
        (body.cleanliness !== undefined && !['clean', 'dirty'].includes(body.cleanliness))) {
      throw new GuideError('invalid_request', 400);
    }
    const question = body.question.trim();
    const options = body.cleanliness ? {cleanliness: body.cleanliness} : {};
    const original = answer(question, options);
    // Retain existing explicit exclusions and referrals even if a model would overlook them.
    const protectedTitles = ['I cannot confirm damaged glass.', 'Does it contain other materials?',
      'I cannot confirm it in this condition.', 'Please check one item at a time.', 'What is the item actually made of?',
      'What is the takeaway box made of?'];
    if (['refer', 'out_of_scope', 'not_accepted'].includes(original.status) || body.cleanliness ||
        original.inputType === 'takeaway_box' || protectedTitles.includes(original.title)) {
      return {result: original, mode: 'rules'};
    }
    if (!env.BAILIAN_API_KEY?.trim()) throw new GuideError('ai_not_configured');
    // A single in-flight request and 12 calls/minute per process; never auto-retry.
    // Serverless replicas do not share this guard. See README for deployment limits.
    const timestamp = now();
    recent = recent.filter(time => timestamp - time < 60_000);
    if (active || recent.length >= 12) throw new GuideError('ai_busy', 429);
    active = true;
    recent.push(timestamp);
    try {
      const facts = await parseWithBailian(question, {knowledge, env, fetchImpl, timeoutMs});
      // When the English engine already identifies a missing prerequisite, the
      // model cannot manufacture it from an item label (e.g. "Clean pizza boxes").
      if (original.title === 'Is the item clean and free of contents?' && facts.cleanliness === 'clean') facts.cleanliness = 'unknown';
      if (original.title === 'Is it a portable household battery?') facts.portable_household = false;
      if (original.title === 'Is the battery intact?' && facts.condition === 'intact') facts.condition = 'unknown';
      const canonicalQuestion = factsToQuestion(facts);
      const result = answer(canonicalQuestion);
      // A model must not silently turn an explicit supported item into a different rule.
      const originalIds = original.citations.map(citation => citation.ruleId).filter(Boolean);
      if (originalIds.length && originalIds.length === 1 && !['refer', 'out_of_scope'].includes(result.status)) {
        const resultIds = result.citations.map(citation => citation.ruleId).filter(Boolean);
        if (resultIds.length && !resultIds.includes(originalIds[0]) && !(originalIds[0] === 'R15' && resultIds.includes('R04'))) {
          return {result: original, mode: 'rules'};
        }
      }
      return {result, mode: 'ai'};
    } finally {
      active = false;
    }
  };
}

export {GuideError};
