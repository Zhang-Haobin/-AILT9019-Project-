import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAppServer, handleStartupError, LOCAL_SERVICE_ID} from '../scripts/dev-server.mjs';

function request(server, url, method = 'GET') {
  return new Promise(resolve => {
    const response = {
      statusCode: 200, headers: {},
      setHeader(name, value) {this.headers[name.toLowerCase()] = value;},
      writeHead(status) {this.statusCode = status; return this;},
      end(body) {this.body = body; resolve(this);},
    };
    server.emit('request', {url, method}, response);
  });
}

test('local server serves required assets, correct MIME types and HEAD without exposing project files', async () => {
  const server = createAppServer((_req, res) => {res.end('api reached');});
  for (const [url, mime] of [['/', 'text/html'], ['/guide-client.mjs', 'text/javascript'],
    ['/data/knowledge_base.json', 'application/json'], ['/sources/recycling-101.pdf', 'application/pdf']]) {
    const res = await request(server, url);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], mime);
    assert.ok(res.body.length > 0);
  }
  assert.equal((await request(server, '/', 'HEAD')).body, undefined);
  for (const url of ['/.env', '/.env.example', '/lib/bailian.mjs', '/.git/config', '/package.json', '/docs/', '/%2e%2e/.env']) {
    assert.equal((await request(server, url)).statusCode, 404, url);
  }
  assert.equal((await request(server, '/api/guide', 'POST')).body, 'api reached');
});

test('local health check identifies this backend without disclosing credentials or paths', async () => {
  const server = createAppServer();
  const res = await request(server, '/api/health');
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.deepEqual(JSON.parse(res.body), {service: LOCAL_SERVICE_ID});
  assert.equal((await request(server, '/api/health', 'HEAD')).body, undefined);
  assert.equal((await request(server, '/api/health', 'POST')).statusCode, 404);
});

test('repeated launch recognises the running backend and exits successfully', async () => {
  const messages = [];
  const code = await handleStartupError({code: 'EADDRINUSE'}, 8000, {
    fetchImpl: async (url, options) => {
      assert.equal(url, 'http://127.0.0.1:8000/api/health');
      assert.equal(options.redirect, 'error');
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(JSON.stringify({service: LOCAL_SERVICE_ID}));
    },
    log: message => messages.push(message), errorLog: () => assert.fail('Should not report an error'),
  });
  assert.equal(code, 0);
  assert.match(messages[0], /Already running: http:\/\/127.0.0.1:8000/);
});

test('a different application or unreachable port is not mistaken for a running guide', async () => {
  for (const fetchImpl of [
    async () => new Response('{}'),
    async () => new Response('old Python server', {status: 404}),
    async () => {throw new DOMException('timed out', 'TimeoutError');},
  ]) {
    const errors = [];
    assert.equal(await handleStartupError({code: 'EADDRINUSE'}, 8000, {
      fetchImpl, log: () => assert.fail('Should not report reuse'), errorLog: message => errors.push(message),
    }), 1);
    assert.match(errors[0], /another application/);
  }
});

test('other startup failures retain a nonzero exit status without probing another process', async () => {
  assert.equal(await handleStartupError({code: 'EACCES'}, 8000, {
    fetchImpl: () => assert.fail('Should not probe'), errorLog: () => {},
  }), 1);
});
