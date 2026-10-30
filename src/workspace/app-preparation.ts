import {checksum} from '../domain/evidence.js';
/** Ignore draft table UUID churn, but retain every schema, binding and source change. */
export function preparationFingerprint(operation:any){
 const {preparation,designOrigin,...content}=operation;
 let raw=JSON.stringify(content);
 for(const [index,table] of (operation.setup?.newTables??[]).entries())raw=raw.split(table.id).join('draft-table-'+index);
 return checksum(raw);
}
