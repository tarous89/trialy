import React from 'react';
import {Button} from './ui/Controls.js';
/** One action sentence and its CTA; secondary dismissal remains an accessible icon. */
export function ActionFooter({children,action,onAction,onDismiss,dismissLabel='Discard changes',disabled=false,busy=false}:{children:React.ReactNode;action:string;onAction:()=>void;onDismiss?:()=>void;dismissLabel?:string;disabled?:boolean;busy?:boolean}){
 return <footer className="ty-action-footer" aria-label="Save changes"><div className="ty-action-footer-sentence">{children}</div><Button variant="primary" disabled={disabled||busy} onClick={onAction}>{busy?'Saving…':action}</Button>{onDismiss&&<button className="ty-footer-dismiss" aria-label={dismissLabel} disabled={busy} onClick={onDismiss}>×</button>}</footer>;
}
