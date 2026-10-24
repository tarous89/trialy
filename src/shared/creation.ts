// UI policy only: APIs and template creation remain available.
export function continueCreationInChat(kind:string){
 window.open('https://chatgpt.com/?q='+encodeURIComponent('Use the Trialy plugin to create a '+kind+'. Show a preview before saving.'),'_blank','noopener,noreferrer');
}
