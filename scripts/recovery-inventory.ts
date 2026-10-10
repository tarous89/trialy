import {Postgres} from '../src/db/database.js';
import {createHash} from 'node:crypto';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
const db=new Postgres(process.env.DATABASE_URL);
try{
 const inventory=await db.transaction(async tx=>{
  await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const counts:Record<string,number>={};for(const table of ['workspaces','entity_types','records','document_versions','document_payloads','revisions','audit_events','approvals','acknowledgements','commit_receipts','jobs','document_access','folder_access','form_submissions','submission_acceptances','template_installations','account_security_events','workspace_invitations','submission_files','submission_file_acceptances','record_review_requests','record_review_decisions','inbox_reminders','inbox_read_receipts'])counts[table]=Number((await tx.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);
  const originals=[];let after='00000000-0000-0000-0000-000000000000';
  while(true){const rows=(await tx.query('SELECT d.id,d.checksum,d.byte_size,p.bytes FROM document_versions d LEFT JOIN document_payloads p ON p.version_id=d.id WHERE d.id>$1 ORDER BY d.id LIMIT 10',[after])).rows;if(!rows.length)break;for(const d of rows){if(!d.bytes)throw Error('Missing original: '+d.id);const bytes=Buffer.from(d.bytes);if(bytes.length!==d.byte_size||createHash('sha256').update(bytes).digest('hex')!==d.checksum)throw Error('Original mismatch: '+d.id);originals.push({id:d.id,checksum:d.checksum,bytes:d.byte_size});after=d.id;}}
  return {format:'trialy-recovery-inventory',createdAt:new Date().toISOString(),counts,originals};
 });console.log(JSON.stringify(inventory,null,2));
}finally{await db.close();}
