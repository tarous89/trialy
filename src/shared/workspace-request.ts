/** Local transport options only; never sent as API/MCP arguments. */
export type WorkspaceRequestOptions={signal?:AbortSignal;background?:boolean;headers?:Record<string,string>};

/** Routine checks, collapsed archive counts and card miniatures (L1.3) do not make a usable view busy.
 * Explicit foreground work may override this; all other calls remain foreground.
 */
export function workspaceRequestOptions(name:string,args:Record<string,any>,options:WorkspaceRequestOptions={}):WorkspaceRequestOptions{
 const background=name==='check_component_access'||name==='check_account_home'||name==='read_home_snapshots'||name==='list_archived_items'&&args.summaryOnly===true;
 return {background,...options};
}
