import {lookup} from 'node:dns/promises';
import {isIP,BlockList} from 'node:net';
import {request} from 'node:https';
import {fail} from '../shared/schema.js';
const denied=new BlockList();
denied.addAddress('168.63.129.16','ipv4'); // Azure host/wire service, not a customer API.
for(const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)denied.addSubnet(ip,bits,'ipv4');
const global6=new BlockList();global6.addSubnet('2000::',3,'ipv6');
for(const [ip,bits] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]] as const)denied.addSubnet(ip,bits,'ipv6');
export function publicAddress(address:string){const family=isIP(address);return family===4?!denied.check(address,'ipv4'):family===6&&global6.check(address,'ipv6')&&!denied.check(address,'ipv6');}
export type OutboundRequest={url:string;method:string;body?:string;headers:Record<string,string>;authorize?:()=>Promise<void>};
export type OutboundResponse={status:number;body:string;bytes:number;durationMs:number};
export type ConnectorTransport=(input:OutboundRequest)=>Promise<OutboundResponse>;
export async function resolveDestination(value:string,resolve=lookup){
 const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hash||(u.port&&u.port!=='443'))fail(400,'connector_destination','Use a public HTTPS destination on port 443');
 const host=u.hostname.replace(/^\[|\]$/g,'');if(host.toLowerCase()==='localhost'||host.endsWith('.localhost')||host.endsWith('.local'))fail(400,'connector_destination','Private destinations are not permitted');
 const addresses=isIP(host)?[{address:host,family:isIP(host)}]:await resolve(host,{all:true,verbatim:true});
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))fail(400,'connector_destination','Private or reserved destinations are not permitted');
 return {url:u,address:addresses[0]};
}
export function createHttpsTransport(dependencies:{lookup?:typeof lookup;request?:typeof request}={}):ConnectorTransport{return async input=>{
 const started=Date.now();if(Buffer.byteLength(input.body??'')>65536)fail(413,'connector_request_size','Connector request exceeds 64 KiB');
 // Resolve once and pin the socket lookup; never follow redirects or forward credentials.
 let timer:ReturnType<typeof setTimeout>|undefined;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Connector timeout')),10000);});
 try{return await Promise.race([timeout,(async()=>{
  const {url,address}=await resolveDestination(input.url,dependencies.lookup??lookup);
  await input.authorize?.();
  if(Date.now()-started>=10000)throw Error('Connector timeout');
  return await new Promise<OutboundResponse>((resolve,reject)=>{
   const req=(dependencies.request??request)(url,{method:input.method,agent:false,headers:{...input.headers,'accept-encoding':'identity',...(input.body?{'content-length':String(Buffer.byteLength(input.body))}:{})},lookup:((_host:any,options:any,cb:any)=>options?.all?cb(null,[address]):cb(null,address.address,address.family)) as any},res=>{
    const chunks:Buffer[]=[];let bytes=0;
    if((res.statusCode??500)>=300&&(res.statusCode??500)<400||res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.destroy();reject(Error('Connector redirect or encoding rejected'));return;}
    res.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>65536){res.destroy();reject(Error('Connector response exceeds 64 KiB'));}else chunks.push(chunk);});
    res.on('error',reject);res.on('end',()=>resolve({status:res.statusCode??500,body:Buffer.concat(chunks).toString('utf8'),bytes,durationMs:Date.now()-started}));
   });
   // Wall-clock deadline includes DNS, response headers and response body.
   const remaining=Math.max(1,10000-(Date.now()-started)),deadline=setTimeout(()=>req.destroy(Error('Connector timeout')),remaining);
   req.on('close',()=>clearTimeout(deadline));req.on('error',reject);if(input.body)req.write(input.body);req.end();
  });
 })()]);}finally{clearTimeout(timer);}
};}
export const httpsTransport=createHttpsTransport();
