const FALLBACK_NOTICE = 'AI interpretation is unavailable. This answer uses the English rule lookup; use a supported English item name if needed.';
const STATUSES = ['accepted', 'separate', 'clarify', 'unknown', 'not_accepted', 'refer', 'out_of_scope', 'information'];

function isResult(result) {
  return result && STATUSES.includes(result.status) &&
    ['title', 'explanation', 'facility'].every(key => typeof result[key] === 'string') &&
    Array.isArray(result.steps) && result.steps.every(step => typeof step === 'string') &&
    Array.isArray(result.choices) && result.choices.every(choice => typeof choice?.label === 'string' && typeof choice.query === 'string') &&
    Array.isArray(result.citations) && result.citations.every(citation => {
      try { return new URL(citation.url).protocol === 'https:' && typeof citation.title === 'string' && typeof citation.locator === 'string'; }
      catch { return false; }
    });
}

export function createQueryGuide(answer, {fetchImpl = fetch, timeoutMs = 20_000} = {}) {
  return async function queryGuide(question, options = {}) {
    try {
      const response = await fetchImpl('/api/guide', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({question, ...(options.cleanliness ? {cleanliness: options.cleanliness} : {})}),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error('Guidance unavailable');
      const payload = await response.json();
      if (!['ai', 'rules'].includes(payload.mode) || !isResult(payload.result)) throw new Error('Invalid guidance');
      return {
        ...payload,
        notice: payload.mode === 'ai' ? 'AI interpreted your question. The answer and sources come from the published rule set.' : 'Checked against the published rule set.',
      };
    } catch {
      return {result: answer(question, options), mode: 'rules', notice: FALLBACK_NOTICE};
    }
  };
}
