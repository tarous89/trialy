import React,{useState} from 'react';
import {AppPlatform} from './AppPlatform.js';
import {Button} from './ui/Controls.js';
import './ui/data-access.css';
type Call=(name:string,args:any)=>Promise<any>;
const MAX=25*1024*1024;

/**
 * Opened from a `data-trialy-document="upload …"` button inside a saved app. The platform upload: choose a file, review it,
 * then save the original with an explicit confirmation. App code never sees the file bytes; it is told the new version ID.
 * On the website the user decides whether AI may read the document; inside ChatGPT or Claude the original is AI-readable.
 */
export function DocumentUploadDialog({call,onClose,onSaved}:{call:Call;onClose:()=>void;onSaved:(versionId:string,filename:string)=>void}){
 const platform=React.useContext(AppPlatform),assistantHost=!!platform.useTemplate;
 const [file,setFile]=useState<File|null>(null),[ai,setAi]=useState(true),[preview,setPreview]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function review(){if(!file)return;setBusy(true);setError('');try{
  if(file.size>MAX)throw new Error('Please choose a file under 25 MiB');
  const base64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]??'');r.onerror=()=>reject(new Error('File could not be read'));r.readAsDataURL(file);});
  setPreview(await call('preview_document_upload',{filename:file.name,mime:file.type||'application/octet-stream',base64,...(assistantHost?{}:{ai})}));
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function save(){setBusy(true);setError('');try{
  const saved=await call('commit_change',{previewId:preview.id,digest:preview.digest,confirmed:true});
  const object=(saved?.objects??[]).find((o:any)=>o.kind==='document');if(!object?.versionId)throw new Error('The original was saved, but its version could not be read. Find it in Documents.');
  onSaved(object.versionId,file!.name);
 }catch(e){setError((e as Error).message);setBusy(false);}}
 async function cancel(){if(preview)try{await call('discard_preview',{previewId:preview.id});}catch{/* expires on its own */}onClose();}
 return <div className="ty-content-overlay"><section className="ty-confirm-dialog ty-data-access" role="dialog" aria-modal="true" aria-labelledby="document-upload-title">
  {!preview?<>
   <h2 id="document-upload-title">Add a signed original</h2>
   <p>The file is stored in TrialAgents Documents with its own permissions. You review it before it is saved.</p>
   <label className="ty-field">Original file<input type="file" aria-label="Original file" disabled={busy} onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
   {assistantHost?<p className="ty-muted">This original will be readable by your connected assistants, so they can propose its key terms.</p>:<label className="ty-check"><input type="checkbox" checked={ai} disabled={busy} onChange={e=>setAi(e.target.checked)}/> Allow AI to read this document (needed for assistant extraction)</label>}
   {error&&<p role="alert">{error}</p>}
   <div className="ty-actions"><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy||!file} onClick={()=>void review()}>{busy?'Preparing…':'Review'}</Button></div>
  </>:<>
   <h2 id="document-upload-title">Save this original?</h2>
   <p><strong>{file?.name}</strong> · {Math.max(1,Math.round((file?.size??0)/1024))} KB · {preview.summary?.ai===false?'AI cannot read it':'AI-readable'}</p>
   <p className="ty-muted">Saving stores the exact file. Text extraction runs afterwards; nothing in the app is marked verified.</p>
   {error&&<p role="alert">{error}</p>}
   <div className="ty-actions"><Button disabled={busy} onClick={()=>void cancel()}>Cancel</Button><Button variant="primary" disabled={busy} onClick={()=>void save()}>{busy?'Saving…':'Save original'}</Button></div>
  </>}
 </section></div>;
}
