import {readFileSync} from 'node:fs';
import {z} from 'zod';
import {fail,type Actor} from '../shared/schema.js';

/** Where a catalog app can be found and added: the TrialAgents website, the ChatGPT MCP endpoint, the Claude MCP endpoint. */
export type TemplateChannel='platform'|'chatgpt'|'claude';
const switches=z.object({platform:z.boolean(),chatgpt:z.boolean(),claude:z.boolean()}).strict();
export const availabilityFile=z.object({note:z.string(),apps:z.record(z.string(),switches)}).strict();
const file=new URL('../../templates/catalog-availability.json',import.meta.url);
const apps=availabilityFile.parse(JSON.parse(readFileSync(file,'utf8'))).apps;

/** The channel a caller reaches the catalog through. Signed-in website sessions are human; MCP tokens are AI principals of one assistant. */
export function templateChannel(a:Actor|undefined):TemplateChannel{
 if(!a||a.origin!=='ai')return 'platform';
 return a.assistant==='claude'?'claude':'chatgpt';
}
/** Publisher switch for one app (all versions). Apps outside the switch file (test fixtures, unreleased drafts) are not switched off. */
export function templateAvailable(templateId:string,channel:TemplateChannel){return apps[templateId]?.[channel]??true;}
export function requireTemplateAvailable(templateId:string,channel:TemplateChannel){if(!templateAvailable(templateId,channel))fail(404,'not_found','Template unavailable');}
