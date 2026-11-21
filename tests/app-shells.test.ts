import assert from 'node:assert/strict';
import {test} from 'node:test';
import {appShellCss} from '../src/shared/app-shells.js';
import {appDesignGuide,appDesignCss,appRuntimeCss} from '../src/shared/app-design.js';
import {KIT_COMPONENTS,KIT_SOURCE,KIT_VERSION,kitCss,kitTokens} from '../src/shared/app-kit.js';
import {GUIDE_VERSION} from '../src/workspace/guide.js';

/* G10, G12, D38 (5.5, 5.6): one general style. read_app_design returns the kit (tokens, components, CSS) under the one
 * guide version; there are no shells, required sections, palettes or pixel rules left in it. */
test('read_app_design returns the kit under the guide version, with no shells or required sections',()=>{
 const design=appDesignGuide();
 assert.equal(design.version,GUIDE_VERSION);assert.equal(design.kit,KIT_VERSION);
 assert.deepEqual(design.tokens,kitTokens);assert.equal(design.css,kitCss());
 assert.deepEqual(design.components.map(c=>c.id),KIT_COMPONENTS.map(c=>c.id));
 const text=JSON.stringify(design);
 for(const old of ['shells','sharedComponents','businessAppDefaults','palettes','typography','Settings: working'])assert.ok(!text.includes(old),old);
 assert.match(design.rules,/never draw a header, message bar, footer or sign-in form/);
});
test('every kit component names a helper that exists in the kit source',()=>{
 for(const c of KIT_COMPONENTS)for(const helper of c.helper.split(' / '))assert.match(KIT_SOURCE,new RegExp('\\b'+helper.replace('kit.','')+'[=:]|,'+helper.replace('kit.','')+'[,}]'),helper);
 assert.match(kitCss(),/@layer trialagents-kit/);assert.match(kitCss(),/@container \(max-width:720px\)/,'responsive by the app’s own width');
 assert.doesNotMatch(kitCss(),/:hover/,'nothing depends on hover');
});
test('v1 apps keep their earlier low-priority defaults',()=>{
 assert.match(appDesignCss,/@layer trialagents-defaults/);assert.ok(appRuntimeCss('<div class="ta-card">').endsWith(appShellCss));assert.ok(!appRuntimeCss('<p>').includes(appShellCss));
});
