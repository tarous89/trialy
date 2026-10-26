/** Stage navigation off-screen. Only the newest successful result may replace the view. */
export class DisplayTransition {
 private generation=0;
 private visible='';
 private pending='';
 adopt(key:string){this.reset();this.visible=key;}
 reset(){this.generation++;this.visible='';this.pending='';}
 async show<T>(key:string,load:()=>Promise<T>,commit:(value:T)=>void,onError:(error:unknown)=>void){
  if(key===this.pending||key===this.visible)return;
  const generation=++this.generation;this.pending=key;
  try{const value=await load();if(generation!==this.generation)return;commit(value);this.visible=key;}
  catch(error){if(generation===this.generation)onError(error);}
  finally{if(generation===this.generation)this.pending='';}
 }
}
