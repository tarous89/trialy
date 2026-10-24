import React from 'react';
const paths={
 panelOpen:'M3 4h18v16H3Zm6 0v16m4-12 4 4-4 4',
 panelClose:'M3 4h18v16H3Zm6 0v16m8-12-4 4 4 4',
 refresh:'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1',
 home:'m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
 database:'M20 6c0 2-3.6 3-8 3S4 8 4 6s3.6-3 8-3 8 1 8 3Zm0 0v12c0 2-3.6 3-8 3s-8-1-8-3V6m0 6c0 2 3.6 3 8 3s8-1 8-3',
 logs:'M8 3h12v18H4V7m4-4v5H3m5 4h8m-8 4h8',
 lock:'M6 11h12v10H6Zm3 0V7a3 3 0 0 1 6 0v4M12 15v2',
 settings:'m9 3-.6 2.2-2 .9-2-.6-2 3.5 1.5 1.6v2.8L2.4 15l2 3.5 2-.6 2 .9L9 21h4l.6-2.2 2-.9 2 .6 2-3.5-1.5-1.6v-2.8L19.6 9l-2-3.5-2 .6-2-.9L13 3Zm6 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 tracker:'M4 4h16v16H4Zm0 5h16M9 9v11m5-11v11',
 form:'M8 4H5v17h14V4h-3M8 2h8v5H8Zm0 9h8m-8 4h5',
 visualization:'M4 3v17h17M8 15v-4m5 4V6m5 9v-7',
 automation:'M4 4h6v6H4Zm10 10h6v6h-6ZM7 10v7h7m-4-10h7v7',
 molecule:'m8 5 8 1 4 7-6 6-9-3-2-7Zm0 0 6 14M3 9l17 4m-15 3L16 6',
 dna:'M7 2c0 8 10 12 10 20M17 2C17 10 7 14 7 22M8 5h8M9 9h6m-6 6h6m-7 4h8',
 flask:'M9 3h6m-5 0v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M7 15h10',
 search:'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm5.5 13 5 5',
 plus:'M12 5v14M5 12h14',chevron:'m8 5 7 7-7 7',down:'m6 9 6 6 6-6',
 grid:'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
 list:'M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1',
 menu:'M4 6h16M4 12h16M4 18h16',close:'m6 6 12 12M6 18 18 6',
 check:'m5 12 4 4L19 6',arrow:'M5 12h14m-6-6 6 6-6 6',external:'M14 3h7v7m0-7L10 14m0-10H4v16h16v-6',
 clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
 more:'M5 12h.1M12 12h.1M19 12h.1',folder:'M3 6V4h6l2 3h10v13H3Z',
} as const;
export type IconName=keyof typeof paths;
export function Icon({name,size=20,...props}:{name:IconName;size?:number}&React.SVGProps<SVGSVGElement>){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]}/></svg>;}
