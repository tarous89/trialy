// L3.2 (docs/scopes/LOADING_SPEED_2026-11-22.md): template card images at the size a card shows them.
// Each gallery screenshot (1440×960) gets a 720×480 card (a 360 px wide card at twice the pixel density).
// Writing needs ImageMagick (`convert`); --check only reads files and fails when a card is missing or stale.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
const dir='resources/template-gallery',cards=dir+'/cards',record=dir+'/cards.json';
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const check=process.argv.includes('--check');
const shots=readdirSync(dir).filter(n=>n.endsWith('.jpg')).sort();
const held=existsSync(record)?JSON.parse(readFileSync(record,'utf8')):{};
const next={},problems=[];
for(const name of shots){
 const key=name.slice(0,-4),source=sha(`${dir}/${name}`),out=`${cards}/${name}`,old=held[key];
 if(old?.source===source&&existsSync(out)&&sha(out)===old.card){next[key]=old;continue;}
 if(check){problems.push(key);continue;}
 mkdirSync(cards,{recursive:true});
 execFileSync('convert',[`${dir}/${name}`,'-filter','Lanczos','-resize','720x480','-strip','-quality','82','-sampling-factor','4:2:0','-interlace','JPEG',out]);
 next[key]={source,card:sha(out)};
}
if(problems.length){console.error('Template cards missing or stale (run node scripts/build-template-cards.mjs): '+problems.join(', '));process.exit(1);}
const extra=Object.keys(held).filter(k=>!next[k]);
if(check&&extra.length){console.error('Template cards without a screenshot: '+extra.join(', '));process.exit(1);}
if(!check)writeFileSync(record,JSON.stringify(next,null,1)+'\n');
console.log(check?'Template cards up to date':'Template cards written: '+Object.keys(next).length);
