import {z} from 'zod';
import {designPalettes,luminance,readable} from './app-design.js';
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const toolThemeSchema=z.object({
 primary:color.optional(),accent:color.optional(),success:color.optional(),background:color.optional(),surface:color.optional(),text:color.optional(),muted:color.optional(),border:color.optional(),
 fontFamily:z.string().regex(/^[a-zA-Z0-9 ,"'\-]+$/).max(200).optional(),fontSize:z.number().min(12).max(24).optional(),density:z.enum(['comfortable','compact']).optional(),radius:z.number().min(0).max(30).optional(),
 css:z.string().max(12000).optional()
}).strict();
export type ToolTheme=z.infer<typeof toolThemeSchema>;
/** Scoped to the app frame; the approved theme remains the default. */
export function themeCss(value?:ToolTheme){
 if(!value||!Object.keys(value).length)return '';
 const t=toolThemeSchema.parse(value),dark=t.background&&luminance(t.background)<.2,base=dark?designPalettes.midnight:designPalettes.forest;
 const bg=t.background??base.background,surface=t.surface??base.surface,ink=readable(t.text??base.text,bg),surfaceInk=readable(t.text??base.text,surface),muted=readable(t.muted??base.muted,bg),surfaceMuted=readable(t.muted??base.muted,surface),primary=t.primary??base.primary,accent=readable(t.accent??t.primary??base.accent,bg),surfaceAccent=readable(t.accent??t.primary??base.accent,surface),line=t.border??base.border;
 const rules=[`:root{--ink:${ink};--muted:${muted};--accent:${accent};--line:${line};--light:${bg};--paper:${surface};--editable:color-mix(in srgb,${surfaceAccent} 12%,${surface});color-scheme:${dark?'dark':'light'}}`,
 `body{background:${bg};color:var(--ink)}h1,h2,h3,.drawer-head h2,.settings-section h2{color:var(--ink)}h1{color:${readable(primary,bg,3)}}`,
 `.card,.drawer,.settings-section,.settings-note,.settings-page-note,.search,.filter,.sort,.secondary,.field input,.field textarea,.field select,.settings-section input,.settings-section textarea,.settings-section select,.settings-row input,.settings-row select{--ink:${surfaceInk};--muted:${surfaceMuted};--accent:${surfaceAccent};background:${surface};color:var(--ink);border-color:var(--line)}`,
 `.subtitle,.small-note,.tablefoot,.hint,.inline-helper,.settings-help,.settings-section p,.person-identity small,.drawer-resize-note,.empty-source,.layout-binding small{color:var(--muted)}`,
 `.tab,.settings-tabs button{color:var(--muted)}.tab.active,.settings-tabs button.active{color:var(--accent);border-color:var(--accent)}a,.source-link,.mini-link,.rank,.back-link{color:var(--accent)}`,
 `.search input,.filter,.sort,.secondary,.field input,.field textarea,.field select,.settings-section input,.settings-section textarea,.settings-section select,.settings-row input,.settings-row select{color:var(--ink)}input::placeholder,textarea::placeholder{color:var(--muted);opacity:1}`,
 `thead th,tbody td,tbody td:first-child,.next,#trackerTable th.action-col,.settings-section .layout-head,.settings-section .layout-entry .cell-label,.settings-section label,.settings-row label,.drawer-main .detail dd,.field span,.detail dt,.settings-section .settings-line .cell-label{color:var(--ink)}`,
 `#trackerTable thead th,#trackerTable tbody td,#trackerTable th.action-col,#trackerTable td.action-col,thead th,.drawer-head,.drawer-actions{background:var(--paper);border-color:var(--line)}`,
 `#trackerTable tbody tr:hover td,.drawer-main .detail:hover,.drawer-main .detail.is-editing,.tab-settings:hover,.drag-grip:hover{background:color-mix(in srgb,var(--accent) 7%,var(--paper));color:var(--ink)}`,
 `.drawer-main .detail.is-changed,.draft-row td{background:var(--editable);color:var(--ink)}.tab-settings,#trackerTable .expand-row,#trackerTable .expand-row:hover{color:var(--muted)}.tab-settings:hover,#trackerTable .expand-row:hover{color:var(--accent)}`,
 `.primary{background:${primary};border-color:${primary};color:${readable('#ffffff',primary)}}.primary:hover{background:${primary};filter:brightness(.95)}`,
 `.settings-section select:disabled{background:var(--paper);color:var(--muted)}`];
 if(t.success)rules.push(`.pill.green{color:${readable(t.success,surface)};background:${surface};border:1px solid ${readable(t.success,surface)}}`);
 if(t.fontFamily)rules.push('body{font-family:'+t.fontFamily+'}');
 if(t.fontSize)rules.push('body,tbody td,input,select,textarea{font-size:'+t.fontSize+'px}');
 if(t.density==='compact')rules.push('tbody td,thead th{padding:8px 10px}.toolbar{margin:12px 0}.stat{padding:12px}');
 if(t.radius!==undefined)rules.push('.card,.stat,.primary,.secondary,.search,.filter,.sort{border-radius:'+t.radius+'px}');
 return '\n'+rules.join('\n')+'\n'+(t.css??'');
}
