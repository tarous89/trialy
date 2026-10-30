import React from 'react';
import type {AppRoute} from './app-route.js';
export const AppPlatform=React.createContext<{enabled:boolean;origin:string;openLink?:(url:string)=>void}>({enabled:false,origin:''});
export const AppNavigation=React.createContext<{route:AppRoute;reset:number;location?:{appId:string;workspaceId:string;source:string};navigate:(href:string)=>void;setDirty:(dirty:boolean)=>void}|null>(null);
export const APP_BRAND={watermark:'Built with TrialAgents',home:'/'} as const;
