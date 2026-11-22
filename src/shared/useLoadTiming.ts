import React,{useEffect,useRef} from 'react';
import {AppPlatform} from './AppPlatform.js';
import {UxTimer} from './ux-timing.js';
import type {UxSample} from './ux-timing-schema.js';
/**
 * L1.0 (docs/scopes/LOADING_SPEED_2026-11-22.md): times a screen's main content from its read starting
 * (loading turns true) until it is on screen (loading turns false with content shown). Failed or
 * abandoned reads are not counted. Best effort and silent, like every speed sample (P10).
 */
export function useLoadTiming(metric:UxSample['metric'],loading:boolean,shown:boolean){
 const platform=React.useContext(AppPlatform),started=useRef<number|null>(null),timer=useRef<UxTimer|null>(null);
 useEffect(()=>{
  if(loading){started.current??=performance.now();return;}
  if(started.current===null)return;
  const ms=performance.now()-started.current;started.current=null;
  if(!shown||!platform.reportUx)return;
  timer.current??=new UxTimer(platform.reportUx,platform.uxHost??'web');timer.current.record(metric,ms);
 },[loading,shown]);
 useEffect(()=>()=>timer.current?.flush(),[]);
}
