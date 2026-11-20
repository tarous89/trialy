import React from 'react';
export type OlderRestriction={key:string;table:string;column:string;level:string};
/**
 * A2, D1: access is set per table. Per-column permissions that already exist keep working and are only listed here.
 * Nothing can be added or tightened; an organization owner can lift one. Shows nothing when there are none.
 * `lifting` holds the keys that will be lifted by the next save.
 */
export function OlderColumnRestrictions({items,canLift,lifting=[],onLift,disabled=false,buttonClass='ty-button'}:{items:OlderRestriction[];canLift:boolean;lifting?:string[];onLift?:(item:OlderRestriction,lift:boolean)=>void;disabled?:boolean;buttonClass?:string}){
 if(!items.length)return null;
 return <section className="ty-access-legacy" aria-label="Older column restrictions"><h3>Older column restrictions</h3><p>Per-column permissions are no longer offered. Move this information to its own table, then lift the restriction.</p>
  <ul>{items.map(x=>{const pending=lifting.includes(x.key);return <li key={x.key}><span>{x.table} · {x.column} · {x.level}</span>{pending&&<small>Lifted when you save</small>}
   {canLift&&onLift&&<button type="button" className={buttonClass} disabled={disabled} aria-label={`${pending?'Keep':'Lift'} restriction on ${x.column} in ${x.table}`} onClick={()=>onLift(x,!pending)}>{pending?'Keep':'Lift'}</button>}</li>;})}</ul></section>;
}
