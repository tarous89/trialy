import React from 'react';
export function extractionLabel(status:string) {return status==='ready'?'Available':status==='partial'?'Partial extraction':status==='unavailable'?'No extraction available':'Processing';}
export function DocumentText({document,busy,onClose,onPage}:{document:any;busy:boolean;onClose:()=>void;onPage:(offset:number)=>void}) {
 return <section className="document-text"><h2>{document.filename} · v{document.version}</h2><p>{extractionLabel(document.status)} · Original saved</p><button type="button" onClick={onClose}>Close text</button>
 {document.status==='partial'&&<p>Some source content may be missing from this extraction.</p>}
 {document.text?<pre>{document.text}</pre>:<p>No extracted text is available to read yet. The original remains stored.</p>}
 <footer><button type="button" disabled={busy||document.offset===0} onClick={()=>onPage(Math.max(0,document.offset-12000))}>Previous text</button><button type="button" disabled={busy||!document.hasMore} onClick={()=>onPage(document.offset+12000)}>More text</button></footer>
 </section>;
}
