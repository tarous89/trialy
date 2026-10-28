import React,{useEffect,useRef} from 'react';
import {Button} from './Controls.js';
export function PagePagination({offset,pageSize,total,busy=false,onPage}:{offset:number;pageSize:number;total:number;busy?:boolean;onPage:(offset:number)=>void}){
 const pages=Math.ceil(total/pageSize);if(pages<=1)return null;
 const page=Math.floor(offset/pageSize)+1;
 return <nav className="ty-page-pagination" aria-label="Pagination"><Button disabled={busy||offset===0} onClick={()=>onPage(Math.max(0,offset-pageSize))}>Previous page</Button><span aria-live="polite">Page {page} of {pages}</span><Button disabled={busy||page>=pages} onClick={()=>onPage(offset+pageSize)}>Next page</Button></nav>;
}
export function PagedScreen({children,className=''}:{children:React.ReactNode;className?:string}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=ref.current;if(!el)return;const size=()=>{if(el.closest('[hidden]'))return;el.style.setProperty('--page-height',Math.max(320,window.innerHeight-el.getBoundingClientRect().top-24)+'px');};size();const observer=new ResizeObserver(size);observer.observe(el);window.addEventListener('resize',size);return()=>{observer.disconnect();window.removeEventListener('resize',size);};},[]);
 return <div ref={ref} className={'ty-paged-screen '+className}>{children}</div>;
}
