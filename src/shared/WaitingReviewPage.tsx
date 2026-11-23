import React,{useContext,useEffect,useState} from 'react';
import {AppPlatform} from './AppPlatform.js';
import {Button} from './ui/Controls.js';
import {pendingChanged} from './PendingChanges.js';
import {ChangeSummary} from './ChangeSummary.js';

type Call=(name:string,args:any)=>Promise<any>;
const ASSISTANT:Record<string,string>={chatgpt:'ChatGPT',claude:'Claude'};
/**
 * Approval screen (docs/TOOL_PERMISSIONS.md): one review an assistant prepared, with its exact details, Approve and
 * Decline. Used for workspace changes, code-lab reviews and code-run changes; automation reviews keep their own page.
 * Approve sends the digest read here, so a review that changed since it was shown is refused, never saved blind.
 * Inside an assistant, a change that only a signed-in person may make (an email sent outside the workspace) is approved
 * on the website instead: websiteUrl opens it there.
 */
export function WaitingReviewPage({call,source,reviewId,host,websiteUrl,onDone}:{call:Call;source:string;reviewId:string;host:'web'|'assistant';websiteUrl?:string;onDone?:()=>void}){
 const [review,setReview]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState<''|'approved'|'declined'>(''),[saved,setSaved]=useState<any>(null);
 useEffect(()=>{let active=true;setReview(null);setError('');call('read_waiting_review',{source,reviewId}).then(r=>{if(active)setReview(r);}).catch(e=>{if(active)setError((e as Error).message);});return()=>{active=false;};},[call,source,reviewId]);
 async function act(kind:'approved'|'declined'){
  setBusy(true);setError('');
  try{
   if(kind==='approved')setSaved(await call('approve_waiting_review',{source,reviewId,digest:review.digest,confirmed:true}));
   else await call('decline_waiting_review',{source,reviewId});
   setDone(kind);pendingChanged();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const elsewhere=review?.approveWhere==='website'&&host==='assistant',platform=useContext(AppPlatform);
 // Inside an assistant a plain link may not open from the frame: the host opens it.
 const openWebsite=()=>{if(!websiteUrl)return;if(platform?.openLink)platform.openLink(websiteUrl);else window.open(websiteUrl,'_blank','noopener,noreferrer');};
 return <section className="ty-page ty-waiting-review" aria-label="Review">
  <div className="ty-page-heading"><h1>{review?.title??'Review'}</h1></div>
  {error&&<p role="alert">{error}</p>}
  {done?<div role="status"><h2>{done==='approved'?'Approved and saved':'Declined'}</h2><p>{done==='approved'?'The change is saved. Your assistant can see the result.':'Nothing was saved. Your assistant can prepare it again if you ask.'}</p>{done==='approved'&&saved&&typeof saved==='object'&&<><h3>What was saved</h3><ChangeSummary value={saved}/></>}{onDone&&<Button onClick={onDone}>Done</Button>}</div>
  :!review?(!error&&<div aria-busy="true" aria-label="Loading review"/>)
  :<>
   <p>{review.assistant?`Prepared by ${ASSISTANT[review.assistant]??review.assistant}. `:''}Nothing is saved until you approve it.{review.expiresAt?` This review expires ${new Date(review.expiresAt).toLocaleString()}.`:''}</p>
   <h2>What changes</h2>
   <ChangeSummary value={review.details}/>
   {elsewhere&&<p>Only you can send this, signed in to TrialAgents. Approve it on the website.</p>}
   <div className="ty-actions">
    <Button disabled={busy} onClick={()=>void act('declined')}>Decline</Button>
    {elsewhere?(websiteUrl&&<Button variant="primary" onClick={openWebsite}>Approve on the website</Button>)
     :<Button variant="primary" disabled={busy} onClick={()=>void act('approved')}>{busy?'Saving…':'Approve'}</Button>}
   </div>
  </>}
 </section>;
}
