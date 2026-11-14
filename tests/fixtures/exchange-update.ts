import {deflateSync,crc32} from 'node:zlib';

/**
 * Fictional investor update used by the update-extension tests (docs/product/EXTERNAL_EXCHANGE.md §6)
 * and the browser checks of the page and the email. Plain text and HTML only, so people and assistants
 * can read every fixture; the chart is a generated PNG uploaded as an AI-readable platform document.
 */
export const UPDATE_TITLE='Acme Bio — October 2026 board update';
export const SERIES={key:'schedule:board-monthly',name:'Acme Bio board updates'};
export const ASKS=[{key:'cmo_intro',text:'Introductions to an experienced CMO for the Phase 2 programme.'},{key:'bd_partner',text:'Contacts at oncology BD teams in Japan.'}];
/** The app's block renderer output: headings, a metrics table, a chart, milestones, an ask marker and some markup TrialAgents must remove. */
export function updateHtml(chartVersionId:string){
 return [
  '<h1>October 2026 board update</h1>',
  '<p><strong>TL;DR:</strong> cash runway is 14.2 months to the Phase 2 readout; enrolment is 62% complete.</p>',
  '<h2>Cash and runway</h2>',
  '<table><thead><tr><th>Metric</th><th>Value</th><th>Change</th></tr></thead><tbody><tr><td>Cash</td><td>€18.4m</td><td>−€1.3m</td></tr><tr><td>Monthly burn</td><td>€1.3m</td><td>flat</td></tr><tr><td>Runway</td><td>14.2 months</td><td>−1.0</td></tr></tbody></table>',
  `<img src="doc:${chartVersionId}" alt="Cash balance, May to October 2026" width="600">`,
  '<h2>Programmes</h2>',
  '<ul><li>ACM-101 Phase 2: 62 of 100 patients enrolled.</li><li>ACM-204: IND filing moved from Q1 to Q2 2027 after FDA feedback.</li></ul>',
  '<p style="color:#7a271a;font-weight:700">Lowlight: one site in Spain paused enrolment for four weeks.</p>',
  '<h2>Asks</h2>',
  '<div data-ask="cmo_intro"></div>',
  '<p>Full minutes are in the board pack. <a href="https://acme-bio.example/board">Board portal</a></p>',
  '<script>document.title="x"</script><iframe src="https://tracker.example/pixel"></iframe><p onclick="steal()">Thank you for your support.</p>'
 ].join('\n');
}
export const updateContent=(chartVersionId:string)=>({html:updateHtml(chartVersionId),asks:ASKS,confidentiality:'Confidential — prepared for {recipient_name}. Please do not forward.',preheader:'Runway 14.2 months; enrolment 62% complete.'});

/** A real PNG (solid colour with a darker band) so email clients and browsers can decode it. */
export function png(width:number,height:number,rgb:[number,number,number]=[8,123,88]){
 const row=(y:number)=>{const r=Buffer.alloc(1+width*3);for(let x=0;x<width;x++){const band=y>height*0.6;r[1+x*3]=band?Math.round(rgb[0]/2):rgb[0];r[2+x*3]=band?Math.round(rgb[1]/2):rgb[1];r[3+x*3]=band?Math.round(rgb[2]/2):rgb[2];}return r;};
 const raw=Buffer.concat(Array.from({length:height},(_,y)=>row(y)));
 const chunk=(type:string,data:Buffer)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const body=Buffer.concat([Buffer.from(type,'ascii'),data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(body)>>>0);return Buffer.concat([len,body,crc]);};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
 return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
