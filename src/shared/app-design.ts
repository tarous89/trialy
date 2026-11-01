import {z} from 'zod';
import {PLATFORM_ORIGIN} from './public-url.js';
export const DESIGN_VERSION='trialagents.design.v1';
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
export const appDesignCss=`@layer trialagents-defaults{
 :root{--app-bg:#f7faf8;--app-surface:#fff;--app-ink:#142e29;--app-muted:#516660;--app-accent:#087b58;--app-line:#cadbd2;--app-gap:16px;--app-radius:12px}
 *{box-sizing:border-box}body{margin:0;font:15px/1.5 Inter,Arial,sans-serif;color:var(--app-ink);background:var(--app-bg)}
 main{width:min(1200px,100%);margin:auto;padding:clamp(20px,4vw,40px)}h1{font-size:clamp(26px,3vw,34px);line-height:1.2;letter-spacing:-.025em;margin:0 0 12px}h2{font-size:22px;line-height:1.3}h3{font-size:18px;line-height:1.4}p{margin:0 0 16px}
 button,input,select,textarea{font:inherit;min-height:40px;border:1px solid var(--app-line);border-radius:8px;padding:9px 12px;color:var(--app-ink);background:var(--app-surface)}button{cursor:pointer}button:disabled{cursor:default;opacity:.55}a{color:var(--app-accent)}:focus-visible{outline:2px solid var(--app-accent);outline-offset:3px}label{display:block;margin-bottom:6px}img,svg{max-width:100%}
 table{border-collapse:collapse;width:100%}th,td{padding:12px 16px;text-align:left;border-bottom:1px solid var(--app-line)}th{font-size:13px;font-weight:650}small{font-size:12px}.app-muted{color:var(--app-muted)}.app-stack{display:grid;gap:var(--app-gap)}.app-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px}.app-card{background:var(--app-surface);border:1px solid var(--app-line);border-radius:var(--app-radius);padding:24px}.app-actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.app-primary{background:var(--app-accent);border-color:var(--app-accent);color:#fff}.app-scroll{overflow:auto;max-width:100%}
}`;
export function appDesignGuide(){return {version:DESIGN_VERSION,palettes:designPalettes,css:appDesignCss,typography:{font:'Inter (bundled), Arial, sans-serif',body:15,lineHeight:1.5,small:12,heading:[26,34]},spacing:[4,8,12,16,24,32,40],
 authoringGuardrails:{version:'1.0.0',account:'Apps are internal tools accessed through the existing TrialAgents account. Do not add app-specific login, signup, logout, password reset, account management, credential storage, OAuth or a second identity/seat system. Keep platform authentication and app/data permissions enforced. Explicit sharing uses existing reviewed platform controls.',branding:{optionalInApp:true,link:PLATFORM_ORIGIN,blackIcon:PLATFORM_ORIGIN+'/trialagents-mark-black.png',whiteIcon:PLATFORM_ORIGIN+'/trialagents-mark-white.png',instructions:'Every TrialAgents logo or wordmark must include the real official icon and link the entire logo to the platform URL. Use black on light backgrounds or white on dark backgrounds; preserve colors and aspect ratio. No text-only, generic or redrawn substitute. Give the link an accessible name. Generated HTML supports embedded raster data images, not remote image URLs: embed the exact official PNG bytes within runtime limits or omit optional in-app branding and keep the platform watermark. Verify the visible icon and actual clickable destination before preview/save.'}},
 instructions:'Use a matching template with its default styling unless the user requests a visual change. Custom layouts and functionality are supported. Custom apps receive low-priority base styles; app-stack, app-grid, app-card, app-actions, app-primary and app-scroll are optional building blocks. Use semantic foreground/background pairs, a restrained accent and explicit labels. Keep all relevant fields bound; secondary fields can be hidden from the table and remain available in details. Test empty, filled, error and narrow-screen states. Preparation checks rendered text contrast, minimum type size, overflow, clipped controls and overlapping controls at desktop and mobile widths. Repair findings using the same requestKey and preview revision parameters. Passing automated checks does not replace visual review. Database permissions, reviewed saves and logs apply to every design.',
 example:{html:'<main><h1>Project overview</h1><p class="app-muted">Your next steps, in one place.</p><div class="app-grid"><section class="app-card app-stack"><h2>Next action</h2><p>No actions yet. Add your first item to begin.</p><div class="app-actions"><button class="app-primary" data-action="add">Add item</button></div></section></div></main>'}};}
