import React from 'react';
import type {AppRoute} from './app-route.js';
import {PLATFORM_ORIGIN} from './public-url.js';
import type {UxSample} from './ux-timing-schema.js';
/** reportUx/uxHost: how this host sends anonymous speed samples (P10); absent where no transport exists yet.
 * frameDocument: hosts that block nested frames from the platform origin (Claude) render the app frame inline with srcdoc. */
export const AppPlatform=React.createContext<{enabled:boolean;origin:string;openLink?:(url:string)=>void;frameDocument?:string;readTemplateMedia?:(id:string,version:string,kind:'screenshot'|'card'|'preview',digest?:string)=>Promise<string>;templateCardUrl?:(template:{id:string;version:string;digest:string})=>string|undefined;readTemplateCard?:(template:{id:string;version:string;digest:string})=>Promise<string>;useTemplate?:(template:any,requestKey:string,options?:{createNew?:boolean;sharedTables?:Record<string,string>;dataAccess?:any})=>Promise<void>;reportUx?:(samples:UxSample[])=>Promise<unknown>;uxHost?:UxSample['host'];
 /** L2.2: the host fetches app code by fingerprint (website); without it the code comes inline when the host lacks it. */
 loadAppCode?:(workspaceId:string,appId:string,digest:string)=>Promise<string|null>}>({enabled:false,origin:''});
export const AppNavigation=React.createContext<{route:AppRoute;reset:number;location?:{appId:string;workspaceId:string;source:string};navigate:(href:string)=>void;setDirty:(dirty:boolean)=>void}|null>(null);
export const APP_BRAND={watermark:'Built with TrialAgents',home:'/',website:PLATFORM_ORIGIN} as const;
