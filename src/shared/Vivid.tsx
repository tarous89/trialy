import React from 'react';
import {vividComponents} from './vivid.generated.js';
// Both React settings and the trusted tracker renderer use the same fixed component tree.
export function Vivid({name,slots={},...bindings}:{name:string;slots?:Record<string,any>;[key:string]:any}){
 const aliases:Record<string,string>={'class':'className','stroke-width':'strokeWidth','stroke-linecap':'strokeLinecap','stroke-linejoin':'strokeLinejoin'};
 const value=(v:any)=>v&&typeof v==='object'&&'slot' in v?slots[v.slot]:v;
 const node=(n:any,key:string,root=false):React.ReactNode=>{
  if(Array.isArray(n))return n.map((x,i)=>node(x,key+'.'+i,root));
  if(n===null||typeof n!=='object')return n;
  if('slot' in n)return slots[n.slot]??null;
  const props=Object.fromEntries(Object.entries(n.attrs).map(([k,v])=>[aliases[k]??k,value(v)]));
  return React.createElement(n.tag,{...props,...(root?bindings:{}),key},...n.children.map((x:any,i:number)=>node(x,key+'.'+i)));
 };
 if(!vividComponents[name])throw new Error('Unknown Vivid component: '+name);
 return node(vividComponents[name],name,true);
}
export function VividSection({title,children}:{title:string;children:React.ReactNode}){return <Vivid name="section" slots={{title,content:children}}/>;}
export function VividField({children}:{children:React.ReactNode}){const [label,...control]=React.Children.toArray(children);return <Vivid name="field" slots={{label,control}}/>;}
export function VividLayoutRow({kind,children,...events}:{kind:'tab'|'column';children:React.ReactNode}&React.HTMLAttributes<HTMLDivElement>){const parts=React.Children.toArray(children),names=kind==='tab'?['grip','name','visibility']:['grip','name','kind','visibility'];return <Vivid name={kind==='tab'?'tabLayoutRow':'columnLayoutRow'} slots={Object.fromEntries(names.map((key,i)=>[key,parts[i]]))} {...events}/>;}
