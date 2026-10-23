import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
// Content-addressed resources prevent a cached host widget from surviving a UI release.
let cached:Promise<{html:string;build:string;uri:string}>|undefined;
export function workspaceResource(){
 return cached??=loadWorkspaceResource();
}
async function loadWorkspaceResource(){
 const html=await readFile(new URL('../../dist/embed.html',import.meta.url),'utf8');
 const build=createHash('sha256').update(html).digest('hex').slice(0,16);
 return {html,build,uri:`ui://trialy/workspace-${build}.html`};
}
export function backgroundMetadata(metadata:any){
 const {ui,...rest}=metadata;
 delete rest['openai/outputTemplate'];
 return {...rest,...(ui?.visibility?{ui:{visibility:ui.visibility}}:{})};
}
