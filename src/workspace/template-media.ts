import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {AppTemplates} from './app-templates.js';
import {fail} from '../shared/schema.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
/** screenshot: the full 1440×960 image; card (L3.2): the same image at the size a card shows (720×480); preview: the sample app. */
export type TemplateMediaKind='screenshot'|'card'|'preview';
/** L3.2, L3.4: media of one exact published version, by catalog digest. Catalog files only, never account data; approval and
 * the channel switch are still checked on every call (catalog.identity), only the file work is reused. */
const held=new Map<string,Promise<Buffer|string>>(),HELD_LIMIT=150;
export async function templateMedia(catalog:AppTemplates,id:unknown,version:unknown,kind:TemplateMediaKind):Promise<Buffer|string>{
 const t=await catalog.identity({templateId:id,version}); // approved-only, exact version; never trust a caller path
 const key=`${t.id}@${t.version}#${t.digest}:${kind}`;let value=held.get(key);
 if(!value){if(held.size>=HELD_LIMIT)held.clear();value=readMedia(t,kind);held.set(key,value);value.catch(()=>held.delete(key));}
 return value;
}
/** The catalog digest of an exact version, for media addresses that a browser may keep for good. */
export async function templateMediaDigest(catalog:AppTemplates,id:unknown,version:unknown){return (await catalog.identity({templateId:id,version})).digest;}
async function readMedia(t:{id:string;version:string;digest:string},kind:TemplateMediaKind):Promise<Buffer|string>{
 const manifest=JSON.parse(await readFile(resolve(root,'resources/template-gallery/manifest.json'),'utf8'));
 const media=manifest[`${t.id}@${t.version}`];
 if(!media||media.catalogDigest!==t.digest)fail(404,'not_found','Template preview unavailable');
 const installers=JSON.parse(await readFile(resolve(root,'templates/catalog-installers.json'),'utf8'));
 const schema=installers[`${t.id}@${t.version}`];
 if(!schema)fail(404,'not_found','Template preview unavailable');
 if(kind==='screenshot')return readFile(resolve(root,`resources/template-gallery/${t.id}@${t.version}.jpg`));
 if(kind==='card')return readFile(resolve(root,`resources/template-gallery/cards/${t.id}@${t.version}.jpg`));
 const directory=resolve(root,dirname(schema));
 const names=(await readdir(directory)).filter(n=>n.endsWith('.preview.html')||n==='preview.html');
 if(names.length!==1)fail(404,'not_found','Template preview unavailable');
 const html=await readFile(resolve(directory,names[0]),'utf8');
 if(createHash('sha256').update(html).digest('hex')!==media.previewSha256)fail(404,'not_found','Template preview requires an update');
 // Keep the trusted brand asset local without giving previews network access.
 const logo=await readFile(resolve(root,'public/trialagents-mark-white.png'));
 return html.replaceAll('https://platform.trialagents.com/trialagents-mark-white.png','data:image/png;base64,'+logo.toString('base64'));
}
