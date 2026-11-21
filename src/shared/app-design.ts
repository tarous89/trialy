import {z} from 'zod';
import {PLATFORM_ORIGIN} from './public-url.js';
import {appShellCss} from './app-shells.js';
import {KIT_VERSION,kitTokens,kitCss,KIT_COMPONENTS} from './app-kit.js';
import {GUIDE_VERSION} from '../workspace/guide.js';
/** 5.6: the design version is the guide's version (one version for all authoring guidance). */
export const DESIGN_VERSION='trialagents.guide.'+GUIDE_VERSION;
export const designPalettes={
 forest:{background:'#f7faf8',surface:'#ffffff',text:'#142e29',muted:'#516660',primary:'#087b58',accent:'#087b58',border:'#cadbd2'},
 ocean:{background:'#f5f8fc',surface:'#ffffff',text:'#152c45',muted:'#516578',primary:'#175b94',accent:'#175b94',border:'#cbd8e5'},
 plum:{background:'#faf7fc',surface:'#ffffff',text:'#34253e',muted:'#6b5874',primary:'#795094',accent:'#795094',border:'#ded2e6'},
 midnight:{background:'#0d1920',surface:'#182c35',text:'#eef7f5',muted:'#b1c8c8',primary:'#087f70',accent:'#58d8bc',border:'#48616b'}
} as const;
export const appPreparationFields={
 requestKey:z.string().uuid().optional().describe('Stable UUID for this creation request; identical retries reuse the preview.'),
 replacesPreviewId:z.string().uuid().optional().describe('Existing unsaved preview to revise, keeping its identity.'),
 expectedDigest:z.string().regex(/^[a-f0-9]{64}$/).optional().describe('Current digest of the preview being revised.')
};
export function luminance(hex:string){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
export function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function readable(color:string,background:string,minimum=4.5){
 if(contrast(color,background)>=minimum)return color;
 const end=contrast('#ffffff',background)>contrast('#102022',background)?'#ffffff':'#102022';
 for(let step=1;step<=100;step++){const candidate='#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*(1-step/100)+parseInt(end.slice(i,i+2),16)*step/100).toString(16).padStart(2,'0')).join('');if(contrast(candidate,background)>=minimum)return candidate;}return end;
}
/** Low-priority defaults; authored app CSS retains control of presentation. */
export const appBaseCss=`@layer trialagents-defaults{
 :root{--app-bg:#f7faf8;--app-surface:#fff;--app-ink:#142e29;--app-muted:#516660;--app-accent:#087b58;--app-line:#cadbd2;--app-gap:16px;--app-radius:12px}
 *{box-sizing:border-box}body{margin:0;font:15px/1.5 Inter,Arial,sans-serif;color:var(--app-ink);background:var(--app-bg)}
 main{width:min(1200px,100%);margin:auto;padding:clamp(20px,4vw,40px)}h1{font-size:clamp(26px,3vw,34px);line-height:1.2;letter-spacing:-.025em;margin:0 0 12px}h2{font-size:22px;line-height:1.3}h3{font-size:18px;line-height:1.4}p{margin:0 0 16px}
 button,input,select,textarea{font:inherit;min-height:40px;border:1px solid var(--app-line);border-radius:8px;padding:9px 12px;color:var(--app-ink);background:var(--app-surface)}button{cursor:pointer}button:disabled{cursor:default;opacity:.55}a{color:var(--app-accent)}:focus-visible{outline:2px solid var(--app-accent);outline-offset:3px}label{display:block;margin-bottom:6px}img,svg{max-width:100%}
 table{border-collapse:collapse;width:100%}th,td{padding:12px 16px;text-align:left;border-bottom:1px solid var(--app-line)}th{font-size:13px;font-weight:650}small{font-size:12px}.app-muted{color:var(--app-muted)}.app-stack{display:grid;gap:var(--app-gap)}.app-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px}.app-card{background:var(--app-surface);border:1px solid var(--app-line);border-radius:var(--app-radius);padding:24px}.app-actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.app-primary{background:var(--app-accent);border-color:var(--app-accent);color:#fff}.app-scroll{overflow:auto;max-width:100%}
}`;
export const appDesignCss=appBaseCss+appShellCss;
export const appRuntimeCss=(html:string)=>appBaseCss+(/\bta-[a-z-]+/.test(html)?appShellCss:'');
/**
 * G10, D38 (5.5, 5.6): read_app_design returns the general style: the kit's tokens, its components and its CSS. Design
 * principles are in the app guide (read_app_template_guidance resource guide); how to call the kit is in the reference.
 * v1 apps keep the earlier defaults (appBaseCss, and the ta- classes for code that uses them), listed under legacy.
 */
export function appDesignGuide(){return {version:GUIDE_VERSION,kit:KIT_VERSION,guide:{tool:'read_app_template_guidance',resource:'guide'},reference:{tool:'read_app_template_guidance',resource:'reference'},
 tokens:kitTokens,components:KIT_COMPONENTS,css:kitCss(),
 rules:'Apps open inside TrialAgents below its header and never draw a header, message bar, footer or sign-in form of their own; the platform shows the app name and status, one message at a time and the approval footer. Apps use the TrialAgents account: no app-specific login, signup, password or second identity system.',
 legacy:{note:'Earlier (v1) apps keep these low-priority defaults; new apps use the kit.',css:appDesignCss}};}
