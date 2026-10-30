import React from 'react';
import {Button} from './ui/Controls.js';
/** One action sentence with a primary action and an optional dismissal. */
export function ActionFooter({children,action,onAction,onDismiss,dismissLabel='Discard changes',showDismissLabel=false,disabled=false,busy=false,variant='primary'}:{variant?:'primary'|'secondary';children:React.ReactNode;action:string;onAction:()=>void;onDismiss?:()=>void;dismissLabel?:string;showDismissLabel?:boolean;disabled?:boolean;busy?:boolean}){
 return <footer className="ty-action-footer" aria-label="Save changes"><div className="ty-action-footer-sentence">{children}</div><Button variant={variant} disabled={disabled||busy} onClick={onAction}>{busy?'Saving…':action}</Button>{onDismiss&&(showDismissLabel?<Button variant="secondary" disabled={busy} onClick={onDismiss}>{dismissLabel}</Button>:<button className="ty-footer-dismiss" aria-label={dismissLabel} disabled={busy} onClick={onDismiss}>×</button>)}</footer>;
}

