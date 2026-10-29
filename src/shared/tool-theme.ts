import {z} from 'zod';
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const toolThemeSchema=z.object({
 primary:color.optional(),accent:color.optional(),success:color.optional(),background:color.optional(),surface:color.optional(),text:color.optional(),muted:color.optional(),border:color.optional(),
 fontFamily:z.string().regex(/^[a-zA-Z0-9 ,"'\-]+$/).max(200).optional(),fontSize:z.number().min(12).max(24).optional(),density:z.enum(['comfortable','compact']).optional(),radius:z.number().min(0).max(30).optional(),
 css:z.string().max(12000).optional()
}).strict();
export type ToolTheme=z.infer<typeof toolThemeSchema>;
/** Scoped to the tool iframe. CSP continues to prohibit external requests. */
export function themeCss(value?:ToolTheme){
 if(!value)return '';
 const t=toolThemeSchema.parse(value),rules:string[]=[];
 const vars=Object.entries({accent:t.accent??t.primary,ink:t.text,muted:t.muted,line:t.border,light:t.background,paper:t.surface}).filter(([,v])=>v).map(([k,v])=>'--'+k+':'+v);
 if(vars.length)rules.push(':root{'+vars.join(';')+'}');
 if(t.primary)rules.push('.primary{background:'+t.primary+';border-color:'+t.primary+'}.primary:hover{background:'+t.primary+';filter:brightness(.92)}h1,h2,h3{color:'+t.primary+'}');
 if(t.accent)rules.push('.tab.active,.settings-tab.active{color:'+t.accent+';border-color:'+t.accent+'}a,.source-link{color:'+t.accent+'}');
 if(t.success)rules.push('.pill.green{color:'+t.success+';background:color-mix(in srgb,'+t.success+' 12%,var(--paper))}');
 if(t.surface)rules.push('.card,.drawer,.search,.filter,.sort,.secondary,thead th{background:'+t.surface+'}');
 if(t.fontFamily)rules.push('body{font-family:'+t.fontFamily+'}');
 if(t.fontSize)rules.push('body,tbody td,input,select,textarea{font-size:'+t.fontSize+'px}');
 if(t.density==='compact')rules.push('tbody td,thead th{padding:8px 10px}.toolbar{margin:12px 0}.stat{padding:12px}');
 if(t.radius!==undefined)rules.push('.card,.stat,.primary,.secondary,.search,.filter,.sort{border-radius:'+t.radius+'px}');
 return '\n'+rules.join('\n')+'\n'+(t.css??'');
}
