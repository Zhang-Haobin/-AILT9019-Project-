import {createServer} from 'node:http';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
const {default: guide} = await import('../api/guide.mjs');
export const LOCAL_SERVICE_ID = 'hku-recycling-helper:bailian:v1';
const research = 'docs/research/hku-recycling/';
const routes = new Map([
  ['/', ['public/index.html', 'text/html']],
  ['/index.html', ['public/index.html', 'text/html']],
  ...['app.mjs', 'guide-client.mjs', 'engine.mjs'].map(name => [`/${name}`, [`public/${name}`, 'text/javascript']]),
  ['/styles.css', ['public/styles.css', 'text/css']],
  ['/data/knowledge_base.json', [`${research}knowledge_base.json`, 'application/json']],
  ['/data/sources.json', [`${research}sources.json`, 'application/json']],
  ['/sources/recycling-101.pdf', [`${research}sources/hku-recycling-101-official.pdf`, 'application/pdf']],
]);

export function createAppServer(handler = guide) {
  return createServer(async (request, response) => {
    let path;
    try { path = new URL(request.url, 'http://localhost').pathname; }
    catch { response.writeHead(400).end('Invalid request'); return; }
    if (path === '/api/guide') return handler(request, response);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (path === '/api/health' && ['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Content-Type', 'application/json');
      response.end(request.method === 'HEAD' ? undefined : JSON.stringify({service: LOCAL_SERVICE_ID}));
      return;
    }
    const asset = routes.get(path);
    if (!asset || !['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(404).end('Not found');
      return;
    }
    try {
      const bytes = readFileSync(resolve(root, asset[0]));
      response.setHeader('Content-Type', asset[1]);
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch {
      response.writeHead(500).end('Asset unavailable');
    }
  });
}

export async function handleStartupError(error, port, {fetchImpl = fetch, log = console.log, errorLog = console.error} = {}) {
  if (error.code === 'EADDRINUSE') {
    try {
      const response = await fetchImpl(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(1500), redirect: 'error',
      });
      if (response.ok && (await response.json()).service === LOCAL_SERVICE_ID) {
        log(`Already running: http://127.0.0.1:${port}`);
        log('Open this address in your browser. The existing server will keep running.');
        return 0;
      }
    } catch {
      // A listener on this port is not necessarily this app; never reuse blindly.
    }
    errorLog(`Port ${port} is used by another application. Stop that application or set a different PORT in .env.`);
    return 1;
  }
  errorLog(`Cannot start local server (${error.code}). Check PORT and try again.`);
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createAppServer();
  const port = Number(process.env.PORT || 8000);
  server.on('error', async error => {process.exitCode = await handleStartupError(error, port);});
  server.listen(port, '127.0.0.1', () => {
    console.log(`Local: http://127.0.0.1:${server.address().port}`);
    console.log(`AI interpretation: ${process.env.BAILIAN_API_KEY?.trim() ? 'configured (not yet verified)' : 'not configured; English rule fallback available'}`);
  });
}
