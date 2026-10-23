import React from 'react';
/** Trusted app navigation, deliberately outside generated tracker frames. */
export function AppShell({children,onOpenApp}:{children:React.ReactNode;onOpenApp:()=>void}){
 return <><header aria-label="Trialy navigation" style={{position:'sticky',top:0,zIndex:50,margin:0,padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,background:'#fff',borderBottom:'1px solid #dce5df',color:'#123941'}}><strong aria-label="Trialy">Trialy</strong><button type="button" onClick={onOpenApp}>Open app</button></header>{children}</>;
}
