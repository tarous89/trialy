export async function downloadCsv(name:string,text:string,host?:((name:string,text:string)=>Promise<void>)){
 if(host)return host(name,text);
 const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function csvCell(value:unknown){const text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);return '"'+text.replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';}
export async function databaseCsv(read:(offset:number)=>Promise<any>,keys:string[]){
 let offset=0,count=0,bytes=0;const lines:string[]=[];
 do{const page=await read(offset);const fields=page.table.fields.filter((f:any)=>f.readable&&keys.includes(f.key));
 if(fields.length!==keys.length)throw Error('Column access changed. Refresh before downloading.');
 if(!lines.length)lines.push(fields.map((f:any)=>csvCell(f.name)).join(','));
 for(const row of page.rows){if(++count>50000)throw Error('More than 50,000 records match. Narrow the search before downloading.');const line=fields.map((f:any)=>csvCell(row.data[f.key])).join(',');bytes+=new TextEncoder().encode(line).length;if(bytes>20*1024*1024)throw Error('Export exceeds 20 MiB. Narrow the search before downloading.');lines.push(line);}
 if(page.nextOffset==null)break;if(page.nextOffset<=offset)throw Error('Export pagination did not advance.');offset=page.nextOffset;
 }while(true);return lines.join('\r\n');
}
