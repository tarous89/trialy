export function csvRows(text:string,maxRows=1000):string[][]{
 if(text.length>1024*1024)throw Error('Choose a CSV under 1 MiB.');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 const finish=()=>{row.push(cell);if(row.some(x=>x!==''))rows.push(row);if(rows.length>maxRows)throw Error('CSV row limit exceeded.');row=[];cell='';closed=false;};
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted){quoted=false;closed=true;}else if(!cell&&!closed)quoted=true;else throw Error('Unexpected quote in CSV.');}
 else if(c===','&&!quoted){row.push(cell);cell='';closed=false;}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;finish();}else{if(closed)throw Error('Unexpected text after quoted CSV value.');cell+=c;}}
 if(quoted)throw Error('Unclosed quoted CSV value.');finish();return rows;
}
