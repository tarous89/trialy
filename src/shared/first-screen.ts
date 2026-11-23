/**
 * L1.5 (docs/scopes/LOADING_SPEED_2026-11-22.md): the main content of the first screen is shown (Apps home's cards or an
 * app's first screen). Downloads for later pages wait for this, so they never compete with the first screen.
 */
const EVENT='trialy:first-screen';
let shown=false;
export function firstScreenShown(){if(shown)return;shown=true;try{window.dispatchEvent(new Event(EVENT));}catch{/* not in a browser */}}
/** Calls fn once the first screen is shown, or after fallbackMs (a first page that never reports). Returns a canceller. */
export function afterFirstScreen(fn:()=>void,fallbackMs=3000){
 let done=false,frame=0,timer:ReturnType<typeof setTimeout>|undefined;
 const run=()=>{if(done)return;done=true;clear();frame=requestAnimationFrame(()=>{timer=setTimeout(fn,0);});};
 const fallback=setTimeout(run,fallbackMs);
 const clear=()=>{clearTimeout(fallback);window.removeEventListener(EVENT,run);};
 if(shown)run();else window.addEventListener(EVENT,run);
 return()=>{done=true;clear();cancelAnimationFrame(frame);if(timer)clearTimeout(timer);};
}
