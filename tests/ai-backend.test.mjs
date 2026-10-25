import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFileSync} from 'node:fs';
import {createGuideService} from '../lib/guide-service.mjs';
import {createGuideHandler} from '../lib/guide-handler.mjs';
import {DEFAULT_BASE_URL, factsToQuestion, parseWithBailian, validateFacts} from '../lib/bailian.mjs';
import {createQueryGuide} from '../public/guide-client.mjs';
import {createGuide} from '../public/engine.mjs';

const research = new URL('../docs/research/hku-recycling/', import.meta.url);
const knowledge = JSON.parse(readFileSync(new URL('knowledge_base.json', research)));
const catalog = JSON.parse(readFileSync(new URL('sources.json', research)));
const answer = createGuide(knowledge, catalog);
const env = {BAILIAN_API_KEY: 'test-only-placeholder'};
const facts = changes => ({item: 'R15', cleanliness: 'unknown', condition: 'unknown', scope: 'unknown',
  intent: 'recycle', hazardous: false, multiple: false, mixed_materials: false, portable_household: false, ...changes});
const completion = value => new Response(JSON.stringify({choices: [{finish_reason: 'stop', message: {content: JSON.stringify(value)}}]}));
const serviceWith = value => createGuideService({env, fetchImpl: async () => completion(value)});

test('Bailian uses the school endpoint, server-only bearer key, bounded non-thinking JSON request and no redirect', async () => {
  let calls = 0;
  const guide = createGuideService({env, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, `${DEFAULT_BASE_URL}/chat/completions`);
    assert.equal(options.headers.Authorization, `Bearer ${env.BAILIAN_API_KEY}`);
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'qwen3.8-flash');
    assert.equal(body.enable_thinking, false);
    assert.equal(body.stream, false);
    assert.equal(body.max_completion_tokens, 400);
    assert.deepEqual(body.response_format, {type: 'json_object'});
    assert.equal(body.messages[1].content, '这个披萨盒上还有油，能回收吗？');
    return completion(facts({cleanliness: 'dirty'}));
  }});
  const payload = await guide({question: '这个披萨盒上还有油，能回收吗？'});
  assert.equal(payload.mode, 'ai');
  assert.equal(payload.result.status, 'not_accepted');
  assert.ok(payload.result.citations.some(c => c.ruleId === 'R04'));
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(payload).includes(env.BAILIAN_API_KEY));
});

test('configured model and base URL are respected without replacing the school endpoint', async () => {
  await parseWithBailian('test', {knowledge, env: {...env, BAILIAN_BASE_URL: `${DEFAULT_BASE_URL}/`, BAILIAN_MODEL: 'qwen3.7-plus'}, fetchImpl: async (url, options) => {
    assert.equal(url, `${DEFAULT_BASE_URL}/chat/completions`);
    assert.equal(JSON.parse(options.body).model, 'qwen3.7-plus');
    return completion(facts());
  }});
});

for (const [description, value, expected, ruleId] of [
  ['clean pizza box', facts({cleanliness: 'clean'}), 'accepted', 'R15'],
  ['missing cleanliness', facts(), 'clarify', 'R15'],
  ['coffee cup', facts({item: 'R16', cleanliness: 'clean'}), 'separate', 'R16'],
  ['unknown ceramic', facts({item: 'unknown'}), 'unknown', undefined],
  ['generic bottle', facts({item: 'bottle'}), 'clarify', undefined],
  ['generic battery', facts({item: 'battery'}), 'clarify', undefined],
  ['generic food box', facts({item: 'food_box'}), 'clarify', undefined],
  ['paper food box is not automatically office paper', facts({item: 'paper_food_box', cleanliness: 'clean'}), 'unknown', undefined],
  ['foam food box has no supported rule', facts({item: 'foam_food_box'}), 'unknown', undefined],
  ['rechargeable type unknown', facts({item: 'R12'}), 'clarify', 'R12'],
  ['rechargeable condition unknown', facts({item: 'R12', portable_household: true}), 'clarify', 'R12'],
  ['intact household battery', facts({item: 'R12', portable_household: true, condition: 'intact'}), 'accepted', 'R12'],
  ['damaged battery', facts({item: 'battery', condition: 'damaged'}), 'refer', 'R14'],
  ['broken glass', facts({item: 'R10', cleanliness: 'clean', condition: 'damaged'}), 'unknown', 'R10'],
  ['mixed plastic bottle', facts({item: 'R07', cleanliness: 'clean', mixed_materials: true}), 'clarify', 'R08'],
  ['hazardous container', facts({item: 'R07', cleanliness: 'clean', hazardous: true}), 'refer', undefined],
  ['other collection point', facts({cleanliness: 'clean', scope: 'other_facility'}), 'out_of_scope', undefined],
  ['special event', facts({scope: 'special_event'}), 'out_of_scope', undefined],
  ['multiple items', facts({multiple: true}), 'clarify', undefined],
  ['kiosk location', facts({intent: 'location'}), 'information', undefined],
]) {
  test(`validated facts: ${description}`, () => {
    const result = answer(factsToQuestion(value));
    assert.equal(result.status, expected);
    if (ruleId) assert.ok(result.citations.some(c => c.ruleId === ruleId));
    for (const citation of result.citations) {
      assert.equal(citation.url, catalog.sources.find(source => source.id === citation.id).url);
    }
  });
}

