import {z} from 'zod';
const key=z.string().regex(/^[a-z][a-zA-Z0-9_-]{0,63}$/);
const item=z.object({id:key,label:z.string().min(1).max(100)}).strict();
export const customLayoutSchema=z.object({screens:z.array(item).min(1).max(8),groups:z.record(key,z.array(item).min(1).max(100))}).strict();
export const customLayoutProfile=z.object({heading:z.string().trim().min(1).max(100),tabs:z.array(key).min(1).max(8),cols:z.record(key,z.array(key).min(1).max(100)),visible:z.record(z.string().max(130),z.boolean())}).strict();
// Read JSON declarations only. Never execute app source in the host.
export function readCustomLayout(source:string){
 try{
  const configLine=/^const templateConfiguration=(.+);\n/.exec(source);
  const schemaLine=/^const templateLayoutSchema=(.+);$/m.exec(source);
  if(!configLine||!schemaLine)return null;
  const configuration=JSON.parse(configLine[1]),schema=customLayoutSchema.parse(JSON.parse(schemaLine[1]));
  const defaults={heading:configuration.heading||'App',tabs:schema.screens.map(s=>s.id),cols:Object.fromEntries(Object.entries(schema.groups).map(([k,v])=>[k,v.map(f=>f.id)])),visible:{}};
  const profile=customLayoutProfile.parse({...defaults,...JSON.parse(configuration.layoutProfile||'{}')});
  validateCustomLayout(schema,profile);
  return {configuration,schema,profile,prefix:configLine[0]};
 }catch{return null;}
}
export function validateCustomLayout(schema:z.infer<typeof customLayoutSchema>,profile:z.infer<typeof customLayoutProfile>){
 const same=(a:string[],b:string[])=>a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
 if(!same(profile.tabs,schema.screens.map(s=>s.id))||!profile.tabs.some(id=>profile.visible[id]!==false))throw Error('Keep the declared screens and at least one visible screen.');
 if(!same(Object.keys(profile.cols),Object.keys(schema.groups)))throw Error('Keep the declared field groups.');
 for(const [group,fields]of Object.entries(schema.groups))if(!same(profile.cols[group],fields.map(f=>f.id)))throw Error('Keep the declared field identities.');
 const allowed=new Set([...profile.tabs,...Object.entries(schema.groups).flatMap(([g,fs])=>fs.map(f=>g+':'+f.id))]);
 if(Object.keys(profile.visible).some(k=>!allowed.has(k)))throw Error('Unknown layout visibility key.');
}
export function updateCustomLayout(source:string,input:unknown){
 const current=readCustomLayout(source);if(!current)throw Error('This app has no supported layout declaration.');
 const profile=customLayoutProfile.parse(input);validateCustomLayout(current.schema,profile);
 return 'const templateConfiguration='+JSON.stringify({...current.configuration,heading:profile.heading,layoutProfile:JSON.stringify(profile)})+';\n'+source.slice(current.prefix.length);
}
