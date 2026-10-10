import type {Connection} from './database.js';

/** Original storage is transactional with metadata today. A future adapter must
 * preserve commit acknowledgement and integrity, rather than silently swapping URLs. */
export interface OriginalStore {
 put(tx:Connection,versionId:string,bytes:Buffer):Promise<void>;
 get(tx:Connection,versionId:string):Promise<Buffer|undefined>;
}
export class PostgresOriginalStore implements OriginalStore {
 async put(tx:Connection,versionId:string,bytes:Buffer){await tx.query('INSERT INTO document_payloads VALUES($1,$2)',[versionId,bytes]);}
 async get(tx:Connection,versionId:string){const r=(await tx.query('SELECT bytes FROM document_payloads WHERE version_id=$1',[versionId])).rows[0];return r?Buffer.from(r.bytes):undefined;}
}
