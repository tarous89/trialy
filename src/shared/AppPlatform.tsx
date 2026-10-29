import React from 'react';
import type {AppRoute} from './app-route.js';
export const AppPlatform=React.createContext({enabled:false,origin:''});
export const AppNavigation=React.createContext<{route:AppRoute;reset:number;footerHeight:number;navigate:(href:string)=>void;setDirty:(dirty:boolean)=>void}|null>(null);
export const APP_BRAND={footer:'Built with TrialAgent',home:'/'} as const;