test('English exclusions, hazards, dirty conditions, damaged glass and multi-item guards bypass AI', async () => {
  const guide = createGuideService({env, fetchImpl: () => {throw new Error('Must not call AI');}});
  for (const question of ['dirty pizza box', 'laboratory chemical waste in a plastic bottle',
    'clean glass bottle in a smart bin', 'dirty plastic bottle', 'clean broken glass bottle',
    'clean plastic bottle with metal parts', 'clean pizza box and aluminium can']) {
    const payload = await guide({question});
    assert.equal(payload.mode, 'rules');
    assert.deepEqual(payload.result, answer(question));
  }
});

test('cleanliness follow-up retains dirty text precedence and requires no second AI call', async () => {
  const guide = serviceWith(facts());
  const first = await guide({question: '披萨盒能回收吗？'});
  const choice = first.result.choices.find(option => option.cleanliness === 'clean');
  assert.equal((await guide({question: choice.query, cleanliness: choice.cleanliness})).result.status, 'accepted');
  assert.equal((await guide({question: 'dirty pizza box', cleanliness: 'clean'})).result.status, 'not_accepted');
});

test('generic fast-food box is clarified even without AI, and explicit paper or foam cannot be remapped', async () => {
  const guide = createGuideService({env: {}, fetchImpl: () => {throw new Error('No model call expected');}});
  const response = await guide({question: 'Where can i throw Fast food box'});
  assert.equal(response.mode, 'rules');
  assert.equal(response.result.status, 'clarify');
  assert.equal(response.result.title, 'What is the takeaway box made of?');
  for (const question of ['paper takeaway box', 'foam fast food box']) {
    const result = await guide({question});
    assert.equal(result.mode, 'rules');
    assert.equal(result.result.status, 'unknown');
  }
});

test('AI can classify a Chinese food container without guessing its material', async () => {
  const result = await serviceWith(facts({item: 'food_box'}))({question: '外卖餐盒怎么处理？'});
  assert.equal(result.mode, 'ai');
  assert.equal(result.result.title, 'What is the takeaway box made of?');
});

test('AI cannot change an explicitly supported item to an unrelated accepted rule', async () => {
  const payload = await serviceWith(facts({item: 'R05'}))({question: 'clean pizza box'});
  assert.equal(payload.mode, 'rules');
  assert.ok(payload.result.citations.some(c => c.ruleId === 'R15'));
});

test('AI cannot fill an English prerequisite that the existing engine found missing', async () => {
  const cleanGuess = await serviceWith(facts({cleanliness: 'clean'}))({question: 'pizza box'});
  assert.equal(cleanGuess.result.status, 'clarify');
  const householdGuess = await serviceWith(facts({item: 'R12', portable_household: true, condition: 'intact'}))({question: 'rechargeable battery'});
  assert.equal(householdGuess.result.status, 'clarify');
  const intactGuess = await serviceWith(facts({item: 'R12', portable_household: true, condition: 'intact'}))({question: 'portable household rechargeable battery'});
  assert.equal(intactGuess.result.status, 'clarify');
});

test('missing key and malformed user input make no external calls', async () => {
  const guide = createGuideService({env: {}, fetchImpl: () => {throw new Error('Must not call');}});
  await assert.rejects(guide({question: 'pizza box'}), {code: 'ai_not_configured'});
  for (const body of [null, [], {}, {question: ''}, {question: 'x'.repeat(601)}, {question: 1},
    {question: 'pizza box', model: 'expensive'}, {question: 'pizza box', cleanliness: 'maybe'}]) {
    await assert.rejects(guide(body), {code: 'invalid_request', status: 400});
  }
});

test('invalid AI fields, injected advice and guessed identifiers are rejected', () => {
  for (const invalid of [null, [], {}, facts({item: 'R99'}), facts({cleanliness: 'yes'}),
    facts({hazardous: 'false'}), {...facts(), recommendation: 'Use any bin'}]) {
    assert.throws(() => validateFacts(invalid), {code: 'invalid_ai_response'});
  }
});

test('provider errors do not leak details or retry; the concurrency slot is released', async () => {
  let calls = 0;
  const guide = createGuideService({env, fetchImpl: async () => {
    calls++;
    if (calls === 1) return new Response(`secret ${env.BAILIAN_API_KEY}`, {status: 401});
    return completion(facts());
  }});
  await assert.rejects(guide({question: 'pizza box'}), error => error.code === 'ai_unavailable' && !error.message.includes(env.BAILIAN_API_KEY));
  assert.equal(calls, 1);
  assert.equal((await guide({question: 'pizza box'})).mode, 'ai');
});

