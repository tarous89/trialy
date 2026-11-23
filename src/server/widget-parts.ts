import {readFile} from 'node:fs/promises';
import type {Express} from 'express';
/**
 * L4.5 (docs/scopes/LOADING_SPEED_2026-11-22.md, section 6 item 9): the plugin widget's second part, the pages its first
 * screen never shows. scripts/build-embed.ts writes it to dist/widget-parts/<file> and names it in dist/widget-parts.json.
 * Public code, like the widget itself: no account data, no sign-in. The address names the exact file, so it is kept for good.
 */
type Part={file:string;integrity:string;text:string};
let current:Promise<Part|null>|undefined;
export function widgetPart(root=new URL('../../dist/',import.meta.url)){
 return current??=(async()=>{
  try{const manifest=JSON.parse(await readFile(new URL('widget-parts.json',root),'utf8'));if(!manifest.file)return null;
   return {file:manifest.file,integrity:manifest.integrity,text:await readFile(new URL('widget-parts/'+manifest.file,root),'utf8')};}
  catch{return null;}
 })();
}
/** Only for tests that rebuild the widget while a server is running. */
export function forgetWidgetPart(){current=undefined;}
export const WIDGET_PART_FILE=/^[a-f0-9]{20}\.js$/;
export function addWidgetPartRoute(app:Express){
 app.get('/widget-parts/:file',async(req,res)=>{
  const part=WIDGET_PART_FILE.test(req.params.file)?await widgetPart():null;
  if(!part||part.file!==req.params.file)return void res.status(404).set('Cache-Control','no-store').end();
  // CORS so the widget can check the file's integrity (script integrity needs a CORS request); it is public code.
  res.set('Cache-Control','public, max-age=31536000, immutable').set('Cross-Origin-Resource-Policy','cross-origin').set('Access-Control-Allow-Origin','*')
   .type('application/javascript; charset=utf-8').send(part.text);
 });
}
