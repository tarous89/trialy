// UI policy only: APIs and template creation remain available.
export function continueCreationInChat(kind:string){
 if(document.querySelector('.ty-creation-dialog'))return;
 const previous=document.activeElement as HTMLElement|null;
 const dialog=document.createElement('dialog');dialog.className='ty-creation-dialog';dialog.setAttribute('aria-labelledby','ty-create-title');
 dialog.innerHTML='<div class="ty-brand">Trialy<span class="ty-brand-dot">.</span></div><h2 id="ty-create-title">Create with ChatGPT</h2><p>Creating new projects and tools is available in ChatGPT. Describe what you need to the Trialy plugin, then preview and save it to your account.</p><div class="ty-actions"><button type="button" class="ty-button" data-close>Cancel</button><a class="ty-button ty-button--primary" target="_blank" rel="noopener noreferrer">Continue in ChatGPT ↗</a></div>';
 dialog.querySelector('a')!.href='https://chatgpt.com/?q='+encodeURIComponent('Use the Trialy plugin to create a '+kind+'. Show a preview before saving.');
 dialog.querySelector('[data-close]')!.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{dialog.remove();previous?.focus({preventScroll:true});});document.body.append(dialog);dialog.showModal();
}
