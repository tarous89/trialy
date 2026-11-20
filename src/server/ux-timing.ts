import type {Database} from '../db/database.js';
import {UX_BUCKETS,UX_TARGET_MS,uxBatchSchema,uxBucket} from '../shared/ux-timing-schema.js';

/** Add a batch of timing samples to today's histograms. One statement per distinct bucket; nothing identifies who sent it. */
export async function recordUxTiming(db:Database,input:unknown){
 const {samples}=uxBatchSchema.parse(input),counts=new Map<string,{metric:string;host:string;width:string;mode:string;bucket:number;n:number}>();
 for(const s of samples){const bucket=uxBucket(s.ms),key=[s.metric,s.host,s.width,s.mode,bucket].join('|'),row=counts.get(key);if(row)row.n++;else counts.set(key,{metric:s.metric,host:s.host,width:s.width,mode:s.mode,bucket,n:1});}
 for(const c of counts.values())await db.query('INSERT INTO ux_timing_daily(day,metric,host,width,mode,bucket_ms,samples) VALUES(current_date,$1,$2,$3,$4,$5,$6) ON CONFLICT(day,metric,host,width,mode,bucket_ms) DO UPDATE SET samples=ux_timing_daily.samples+EXCLUDED.samples',[c.metric,c.host,c.width,c.mode,c.bucket,c.n]);
 return {recorded:samples.length};
}
/** Smallest bucket bound that covers the given share of samples. Histogram percentiles are upper bounds, not exact values. */
export function uxPercentile(buckets:{bucket_ms:number;samples:number}[],share:number){
 const total=buckets.reduce((n,b)=>n+Number(b.samples),0);if(!total)return null;
 let seen=0;for(const b of [...buckets].sort((a,b)=>a.bucket_ms-b.bucket_ms)){seen+=Number(b.samples);if(seen/total>=share)return b.bucket_ms;}
 return UX_BUCKETS[UX_BUCKETS.length-1];
}
/** Per metric, host, width and mode over the last days: sample count, median and 75th/95th percentile bounds, and whether the 75th meets the target. */
export async function uxTimingSummary(db:Database,days=7){
 const rows=(await db.query('SELECT metric,host,width,mode,bucket_ms,sum(samples)::bigint AS samples FROM ux_timing_daily WHERE day>current_date-$1::integer GROUP BY metric,host,width,mode,bucket_ms',[Math.max(1,Math.min(90,Math.floor(days)))])).rows;
 const groups=new Map<string,any[]>();for(const r of rows){const key=[r.metric,r.host,r.width,r.mode].join('|');groups.set(key,[...(groups.get(key)??[]),r]);}
 return [...groups.entries()].map(([key,buckets])=>{const [metric,host,width,mode]=key.split('|'),p75=uxPercentile(buckets,.75),target=UX_TARGET_MS[metric as keyof typeof UX_TARGET_MS];
  return {metric,host,width,mode,samples:buckets.reduce((n,b)=>n+Number(b.samples),0),p50:uxPercentile(buckets,.5),p75,p95:uxPercentile(buckets,.95),targetMs:target,meetsTarget:p75!==null&&p75<=target};}).sort((a,b)=>(a.metric+a.host+a.width+a.mode).localeCompare(b.metric+b.host+b.width+b.mode));
}
