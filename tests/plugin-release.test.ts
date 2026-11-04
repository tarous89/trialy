import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import express from 'express';
import request from 'supertest';
import {readTrackerDesign} from '../src/server/tracker-design.js';
import {readWorkspaceGuide, guideSections} from '../src/server/workspace-guidance.js';
import {addMcp} from '../src/server/mcp.js';
import {Service} from '../src/domain/service.js';
import type {Database} from '../src/db/database.js';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('server asset relocation preserves every approved renderer and visual reference byte', async () => {
  const expected = JSON.parse(await read('resources/tracker-design/preserved-assets.json'));
  for (const [path, digest] of Object.entries(expected)) {
    const bytes = await readFile(new URL('resources/tracker-design/assets/' + path, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), digest, path);
  }
});

test('every legacy design resource remains available and complete after package decoupling', async () => {
  for (const resource of (await readTrackerDesign({})).resources) {
    let offset = 0, content = '', hash = '';
    for (;;) {
      const page = await readTrackerDesign({resource, offset});
      hash ||= page.sha256;
      assert.equal(page.sha256, hash);
      content += page.text;
      if (page.nextOffset === null) { assert.equal(content.length, page.totalCharacters); break; }
      assert.ok(page.nextOffset > offset); offset = page.nextOffset;
    }
    assert.equal(createHash('sha256').update(content).digest('hex'), hash, resource);
  }
});

test('focused workflow guides cover every canonical section with complete pagination', async () => {
  const full = await read('resources/workspace/WORKSPACE.md');
  const headings = [...full.matchAll(/^## (.+)$/gm)].map(m => m[1]);
  const routed = Object.values(guideSections).flat();
  assert.deepEqual([...routed].sort(), headings.sort());
  assert.equal(new Set(routed).size, routed.length);
  for (const [topic, sections] of Object.entries(guideSections)) {
    let offset = 0, text = '', hash = '';
    for (;;) {
      const page = await readWorkspaceGuide({topic, offset}); text += page.text; hash ||= page.sha256;
      assert.equal(page.sha256, hash);
      if (page.nextOffset === null) break;
      assert.ok(page.nextOffset > offset); offset = page.nextOffset;
    }
    for (const heading of sections) assert.ok(text.includes('## ' + heading), heading);
    assert.equal(createHash('sha256').update(text).digest('hex'), hash);
  }
  await assert.rejects(readWorkspaceGuide({topic: '../../.env'}));
  await assert.rejects(readWorkspaceGuide({topic: 'apps', offset: 99999999}));
});

test('portable package retains identity, prompts, branding and two focused skills without templates', async () => {
  const plugin = JSON.parse(await read('plugin/trialy/plugin.json'));
  const legacy = JSON.parse(await read('plugin/trialy/.codex-plugin/plugin.json'));
  assert.equal(plugin.name, 'trialy'); assert.equal(plugin.version, legacy.version);
  assert.deepEqual(plugin.extensions['com.openai'].interface, legacy.interface);
  assert.equal(legacy.interface.defaultPrompt, 'Open my TrialAgents workspace.');
  const mcp = JSON.parse(await read('plugin/trialy/mcp.json')).mcpServers.trialy;
  const oldMcp = JSON.parse(await read('plugin/trialy/.mcp.json')).mcpServers.trialy;
  assert.equal(mcp.url, oldMcp.url); assert.equal(mcp.type, oldMcp.type);
  assert.deepEqual(mcp.extensions['com.openai'].auth, {type: 'mixed', client: {mode: 'dcr'}, baseScopes: ['trialy'], defaultScopes: ['trialy']});
  const skills = await readdir(new URL('plugin/trialy/skills/', root));
  assert.deepEqual(skills.sort(), ['trialy-tracker-design', 'trialy-workspace']);
  for (const skill of skills) {
    const text = await read('plugin/trialy/skills/' + skill + '/SKILL.md');
    assert.ok(text.length < 6500); assert.match(text, /^---\nname: .+\ndescription: .+\n---/);
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (!match[1].startsWith('https:')) await read('plugin/trialy/skills/' + skill + '/' + match[1]);
    }
    assert.ok(!(await readdir(new URL('plugin/trialy/skills/' + skill + '/', root))).includes('assets'));
  }
  const baseline = await read('resources/design-baseline.md');
  assert.equal((await read('plugin/trialy/skills/trialy-tracker-design/references/DESIGN_BASELINE.md')).split('\n').slice(1).join('\n'), baseline);
});

test('pure MCP advertises guidance and complete annotations without account reads or writes', async t => {
  const previous = process.env.SIMPLE_APPS_ENABLED; process.env.SIMPLE_APPS_ENABLED = 'true';
  t.after(() => { if (previous === undefined) delete process.env.SIMPLE_APPS_ENABLED; else process.env.SIMPLE_APPS_ENABLED = previous; });
  let calls = 0;
  const db = {query: async () => { calls++; throw new Error('Unexpected account access'); }} as unknown as Database;
  const app = express(); app.use(express.json());
  addMcp(app, new Service(db), (_req, _res, next) => next());
  const rpc = (method: string, params: any = {}) => request(app).post('/mcp').set('Accept', 'application/json, text/event-stream').send({jsonrpc: '2.0', id: 1, method, params});
  const init = await rpc('initialize', {protocolVersion: '2025-03-26', capabilities: {}, clientInfo: {name: 'fresh-mcp-test', version: '1'}});
  assert.equal(init.status, 200); assert.match(init.body.result.instructions, /read_workspace_guide/);
  assert.match(init.body.result.instructions, /finalize_app_preview/);
  const tools = (await rpc('tools/list')).body.result.tools;
  const previousNames: string[] = JSON.parse(await read('tests/fixtures/mcp-operation-names.json'));
  for (const name of previousNames) assert.ok(tools.some((tool: any) => tool.name === name), 'Lost existing operation: ' + name);
  for (const tool of tools) for (const key of ['readOnlyHint', 'destructiveHint', 'openWorldHint']) assert.equal(typeof tool.annotations?.[key], 'boolean', tool.name + '.' + key);
  for (const name of ['prepare_app', 'prepare_tracker', 'prepare_app_monitoring', 'commit_change', 'confirm_workspace_change', 'read_workspace_guide']) assert.ok(tools.some((t: any) => t.name === name), name);
  const guide = await rpc('tools/call', {name: 'read_workspace_guide', arguments: {topic: 'apps'}});
  assert.equal(guide.body.result.isError, undefined); assert.match(guide.body.result.structuredContent.result.text, /finalize_app_preview/);
  const denied = await rpc('tools/call', {name: 'list_workspaces', arguments: {}});
  assert.equal(denied.body.result.isError, true); assert.ok(denied.body.result._meta['mcp/www_authenticate']);
  assert.equal(calls, 0);
});
