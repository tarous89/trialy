import React from 'react';
import {EmbeddedNavigation} from './ui/PageNavigation.js';
import {Button} from './ui/Controls.js';

/** Loading failures have one quiet empty state. Home navigation stays in this surface. */
export function AppUnavailable({onHome}:{onHome?:()=>void}){
 const embedded=React.useContext(EmbeddedNavigation);
 const home=onHome??(()=>{if(embedded)window.dispatchEvent(new CustomEvent('trialy:navigate',{detail:'home'}));else location.assign('/?tab=home');});
 return <section className="ty-empty" aria-label="App unavailable"><h2>No app is available</h2><Button onClick={home}>Return to Home</Button></section>;
}
