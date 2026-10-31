import type {Express} from 'express';
import {trackerOperation} from '../../src/workspace/tracker-template.js';
import type {WorkspaceFoundation} from '../../src/workspace/service.js';
import type {Service} from '../../src/domain/service.js';
import type {Actor} from '../../src/shared/schema.js';

// Created lazily by the final browser suite so its schema cannot invalidate older previews.
export function addWideTrackerFixture(app:Express,f:WorkspaceFoundation,s:Service,actor:Actor,workspaceId:string){
 let ready:Promise<string>|undefined;
 const create=async()=>{
  const save=async(op:any)=>{const p=await s.preview(actor,workspaceId,op);return s.commit(actor,p.id,p.digest);};
  const tabs=[];
  for(const [index,size] of [28,21,12,18].entries()){
   const fields=Array.from({length:size},(_,i)=>({key:'field_'+i,name:i===0?'Name':'Qualification '+i,kind:i>0&&i<=5?'select':'text',ai:true,...(i>0&&i<=5?{options:['Active','Pending']}:{})}));
   const typeId=(await save({kind:'create_type',name:'Responsive table '+index,fields})).objects[0].id;
   await save({kind:'bulk_records',changes:Array.from({length:25},(_,r)=>({kind:'create_record',typeId,data:Object.fromEntries(fields.map((field,i)=>[field.key,i>0&&i<=5?(r%2?'Pending':'Active'):'Tab '+index+' value '+r]))}))});
   tabs.push({name:'Tab '+index,typeId,filters:fields.slice(1,6).map(f=>f.key),columns:fields.map((field,i)=>({field:field.key,visible:i<9}))});
  }
  const op=await trackerOperation(f,actor,workspaceId,{name:'Responsive tracker',description:'Four tabs and long filters',showExample:false,omitSource:true,tabs});
  const p=await f.preview(actor,workspaceId,op);return (await f.confirm(actor,workspaceId,p.id,p.digest)).id;
 };
 app.get('/fixture/wide-tracker',async(_req,res)=>{ready??=create();const id=await ready;res.json({screen:'tracker',...await f.readComponent(actor,workspaceId,id,true)});});
}
