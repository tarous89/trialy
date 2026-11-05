import React from 'react';
import {Button} from './ui/Controls.js';
/** One action sentence with a primary action and an optional dismissal. */
export function PageActions({children,action,onAction,onDismiss,dismissLabel='Discard changes',showDismissLabel=false,disabled=false,busy=false,variant='primary'}:{variant?:'primary'|'secondary';children:React.ReactNode;action:string;onAction:()=>void;onDismiss?:()=>void;dismissLabel?:string;showDismissLabel?:boolean;disabled?:boolean;busy?:boolean}){
 return <div className="ty-page-actions" role="group" aria-label="Save changes">{children&&<div className="ty-page-actions-summary">{children}</div>}{onDismiss&&(showDismissLabel?<Button variant="secondary" disabled={busy} onClick={onDismiss}>{dismissLabel}</Button>:<button className="ty-page-actions-dismiss" aria-label={dismissLabel} disabled={busy} onClick={onDismiss}>×</button>)}<Button variant={variant} disabled={disabled||busy} onClick={onAction}>{busy?'Saving…':action}</Button></div>;
}

