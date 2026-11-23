import React from 'react';
// L3.6: 96 px copies of the brand marks (shown at 22 to 28 px), not the 810 px originals.
import lightMark from '/trialagents-mark-white-96.png?url';
import darkMark from '/trialagents-mark-black-96.png?url';

export const brandMarks={light:lightMark,dark:darkMark};
/** Bundled assets also work inside the ChatGPT extension's isolated origin. */
export function BrandMark({tone='light',size=26}:{tone?:'light'|'dark';size?:number}){
 return <img className="ty-brand-mark" src={brandMarks[tone]} width={size} height={size} alt="" aria-hidden="true" style={{display:'block',objectFit:'contain',flexShrink:0}}/>;
}
