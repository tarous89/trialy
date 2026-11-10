import {readFile, writeFile, mkdir} from 'node:fs/promises';

const source = new URL('../resources/design-baseline.md', import.meta.url);
// The ChatGPT and Claude plugins ship the same generated design baseline.
const targets = [
  new URL('../plugin/trialy/skills/trialy-tracker-design/references/DESIGN_BASELINE.md', import.meta.url),
  new URL('../plugin/claude/trialagents-platform/skills/trialagents/references/DESIGN_BASELINE.md', import.meta.url),
];
const content = '<!-- Generated from resources/design-baseline.md; run node scripts/sync-plugin-guidance.mjs. -->\n' + await readFile(source, 'utf8');
for (const target of targets) {
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8') !== content) throw new Error('Plugin design baseline is stale: ' + target.pathname);
  } else {
    await mkdir(new URL('.', target), {recursive: true});
    await writeFile(target, content);
  }
}
