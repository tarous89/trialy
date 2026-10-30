import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {DESIGN_VERSION,appDesignCss} from '../shared/app-design.js';
import {fail} from '../shared/schema.js';

export const bundledAppFont=`@font-face{font-family:Inter;font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${readFileSync(new URL('../../public/fonts/inter-variable.woff2',import.meta.url)).toString('base64')}) format('woff2')}`;
export type DesignFrame={name:string;html:string;css:string};
export type DesignIssue={screen:string;width:number;code:string;element:string;message:string};
let active=false;
/** Inspect inert rendered markup in a fresh, credential-free, offline browser. */
export async function inspectAppDesign(frames:DesignFrame[]){
 if(active)fail(503,'design_check_busy','Another app is being checked. Retry this creation request shortly.');
 if(!frames.length||frames.length>10||frames.some(f=>f.html.length>200000||f.css.length>60000))fail(400,'design_check_limit','App exceeds the bounded design inspection size.');
 active=true;
 let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 try{
  // No service credentials are inherited by the rendering process.
  const env=Object.fromEntries(['PATH','HOME','TMPDIR','PLAYWRIGHT_BROWSERS_PATH','FONTCONFIG_FILE'].filter(k=>process.env[k]).map(k=>[k,process.env[k]!]));
  browser=await chromium.launch({headless:true,timeout:10000,env,args:['--disable-dev-shm-usage','--renderer-process-limit=1']});
  timer=setTimeout(()=>{void browser?.close();},15000);
  const context=await browser.newContext({javaScriptEnabled:false,serviceWorkers:'block',acceptDownloads:false,offline:true});
  await context.route('**/*',route=>route.abort());
  const page=await context.newPage();page.setDefaultTimeout(3000);
  const issues:DesignIssue[]=[];const warnings:DesignIssue[]=[];
  for(const frame of frames)for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   await page.setContent('<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; font-src data:; img-src data:; form-action \'none\'; base-uri \'none\'"><meta name="viewport" content="width=device-width,initial-scale=1"><style id="design"></style></head><body><div id="surface"></div></body></html>');
   await page.evaluate(({html,css})=>{document.getElementById('design')!.textContent=css;const root=document.getElementById('surface')!;root.innerHTML=html;root.querySelectorAll('script,iframe,object,embed,link,meta,base,style').forEach(e=>e.remove());}, {html:frame.html,css:bundledAppFont+appDesignCss+frame.css});
   await page.evaluate(()=>document.fonts.ready);
   // tsx preserves local function names with this helper when serializing callbacks.
   await page.evaluate('globalThis.__name=(fn)=>fn');
   const found=await page.evaluate(()=>{
    type Issue={code:string;element:string;message:string;warning?:boolean};const found:Issue[]=[];
    const all=Array.from(document.querySelectorAll<HTMLElement>('#surface *'));
    if(all.length>4000)return [{code:'element_limit',element:'body',message:'Reduce the page to at most 4000 elements.'}];
    const label=(e:HTMLElement)=>e.tagName.toLowerCase()+(e.id?'#'+e.id:e.classList.length?'.'+Array.from(e.classList).slice(0,2).join('.'):'');
    const add=(code:string,e:HTMLElement,message:string,warning=false)=>{if(found.length<40&&!found.some(x=>x.code===code&&x.element===label(e)&&x.message===message))found.push({code,element:label(e),message,warning});};
    const rgba=(value:string)=>{const v=value.match(/[\d.]+/g)?.map(Number);return v&&v.length>=3?[v[0],v[1],v[2],v[3]??1]:null;};
    const blend=(a:number[],b:number[])=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
    const lum=(v:number[])=>v.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
    const visible=(e:HTMLElement)=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&!e.closest('[hidden],[inert],[aria-hidden="true"]')&&getComputedStyle(e).visibility==='visible';
    const background=(e:HTMLElement)=>{const chain:HTMLElement[]=[];for(let n:HTMLElement|null=e;n;n=n.parentElement)chain.unshift(n);let bg=[255,255,255,1];for(const n of chain){const s=getComputedStyle(n);if(s.backgroundImage!=='none')return null;const c=rgba(s.backgroundColor);if(c)bg=blend(c,bg);}return bg;};
    const controls:HTMLElement[]=[];
    for(const e of all){
     if(!visible(e)||e.matches(':disabled,[aria-disabled="true"]')||e.closest('svg'))continue;
     const s=getComputedStyle(e),b=e.getBoundingClientRect();
     if(e.matches('button,input,select,textarea,a[href]'))controls.push(e);
     const text=Array.from(e.childNodes).some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent?.trim())||e.matches('input[placeholder],textarea[placeholder]');
     if(!text)continue;
     const size=parseFloat(s.fontSize);if(size<12)add('small_text',e,'Use at least 12px for secondary text and 15px for body content.');
     let color=rgba(s.color),bg=background(e);
     if(color&&bg){
      let opacity=1;for(let n:HTMLElement|null=e;n;n=n.parentElement)opacity*=Number(getComputedStyle(n).opacity);
      color[3]*=opacity;color=blend(color,bg);const a=lum(color),z=lum(bg),ratio=(Math.max(a,z)+.05)/(Math.min(a,z)+.05),minimum=size>=24||(size>=18.66&&parseInt(s.fontWeight)>=700)?3:4.5;
      if(ratio+.01<minimum)add('text_contrast',e,`Text contrast ${ratio.toFixed(2)}:1; minimum ${minimum}:1. Use a readable foreground/background pair.`);
     }else if(!bg)add('complex_background',e,'Review contrast over images or gradients visually.',true);
     if(s.textOverflow!=='ellipsis'&&s.overflowY==='hidden'&&e.clientHeight+3<e.scrollHeight)add('clipped_text',e,'Text is clipped vertically; increase height or allow wrapping.');
     if(b.right>innerWidth+2||b.left< -2){let scroll=false;for(let n=e.parentElement;n;n=n.parentElement)if(['auto','scroll'].includes(getComputedStyle(n).overflowX)){scroll=true;break;}if(!scroll)add('viewport_overflow',e,'Content extends beyond the screen without a scroll container.');}
    }
    for(let i=0;i<Math.min(controls.length,100);i++){
     const a=controls[i],x=a.getBoundingClientRect();if(a.scrollHeight>a.clientHeight+4&&getComputedStyle(a).overflowY==='hidden')add('clipped_control',a,'Control content is clipped.');
     for(let j=i+1;j<Math.min(controls.length,100);j++){const b=controls[j];if(a.contains(b)||b.contains(a))continue;const cellA=a.closest('td'),cellB=b.closest('td');if(cellA&&cellB&&cellA.parentElement===cellB.parentElement&&[cellA,cellB].some(cell=>getComputedStyle(cell).position==='sticky'))continue;const y=b.getBoundingClientRect(),w=Math.min(x.right,y.right)-Math.max(x.left,y.left),h=Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top);if(w>2&&h>2&&w*h>Math.min(x.width*x.height,y.width*y.height)*.25)add('overlapping_controls',a,'Controls overlap; add spacing or allow wrapping.');}
    }
    return found;
   });
   for(const issue of found){const {warning,...detail}=issue;(warning?warnings:issues).push({screen:frame.name,width,...detail});}
  }
  return {version:DESIGN_VERSION,status:issues.length?'needs_revision' as const:'passed' as const,viewports:[1440,390],screens:frames.map(f=>f.name),issues:issues.slice(0,30),warnings:warnings.slice(0,10)};
 }catch(e){if((e as any).code==='design_check_busy')throw e;fail(503,'design_check_unavailable','The design check could not finish. Retry the same creation request; no app was saved.');}
 finally{if(timer)clearTimeout(timer);await browser?.close().catch(()=>{});active=false;}
}
