import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAppDesign,DESIGN_WIDTHS} from '../src/workspace/design-quality.js';
import {kitCss,KIT_SOURCE} from '../src/shared/app-kit.js';
import {execute} from '../src/foundation/runtime.js';
import {V2_EXAMPLE_SOURCE,v2ExampleAnswer} from '../scripts/lib/v2-example.js';

/* 5.7 (G1, G13, D22): the checks match the new rules. A browser is needed; where none can start (some build
 * containers), the test is skipped and the pull request's checks run it. */
async function inspect(t:any,frames:{name:string;html:string;css:string}[]){
 try{return await inspectAppDesign(frames,'current');}catch(e){if((e as any).code==='design_check_unavailable'){t.skip('no browser for the design check here');return null;}throw e;}
}
test('5.7: own header, footer, message bar and sign-in forms block; small text and contrast only warn; three widths',async t=>{
 assert.deepEqual([...DESIGN_WIDTHS],[1440,400,390]);
 const r=await inspect(t,[{name:'chrome',css:'',html:'<div style="position:fixed;top:0;left:0;right:0;height:56px;background:#fff">Deals</div><div role="status" style="position:fixed;right:10px;bottom:80px;width:200px">Saved</div><div style="position:fixed;bottom:0;left:0;right:0;height:50px;background:#fff">Footer</div><form><label>Email<input name="u" autocomplete="username"></label><label>Password<input type="password" name="p"></label><button>Sign in</button></form><p style="font-size:10px;color:#bbb">tiny pale text</p>'}]);
 if(!r)return;
 const codes=new Set(r.issues.map(i=>i.code)),warned=new Set(r.warnings.map(i=>i.code));
 for(const code of ['own_header','own_footer','own_message','sign_in_form'])assert.ok(codes.has(code),code);
 assert.ok(!codes.has('small_text')&&!codes.has('text_contrast'),'D22: size and contrast do not block');
 assert.ok(warned.has('small_text')||warned.has('text_contrast'));
 assert.deepEqual(r.viewports,[1440,400,390]);
});
test('5.7: a v2 app built with the kit passes at every width',async t=>{
 const out:any=await execute(KIT_SOURCE+'\n'+V2_EXAMPLE_SOURCE,{saved:true,writable:true,appRole:'editor',context:null,state:null,event:{kind:'open',action:'',value:null,form:{}}},async(n,i)=>v2ExampleAnswer(n,i));
 const board:any=await execute(KIT_SOURCE+'\n'+V2_EXAMPLE_SOURCE,{saved:true,writable:true,appRole:'editor',context:null,state:out.state,event:{kind:'click',action:'nav:board',value:null,form:{}}},async(n,i)=>v2ExampleAnswer(n,i));
 const r=await inspect(t,[{name:'list',html:out.html,css:kitCss()},{name:'board',html:board.html,css:kitCss()}]);
 if(!r)return;
 assert.deepEqual(r.issues,[],JSON.stringify(r.issues.slice(0,5)));
});
