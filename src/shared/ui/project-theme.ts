import type {CSSProperties} from 'react';
export function projectTheme(id?:string):CSSProperties{
 if(!id)return {'--project-bg':'#edf1ef','--project-light':'#668676'} as CSSProperties;
 let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))>>>0;
 const hue=hash%360,other=(hue+35+(hash%45))%360;
 return {'--project-bg':`linear-gradient(${115+hash%65}deg,hsl(${hue} 55% 88%),hsl(${other} 60% 93%))`,'--project-light':`hsl(${hue} 35% 28%)`} as CSSProperties;
}
