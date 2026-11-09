import React from 'react';
export function assistantUrl(assistant:'ChatGPT'|'Claude',prompt:string){return assistant==='ChatGPT'?'https://chatgpt.com/?q='+encodeURIComponent(prompt):'https://claude.ai/new?q='+encodeURIComponent(prompt);}
export function AssistantLinks({prompt}:{prompt:string}){return <span className="ty-assistant-links">{(['ChatGPT','Claude'] as const).map(name=><a key={name} href={assistantUrl(name,prompt)} target="_blank" rel="noopener noreferrer">{name}</a>)}</span>;}
