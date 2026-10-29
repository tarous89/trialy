import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {fail} from '../shared/schema.js';
export function connectorVault(primary=process.env.CONNECTOR_ENCRYPTION_KEY,previous=process.env.CONNECTOR_PREVIOUS_ENCRYPTION_KEYS??''){
 const values=[primary,...previous.split(',').filter(Boolean)].filter((v):v is string=>!!v);
 const keys=values.map(v=>{const key=Buffer.from(v,'base64');if(key.length!==32||key.toString('base64')!==v)throw new Error('Connector encryption keys must be 32-byte base64 values');return {key,id:createHash('sha256').update(key).digest('hex').slice(0,16)};});
 return {
  seal(value:string,context:string){if(!keys[0])fail(503,'connector_key_missing','Connector credential storage has not been configured');const {key,id}=keys[0],iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(context));return ['v1',id,Buffer.concat([iv,cipher.update(value,'utf8'),cipher.final(),cipher.getAuthTag()]).toString('base64')].join('.');},
  open(value:string,context:string){try{const [version,id,data]=value.split('.'),key=keys.find(k=>k.id===id)?.key;if(version!=='v1'||!key)throw Error();const b=Buffer.from(data,'base64'),cipher=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));cipher.setAAD(Buffer.from(context));cipher.setAuthTag(b.subarray(-16));return Buffer.concat([cipher.update(b.subarray(12,-16)),cipher.final()]).toString('utf8');}catch{fail(503,'connector_key_unavailable','Connector credentials are unavailable; contact the workspace owner');}}
 };
}
