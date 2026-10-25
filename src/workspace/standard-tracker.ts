import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const trackerRenderer=readFileSync(new URL('../../plugin/trialy/skills/trialy-tracker-design/assets/connected-tracker.js',import.meta.url),'utf8');
// Upgrade only the exact previously shipped renderer. User-customized source is never replaced.
const legacy=new Set(['008fabedf2d05a4dcc9a08aa5439f16a67b97708da3e1baf2e642ce648288b59','5fd5c670e876b9f38fe668a17604b988adf6354e9d367e3ef3f3fdb16d9f6f8a','2b8142f271f82285671bb1e759a2e492ca328706c05604aeefa19a62cc7bb47e','2ab4742cb54dd51df5141b1cd42cb0cfe4409b1164edb9c22ee51623bab333c2','9a13a91e3e74d403ddcd7110ea264526ceb88f0a332d49fd5d934c0732381078','88c73396054cfcac323cc9db578ba2058c8316cd166daf73eae018742ece9592']);
export function standardTracker(source:string){
 const match=/^const config=([^\n]+);\nconst theme=([^\n]+);\n([\s\S]*)$/.exec(source);
 if(!match||(match[3]!==trackerRenderer&&!legacy.has(createHash('sha256').update(match[3]).digest('hex'))))return null;
 try{return {config:JSON.parse(match[1]),theme:JSON.parse(match[2]),source:`const config=${match[1]};\nconst theme=${match[2]};\n${trackerRenderer}`};}catch{return null;}
}

