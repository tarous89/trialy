// Trusted application adapter only. User content is escaped; raw() is for renderer output.
function createVivid(components){
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const raw=html=>({html});
 const voids=new Set(['input','img','br','hr','col']);
 function render(name,slots={},bindings={}){
  if(!Object.prototype.hasOwnProperty.call(components,name))throw new Error('Unknown Vivid component: '+name);
  const value=v=>v&&typeof v==='object'&&'slot' in v?slots[v.slot]:v;
  function content(v){if(v==null||v===false)return '';if(Array.isArray(v))return v.map(content).join('');if(v&&typeof v==='object'&&'html' in v)return v.html;return escape(v);}
  function node(n,root=false){
   if(Array.isArray(n))return n.map(x=>node(x,root)).join('');
   if(typeof n!=='object'||n===null)return escape(n);
   if('slot' in n)return content(slots[n.slot]);
   const attrs=Object.entries({...n.attrs,...(root?bindings:{})}).map(([k,v])=>{v=value(v);return v===false||v==null?'':' '+k+'="'+escape(v)+'"';}).join('');
   return '<'+n.tag+attrs+'>'+(voids.has(n.tag)?'':n.children.map(x=>node(x)).join('')+'</'+n.tag+'>');
  }
  return node(components[name],true);
 }
 return {render,raw,escape};
}
