import {execute} from '../foundation/runtime.js';
import {STANDARD_TEMPLATE,standardConfigSchema,standardDefaults} from '../shared/standard-tool.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const trackerRenderer=readFileSync(new URL('../../plugin/trialy/skills/trialy-tracker-design/assets/connected-tracker.js',import.meta.url),'utf8');
// Upgrade only the exact previously shipped renderer. User-customized source is never replaced.
const legacy=new Set(['3c169097c0c78df9b4139c3be96c5baac038481c01c385b8034fa46c1ec4d858','4f4d1df8db15e67d2ccce3356a3e6cf180817de4fb7a0fd92d4d58ada044faf1','1131e78840c7ac21c73d25592a6fb7c69cd18b05c18e1122d49b5a3eb8436a48','202c7f5b80fcf2190d233ce016802e32c4e29060b20d782c6b1d50d39cc2ffed','678e05672fdbd403ab0908143e215a1fee38edfa3b6534104e48e31d33764118','008fabedf2d05a4dcc9a08aa5439f16a67b97708da3e1baf2e642ce648288b59','5fd5c670e876b9f38fe668a17604b988adf6354e9d367e3ef3f3fdb16d9f6f8a','2b8142f271f82285671bb1e759a2e492ca328706c05604aeefa19a62cc7bb47e','2ab4742cb54dd51df5141b1cd42cb0cfe4409b1164edb9c22ee51623bab333c2','9a13a91e3e74d403ddcd7110ea264526ceb88f0a332d49fd5d934c0732381078','88c73396054cfcac323cc9db578ba2058c8316cd166daf73eae018742ece9592']);
const reference=readFileSync(new URL('../../plugin/trialy/skills/trialy-tracker-design/assets/approved-theme2-reference.html',import.meta.url),'utf8');
export const standardTheme=[...reference.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n')+'\n'+readFileSync(new URL('../../plugin/trialy/skills/trialy-tracker-design/assets/connected-tracker.css',import.meta.url),'utf8');
export function standardTracker(source:string){
 try{const value=JSON.parse(source);if(value.template===STANDARD_TEMPLATE&&Object.keys(value).every(k=>['template','config'].includes(k))&&standardConfigSchema.safeParse(value.config).success)return {config:standardDefaults(value.config),theme:standardTheme,source:`const config=${JSON.stringify(standardDefaults(value.config))};\nconst theme=${JSON.stringify(standardTheme)};\n${trackerRenderer}`};}catch{}

 const match=/^const config=([^\n]+);\nconst theme=([^\n]+);\n([\s\S]*)$/.exec(source);
 if(!match||(match[3]!==trackerRenderer&&!legacy.has(createHash('sha256').update(match[3]).digest('hex'))))return null;
 try{const config=standardDefaults(JSON.parse(match[1]));return {config,theme:standardTheme,source:`const config=${JSON.stringify(config)};\nconst theme=${JSON.stringify(standardTheme)};\n${trackerRenderer}`};}catch{return null;}
}


// Compile only the application-owned renderer, never saved/user supplied source.
// The browser uses its synchronous snapshot adapter; the server batches async reads.
const nativeBody=trackerRenderer.replace('const pages=config.tabs.map((t,i)=>{','const pages=await Promise.all(config.tabs.map(async(t,i)=>{').replace('\n});\nconst controls=[];','\n}));\nconst controls=[];').replaceAll("tools.call(","await tools.call(");
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const nativeRenderer=new AsyncFunction('config','theme','input','tools',nativeBody);
export async function renderStandard(config:unknown,theme:string,input:unknown,call:(name:string,value:unknown)=>Promise<unknown>){
 const parsed=standardConfigSchema.safeParse(config);
 if(!parsed.success)return execute(`const config=${JSON.stringify(config)};\nconst theme=${JSON.stringify(theme)};\n${trackerRenderer}`,input,call);
 return nativeRenderer(standardDefaults(parsed.data),theme,structuredClone(input),{call});
}

