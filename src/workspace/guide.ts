import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
/**
 * G12, D37, architecture H (5.6): one authoring guide and one technical reference, with one version and one checksum.
 * They replace the separate versions of the template guidance, the workspace guide, the tracker design resources, the
 * design kit, the shell library and the guardrails. Old resource names stay as aliases, so older plugins keep working.
 */
export {GUIDE_VERSION} from '../shared/guide-version.js';
const read=(name:string)=>readFileSync(new URL('../../templates/'+name,import.meta.url),'utf8');
let files:{guide:string;reference:string;example:string;checksum:string}|null=null;
export function guideFiles(){
 if(!files){const guide=read('APP_GUIDE.md'),reference=read('APP_REFERENCE.md'),example=read('APP_EXAMPLE.md');files={guide,reference,example,checksum:createHash('sha256').update(guide).update('\0').update(reference).update('\0').update(example).digest('hex')};}
 return files;
}
/** The checksum of the guide and the reference together: one value tells a client whether anything changed. */
export const guideChecksum=()=>guideFiles().checksum;
