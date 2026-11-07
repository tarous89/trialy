import assert from 'node:assert/strict';
import {test} from 'node:test';
import {APP_SHELL_LIBRARY_VERSION,appShells,sharedComponents,shellSelection,appShellCss} from '../src/shared/app-shells.js';
import {appDesignGuide,appDesignCss} from '../src/shared/app-design.js';

test('approved shells are optional distinct design recipes and not app templates',()=>{
 assert.equal(APP_SHELL_LIBRARY_VERSION,'1.0.0');
 assert.deepEqual(appShells.map(shell=>shell.id),['analytics','portfolio','records','decision']);
 assert.equal(new Set(appShells.map(shell=>shell.id)).size,4);
 for(const shell of appShells){
  assert.ok(shell.whenToUse.length>20);
  assert.ok(shell.whenNotToUse.length>20);
  assert.ok(shell.recommendedSections.includes('Settings'));
  assert.match(shell.example,/ta-shell/);
  assert.ok(shell.components.length>=4);
 }
 assert.match(shellSelection.precedence,/template/i);
 assert.match(shellSelection.mandatory,/permissions/i);
});
test('the component vocabulary includes structured settings and interactive charts',()=>{
 const ids=sharedComponents.map(component=>component.id);
 assert.equal(new Set(ids).size,ids.length);
 for(const required of ['chart-card','settings-page','filter-toolbar','data-table','record-details','status-pill','evidence-checklist']){
  assert.ok(ids.includes(required),required);
 }
 assert.match(sharedComponents.find(c=>c.id==='settings-page')?.usage??'',/full structured/i);
 assert.match(sharedComponents.find(c=>c.id==='chart-card')?.usage??'',/keyboard/i);
});
test('the design kit advertises four shells and responsive opt-in spacing',()=>{
 const design=appDesignGuide();
 assert.equal(design.version,'trialagents.design.v2');
 assert.equal(design.shellLibraryVersion,'1.0.0');
 assert.equal(design.shells.length,4);
 assert.equal(design.sharedComponents.length,sharedComponents.length);
 assert.match(design.css,/\.ta-card-grid/);
 assert.match(design.css,/\.ta-settings/);
 assert.match(design.css,/@media\(max-width:620px\)/);
 assert.match(appShellCss,/gap:var\(--ta-gap\)/);
 assert.match(appDesignCss,/@layer trialagents-defaults/);
});
