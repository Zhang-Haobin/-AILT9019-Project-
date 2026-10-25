import {createGuideService, GuideError} from './guide-service.mjs';

function send(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  if (Number(request.headers['content-length']) > 4096) throw new GuideError('request_too_large', 413);
  if (request.body !== undefined) {
    const text = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    if (Buffer.byteLength(text) > 4096) throw new GuideError('request_too_large', 413);
    try { return JSON.parse(text); } catch { throw new GuideError('invalid_request', 400); }
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += Buffer.byteLength(chunk);
    if (length > 4096) throw new GuideError('request_too_large', 413);
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new GuideError('invalid_request', 400); }
}

export function createGuideHandler({guide = createGuideService()} = {}) {
  return async function handler(request, response) {
    try {
      if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return send(response, 405, {error: 'method_not_allowed'});
      }
      const origin = request.headers.origin;
      if (origin) {
        let host;
        try { host = new URL(origin).host; } catch { throw new GuideError('origin_not_allowed', 403); }
        if (host !== request.headers.host) throw new GuideError('origin_not_allowed', 403);
      }
      if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        throw new GuideError('json_required', 415);
      }
      const payload = await guide(await readBody(request));
      send(response, 200, payload);
    } catch (error) {
      const known = error instanceof GuideError;
      const status = known ? error.status : 500;
      if (status === 429) response.setHeader('Retry-After', '60');
      send(response, status, {error: known ? error.code : 'server_error'});
    }
  };
}
