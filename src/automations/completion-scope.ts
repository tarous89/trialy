type Binding={typeId:string;fields:string[]};
export const completionScopeResolution='Review the linked app field access or narrow the research read/write scope with owner approval, then re-read the saved research before preparing its database-triggered action. Do not replace the completion trigger with a manual or calendar email.';
/** An independently approved research scope can be wider than the app. Such a
 * report must not be released to the app's notification audience. */
export function completionScope(appBindings:Binding[],readBindings:Binding[],scopes:{body:{bindings:Binding[]}}[]){
 const missing=new Map<string,Set<string>>();
 for(const b of [...readBindings,...scopes.flatMap(s=>s.body.bindings)]){
  const allowed=new Set(appBindings.find(x=>x.typeId===b.typeId)?.fields??[]);
  for(const field of b.fields)if(!allowed.has(field)){if(!missing.has(b.typeId))missing.set(b.typeId,new Set());missing.get(b.typeId)!.add(field);}
 }
 const missingBindings=[...missing].map(([typeId,fields])=>({typeId,fields:[...fields].sort()}));
 return missingBindings.length?{status:'blocked' as const,code:'run_source_scope',missingBindings,resolution:completionScopeResolution}:{status:'ready' as const,missingBindings:[]};
}
