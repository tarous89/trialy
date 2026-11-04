import {readFile, writeFile, mkdir} from 'node:fs/promises';

const source = new URL('../resources/design-baseline.md', import.meta.url);
const target = new URL('../plugin/trialy/skills/trialy-tracker-design/references/DESIGN_BASELINE.md', import.meta.url);
const content = '<!-- Generated from resources/design-baseline.md; run node scripts/sync-plugin-guidance.mjs. -->\n' + await readFile(source, 'utf8');
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== content) throw new Error('Plugin design baseline is stale');
} else {
  await mkdir(new URL('.', target), {recursive: true});
  await writeFile(target, content);
}
