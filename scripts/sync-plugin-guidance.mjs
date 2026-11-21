import {readFile, writeFile, mkdir} from 'node:fs/promises';

const source = new URL('../templates/APP_GUIDE.md', import.meta.url);
// 5.6: the ChatGPT and Claude plugins ship the app guide (under its earlier file name, which their skills link to).
const targets = [
  new URL('../plugin/trialy/skills/trialy-tracker-design/references/DESIGN_BASELINE.md', import.meta.url),
  new URL('../plugin/claude/trialagents-platform/skills/trialagents/references/DESIGN_BASELINE.md', import.meta.url),
];
const content = '<!-- Generated from templates/APP_GUIDE.md; run node scripts/sync-plugin-guidance.mjs. -->\n' + await readFile(source, 'utf8');
for (const target of targets) {
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8') !== content) throw new Error('Plugin app guide is stale: ' + target.pathname);
  } else {
    await mkdir(new URL('.', target), {recursive: true});
    await writeFile(target, content);
  }
}
