/** Local transport options only; never sent as API/MCP arguments. */
export type WorkspaceRequestOptions={signal?:AbortSignal;background?:boolean};

/** Routine checks and collapsed archive counts do not make a usable view busy.
 * Explicit foreground work may override this; all other calls remain foreground.
 */
export function workspaceRequestOptions(name:string,args:Record<string,any>,options:WorkspaceRequestOptions={}):WorkspaceRequestOptions{
 const background=name==='check_component_access'||name==='check_account_home'||name==='list_archived_items'&&args.summaryOnly===true;
 return {background,...options};
}
