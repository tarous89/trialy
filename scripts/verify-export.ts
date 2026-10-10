import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const path=process.argv[2];if(!path)throw Error('Usage: npm run export:verify -- workspace.json');
const data=JSON.parse(await readFile(path,'utf8'));
if(data.format!=='trialy-export'||data.formatVersion!==1)throw Error('Unknown export format');
for(const d of data.documents){const bytes=Buffer.from(d.base64,'base64');if(bytes.length!==d.byte_size||createHash('sha256').update(bytes).digest('hex')!==d.checksum)throw Error('Original integrity mismatch: '+d.id);}
for(const r of data.records){if(!data.entity_types.some((t:any)=>t.id===r.type_id))throw Error('Missing record type: '+r.id);const version=data.revisions.find((v:any)=>v.object_id===r.id&&v.object_kind==='record'&&v.version===r.version);if(!version||JSON.stringify(version.snapshot.data)!==JSON.stringify(r.data))throw Error('Current revision mismatch: '+r.id);}
console.log(JSON.stringify({status:'verified',workspace:data.workspace.id,originals:data.documents.length,records:data.records.length,revisions:data.revisions.length,auditEvents:data.audit_events.length}));
