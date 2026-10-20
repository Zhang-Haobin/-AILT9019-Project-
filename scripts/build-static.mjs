import {copyFileSync, mkdirSync, readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist');
const research = join(root, 'docs', 'research', 'hku-recycling');
const publicDirectory = join(root, 'public');

mkdirSync(output, {recursive: true});
for (const entry of readdirSync(join(root, 'public'), {withFileTypes: true})) {
  if (entry.isFile()) copyFileSync(join(root, 'public', entry.name), join(output, entry.name));
}
mkdirSync(join(output, 'data'), {recursive: true});
mkdirSync(join(publicDirectory, 'data'), {recursive: true});
for (const name of ['knowledge_base.json', 'sources.json']) {
  const source = join(research, name);
  JSON.parse(readFileSync(source, 'utf8'));
  copyFileSync(source, join(output, 'data', name));
  copyFileSync(source, join(publicDirectory, 'data', name));
}
mkdirSync(join(output, 'sources'), {recursive: true});
mkdirSync(join(publicDirectory, 'sources'), {recursive: true});
copyFileSync(join(research, 'sources', 'hku-recycling-101-official.pdf'), join(output, 'sources', 'recycling-101.pdf'));
copyFileSync(join(research, 'sources', 'hku-recycling-101-official.pdf'), join(publicDirectory, 'sources', 'recycling-101.pdf'));
console.log('Built dist/ and refreshed the public/ compatibility copies of the rule data and official poster.');
