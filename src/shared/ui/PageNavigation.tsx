import React,{createContext,useContext} from 'react';
export const EmbeddedNavigation=createContext(false);
/** Embedded pages use the persistent navigation, never duplicate Back/Home buttons. */
export function PageBack(props:React.ButtonHTMLAttributes<HTMLButtonElement>){return useContext(EmbeddedNavigation)?null:<button type="button" {...props}/>;}
