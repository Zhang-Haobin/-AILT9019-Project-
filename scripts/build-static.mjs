import {copyFileSync, mkdirSync, readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist');
const research = join(root, 'docs', 'research', 'hku-recycling');

mkdirSync(output, {recursive: true});
for (const entry of readdirSync(join(root, 'public'), {withFileTypes: true})) {
  if (entry.isFile()) copyFileSync(join(root, 'public', entry.name), join(output, entry.name));
}
mkdirSync(join(output, 'data'), {recursive: true});
for (const name of ['knowledge_base.json', 'sources.json']) {
  const source = join(research, name);
  JSON.parse(readFileSync(source, 'utf8'));
  copyFileSync(source, join(output, 'data', name));
}
mkdirSync(join(output, 'sources'), {recursive: true});
copyFileSync(join(research, 'sources', 'hku-recycling-101-official.pdf'), join(output, 'sources', 'recycling-101.pdf'));
console.log('Built the static app, rule data, source catalog, and official poster in dist/.');
