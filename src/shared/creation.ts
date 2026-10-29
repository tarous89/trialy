// UI policy only: APIs and template creation remain available.
export function continueCreationInChat(kind:string){
 if(document.querySelector('.ty-creation-dialog'))return;
 const previous=document.activeElement as HTMLElement|null;
 const dialog=document.createElement('dialog');dialog.className='ty-creation-dialog';dialog.setAttribute('aria-labelledby','ty-create-title');
 dialog.innerHTML='<div class="ty-brand">TrialAgents<span class="ty-brand-dot">.</span></div><h2 id="ty-create-title">Create with ChatGPT</h2><p>Build trackers, forms, dashboards and automations with TrialAgents in ChatGPT. Describe your workflow, review the result, and save it. Your saved tools are available instantly in this app with the same data.<ul><li>Track outreach, vendors, projects or budgets</li><li>Collect information with forms</li><li>Explore progress in dashboards and charts</li><li>Set up reminders and recurring workflows</li></ul></p><div class="ty-actions"><button type="button" class="ty-button" data-close>Cancel</button><a class="ty-button ty-button--primary" target="_blank" rel="noopener noreferrer">Continue in ChatGPT ↗</a></div>';
 if(kind==='app')dialog.querySelector('p')!.textContent='Describe the app you need. ChatGPT can start from a template or build a custom app with pages, shared data and connectors. Review the result before saving.';
 dialog.querySelector('a')!.href='https://chatgpt.com/?q='+encodeURIComponent('I want to build a new '+kind+' in TrialAgents. Ask me what I want to build, or suggest a few useful ideas to choose from.');
 dialog.querySelector('[data-close]')!.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{dialog.remove();previous?.focus({preventScroll:true});});document.body.append(dialog);dialog.showModal();
}

