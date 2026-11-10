/**
 * Claude does not apply the MCP Apps `frameDomains` policy, so a nested frame from the TrialAgents
 * origin is blocked there. The Claude widget carries the same frame document and renders it with
 * srcdoc; its own CSP (hash-only scripts, no network) and the iframe sandbox still apply.
 * ChatGPT's resource is not passed through this function.
 */
export function withInlineFrameDocument(html:string,frameDocument:string){
 // ASCII-only JSON: the script hash in the frame CSP must match byte for byte whatever charset the host assumes.
 const data=JSON.stringify(frameDocument).replace(/[<\u007f-￿]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 if(!html.includes('<body>'))throw Error('Workspace bundle has no <body> tag');
 return html.replace('<body>',`<body><script type="application/json" id="trialy-frame-document">${data}</script>`);
}
