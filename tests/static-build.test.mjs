import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const secretSentinel = 'test-only-build-secret-must-never-be-bundled';
execFileSync(process.execPath, ['scripts/build-static.mjs'], {cwd: root, env: {...process.env, BAILIAN_API_KEY: secretSentinel}});

for (const directory of ['public', 'dist']) {
  test(`${directory}: URLs referenced by the browser resolve to bundled files`, () => {
    const app = readFileSync(join(root, directory, 'app.mjs'), 'utf8');
    const html = readFileSync(join(root, directory, 'index.html'), 'utf8');
    const jsonURLs = [...app.matchAll(/loadJSON\('(\/[^']+)'\)/g)].map(match => match[1]);
    // Vercel serves its analytics loader at runtime, outside the static bundle.
    const assetURLs = [...html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)].map(match => match[1])
      .filter(url => url !== '/_vercel/insights/script.js');
    const moduleURLs = [...app.matchAll(/from '\.\/([^']+)'/g)].map(match => `/${match[1]}`);
    const urls = [...jsonURLs, ...assetURLs, ...moduleURLs];
    assert.ok(jsonURLs.length >= 2, 'The app must reference its rule data and source catalog');
    for (const url of urls) {
      assert.ok(existsSync(join(root, directory, url.slice(1))), `Missing browser URL: ${url}`);
    }
  });

  test(`${directory}: rule data and PDF exactly match the maintained research sources`, () => {
    const research = join(root, 'docs/research/hku-recycling');
    for (const name of ['knowledge_base.json', 'sources.json']) {
      const actual = readFileSync(join(root, directory, 'data', name));
      const original = readFileSync(join(research, name));
      JSON.parse(actual.toString('utf8'));
      assert.deepEqual(actual, original, `Stale or modified data: ${name}`);
    }
    assert.deepEqual(
      readFileSync(join(root, directory, 'sources/recycling-101.pdf')),
      readFileSync(join(research, 'sources/hku-recycling-101-official.pdf')),
    );
  });
}

test('static build does not include backend modules or environment credentials', () => {
  for (const path of ['.env', '.env.example', 'api/guide.mjs', 'lib/bailian.mjs', 'scripts/dev-server.mjs']) {
    assert.ok(!existsSync(join(root, 'dist', path)), `${path} must not be public`);
  }
  for (const name of ['index.html', 'app.mjs', 'guide-client.mjs', 'engine.mjs']) {
    const contents = readFileSync(join(root, 'dist', name), 'utf8');
    assert.ok(!contents.includes(secretSentinel));
    assert.ok(!contents.includes('BAILIAN_API_KEY'));
  }
});
