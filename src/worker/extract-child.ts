import { extract } from './processor.js';
process.once('message',async(message:{base64:string;mime:string})=>{
 try{process.send?.({ok:true,result:await extract(Buffer.from(message.base64,'base64'),message.mime)});}
 catch(e){process.send?.({ok:false,diagnostic:e instanceof Error?e.message:'processing_failed',permanent:!!(e as any)?.permanent});}
 finally{process.disconnect?.();}
});