test('truncated, non-JSON and non-schema model responses fail closed', async () => {
  for (const data of [
    {choices: [{finish_reason: 'length', message: {content: '{}'}}]},
    {choices: [{finish_reason: 'stop', message: {content: 'Use the paper bin'}}]},
    {choices: [{finish_reason: 'stop', message: {content: '{"item":"R99"}'}}]},
    {},
  ]) {
    const guide = createGuideService({env, fetchImpl: async () => new Response(JSON.stringify(data))});
    await assert.rejects(guide({question: 'pizza box'}));
  }
});

test('in-flight requests are rejected and minute limit resets without a queue or retry', async () => {
  let finish;
  let calls = 0;
  let clock = 1000;
  const guide = createGuideService({env, now: () => clock, fetchImpl: async () => {
    calls++;
    if (calls === 1) await new Promise(resolve => {finish = resolve;});
    return completion(facts());
  }});
  const first = guide({question: 'pizza box'});
  await assert.rejects(guide({question: 'pizza box'}), {code: 'ai_busy', status: 429});
  finish();
  await first;
  for (let i = 0; i < 11; i++) await guide({question: 'pizza box'});
  await assert.rejects(guide({question: 'pizza box'}), {code: 'ai_busy'});
  assert.equal(calls, 12);
  clock += 60_000;
  await guide({question: 'pizza box'});
  assert.equal(calls, 13);
});

test('upstream timeout returns a bounded safe error', async () => {
  const guide = createGuideService({env, timeoutMs: 1, fetchImpl: async () => {throw new DOMException('private request', 'TimeoutError');}});
  await assert.rejects(guide({question: 'pizza box'}), {code: 'ai_timeout', status: 504});
});

async function request(handler, {method = 'POST', text = '{"question":"pizza box"}', headers = {}} = {}) {
  const req = Readable.from([text]);
  req.method = method;
  req.headers = {host: 'localhost:8000', 'content-type': 'application/json', ...headers};
  const res = {headers: {}, setHeader(name, value) {this.headers[name.toLowerCase()] = value;}, end(value) {this.body = JSON.parse(value);}};
  await handler(req, res);
  return res;
}

test('HTTP boundary rejects malformed, oversized, cross-origin and non-JSON requests before model calls', async () => {
  let calls = 0;
  const handler = createGuideHandler({guide: async () => {calls++; return {};}});
  const cases = [
    [{method: 'GET'}, 405], [{text: '{'}, 400], [{text: 'x'.repeat(4097)}, 413],
    [{headers: {'content-length': '4097'}}, 413],
    [{headers: {'content-type': 'text/plain'}}, 415],
    [{headers: {origin: 'https://other.example'}}, 403],
    [{headers: {origin: 'null'}}, 403],
  ];
  for (const [options, status] of cases) assert.equal((await request(handler, options)).statusCode, status);
  assert.equal(calls, 0);
});

test('Vercel pre-parsed request bodies and same-origin requests work', async () => {
  const handler = createGuideHandler({guide: serviceWith(facts({cleanliness: 'clean'}))});
  const req = {method: 'POST', body: {question: '干净的披萨盒'}, headers: {host: 'example.test', origin: 'https://example.test', 'content-type': 'application/json'}};
  const res = {setHeader() {}, end(text) {this.body = JSON.parse(text);}};
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.result.status, 'accepted');
});

test('unconfigured HTTP API returns a clear non-secret error with no caching', async () => {
  const handler = createGuideHandler({guide: createGuideService({env: {}})});
  const res = await request(handler);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, {error: 'ai_not_configured'});
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('browser fallback is explicit for missing backend, timeout, invalid response or exhausted quota', async () => {
  const failures = [
    async () => new Response('', {status: 404}),
    async () => new Response('', {status: 429}),
    async () => {throw new DOMException('timeout', 'TimeoutError');},
    async () => new Response('{}'),
  ];
  for (const fetchImpl of failures) {
    const query = createQueryGuide(answer, {fetchImpl});
    const payload = await query('clean pizza box');
    assert.equal(payload.result.status, 'accepted');
    assert.equal(payload.mode, 'rules');
    assert.match(payload.notice, /unavailable.*English rule lookup/);
    const chinese = await query('披萨盒');
    assert.equal(chinese.result.status, 'clarify');
  }
});

test('browser sends only question and follow-up condition, and labels AI-assisted output', async () => {
  const handler = createGuideHandler({guide: serviceWith(facts({cleanliness: 'clean'}))});
  const query = createQueryGuide(answer, {fetchImpl: async (url, options) => {
    assert.equal(url, '/api/guide');
    assert.deepEqual(Object.keys(JSON.parse(options.body)), ['question']);
    const res = await request(handler, {text: options.body});
    return new Response(JSON.stringify(res.body), {status: res.statusCode});
  }});
  const payload = await query('干净的披萨盒');
  assert.equal(payload.mode, 'ai');
  assert.equal(payload.result.status, 'accepted');
  assert.match(payload.notice, /AI interpreted/);
});
