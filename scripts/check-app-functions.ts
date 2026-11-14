import {readFile,readdir} from 'node:fs/promises';
import {validateAppFunctions} from '../src/workspace/app-functions-schema.js';
import {validateRecipeDeclarations} from '../src/automations/recipes-schema.js';
const installers=JSON.parse(await readFile('templates/catalog-installers.json','utf8'));
for(const file of (await readdir('templates/apps')).filter(f=>f.endsWith('.json'))){
 const raw=await readFile('templates/apps/'+file,'utf8');
 if(Buffer.byteLength(raw)>300000)throw Error(file+': template exceeds the 300,000-byte file budget');
 const payload=JSON.parse(raw),schemaFile=installers[payload.id+'@'+payload.version],roles=schemaFile?Object.keys(JSON.parse(await readFile(schemaFile,'utf8'))):[];
 try{validateRecipeDeclarations(payload);validateAppFunctions(payload,roles);}catch(e){throw Error(file+': '+(e as Error).message);}
}
console.log('App function declarations and recipe bindings checked');
