import {readFileSync} from 'node:fs';

// Inline the same stylesheet Vite bundles for AccountEntry. Auth needs no JS.
const css=readFileSync(new URL('../shared/account.css',import.meta.url),'utf8');
export function accountPage(body:string){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" type="image/png" href="/trialagents-mark-black.png"><title>TrialAgents account</title><style>body{margin:0}${css}</style></head><body><main class="ty-account-entry"><header class="ty-entry-header"><a class="ty-entry-brand" href="https://trialagents.com/" target="_blank" rel="noopener noreferrer" aria-label="TrialAgents home (opens in a new tab)"><img src="/trialagents-mark-black.png" width="32" height="32" alt=""><span>TrialAgents</span></a><a class="ty-entry-home" href="https://trialagents.com/">← Back to home</a></header><div class="ty-entry-body"><section class="ty-entry-panel" aria-labelledby="ty-auth-title"><img class="ty-entry-mark" src="/trialagents-mark-black.png" width="52" height="52" alt="">${body}</section></div></main></body></html>`;
}
