import React from 'react';
import {EmbeddedNavigation} from './ui/PageNavigation.js';
import {Button} from './ui/Controls.js';

/** A failed load is not evidence that a saved app is missing. */
export function AppUnavailable({onHome,onRetry,reason='missing'}:{onHome?:()=>void;onRetry?:()=>void;reason?:'missing'|'load'|'schema'}){
 const embedded=React.useContext(EmbeddedNavigation);
 const home=onHome??(()=>{if(embedded)window.dispatchEvent(new CustomEvent('trialy:navigate',{detail:'home'}));else location.assign('/?tab=home');});
 return <section className="ty-empty" aria-label="App unavailable"><h2>{reason==='schema'?'App needs a connection review':reason==='load'?'App could not load':'No app is available'}</h2>{reason==='schema'&&<p>The saved app is still here. Its connected fields changed and need review.</p>}{reason==='load'&&<p>This loading error does not mean the app was deleted.</p>}{onRetry&&<Button onClick={onRetry}>Retry loading</Button>}<Button onClick={home}>Return to Apps</Button></section>;
}
