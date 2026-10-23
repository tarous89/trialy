import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const trackerRenderer=readFileSync(new URL('../../plugin/trialy/skills/trialy-tracker-design/assets/connected-tracker.js',import.meta.url),'utf8');
// Upgrade only the exact previously shipped renderer. User-customized source is never replaced.
const legacy=new Set(['88c73396054cfcac323cc9db578ba2058c8316cd166daf73eae018742ece9592']);
export function standardTracker(source:string){
 const match=/^const config=([^\n]+);\nconst theme=([^\n]+);\n([\s\S]*)$/.exec(source);
 if(!match||(match[3]!==trackerRenderer&&!legacy.has(createHash('sha256').update(match[3]).digest('hex'))))return null;
 try{return {config:JSON.parse(match[1]),theme:JSON.parse(match[2]),source:`const config=${match[1]};\nconst theme=${match[2]};\n${trackerRenderer}`};}catch{return null;}
}
