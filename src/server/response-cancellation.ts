import type {Response} from 'express';
/** Request.close also fires for a normally consumed request body. Only an
 * unfinished response closing means this HTTP caller has gone away.
 */
export async function withResponseCancellation<T>(res:Response,work:(signal:AbortSignal)=>Promise<T>):Promise<T|undefined>{
 const controller=new AbortController(),cancel=()=>{if(!res.writableFinished)controller.abort();};
 res.on('close',cancel);if(res.destroyed)cancel();
 try{return await work(controller.signal);}catch(error){if(!controller.signal.aborted)throw error;}
 finally{res.off('close',cancel);}
}
