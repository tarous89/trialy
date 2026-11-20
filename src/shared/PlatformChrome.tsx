import React,{useCallback,useContext,useMemo,useState} from 'react';
import {SystemNotice} from './SystemNotice.js';

/**
 * What the platform provides to every app and page (U1, U2, G2). Apps never draw these themselves.
 * - notify: the one shared message, bottom right. Info and success close after five seconds; an error stays until dismissed.
 * - setAppName: the open app's name is shown in the platform header, so apps need no header of their own.
 * - footerInset / setFooterInset: space taken by the approval footer, so content and messages stay clear of it.
 */
export type PlatformNotice={kind:'info'|'success'|'error';message:string};
export type Chrome={notify:(notice:PlatformNotice)=>void;setAppName:(name:string|null)=>void;appName:string|null;footerInset:number;setFooterInset:(px:number)=>void};
const none:Chrome={notify:()=>{},setAppName:()=>{},appName:null,footerInset:0,setFooterInset:()=>{}};
const PlatformChromeContext=React.createContext<Chrome>(none);
export const usePlatformChrome=()=>useContext(PlatformChromeContext);
export function PlatformChromeProvider({children}:{children:React.ReactNode}){
 const [notice,setNotice]=useState<PlatformNotice|null>(null),[appName,setName]=useState<string|null>(null),[footerInset,setInset]=useState(0);
 const notify=useCallback((next:PlatformNotice)=>setNotice({...next}),[]),setAppName=useCallback((name:string|null)=>setName(name),[]),setFooterInset=useCallback((px:number)=>setInset(Math.max(0,Math.round(px))),[]);
 const value=useMemo(()=>({notify,setAppName,appName,footerInset,setFooterInset}),[notify,setAppName,appName,footerInset,setFooterInset]);
 return <PlatformChromeContext.Provider value={value}>{children}{notice&&<SystemNotice error={notice.kind==='error'} message={notice.message} onDismiss={()=>setNotice(null)}/>}</PlatformChromeContext.Provider>;
}
