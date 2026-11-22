// L1.5 (docs/scopes/LOADING_SPEED_2026-11-22.md, choice C): the first requests start here, before the
// main script has downloaded; index.html already shows the page frame. src/shared/early-reads.ts adopts
// them. Each result is used once and only while fresh; a failed or slow start falls back to the normal
// request. Keys must equal earlyReadKey() (tests/early-start.test.ts). Plain script: no imports, no build step.
(function(){
 var path=location.pathname,tab=new URLSearchParams(location.search).get('tab');
 if(['/shared-app','/join-app','/collect','/exchange','/join'].indexOf(path)>=0||path.indexOf('/apps/')===0)return;
 var early=window.__trialyEarly={};
 function read(key,url){early[key]={started:Date.now(),result:fetch(url,{credentials:'same-origin'}).then(function(r){return r.json().then(function(data){return r.ok?{ok:true,value:data}:{ok:false};});}).catch(function(){return {ok:false};})};}
 read('me:{}','/api/me');
 if(path==='/'&&(!tab||tab==='home'))read('home:{"kind":"all","limit":20,"offset":0,"projectId":"","query":"","sort":"updated"}','/api/account/home');
})();
