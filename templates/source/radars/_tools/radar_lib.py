"""Shared helpers for the radar definition scripts (make_wave2.py, make_wave3.py)."""
import json,os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def W(slug,name,data):
    os.makedirs(os.path.join(ROOT,slug),exist_ok=True)
    open(os.path.join(ROOT,slug,name),'w').write(json.dumps(data,indent=2 if name!='demo_data.json' else 1,ensure_ascii=False)+'\n')
def F(key,name,kind='text',**o):
    d={'key':key,'name':name,'kind':kind};d.update(o);return d
WEB='Use the public site on the web.'
today='2026-11-16'
def demo(r,items,events):
    recs=[];n=[0]
    def add(role,data):
        n[0]+=1;i='00000000-0000-4000-8000-%012d'%n[0];recs.append({'role':role,'id':i,'version':0,'data':data});return i
    P=r['prefix']
    add(P+'.settings',{'lookback_days':90,'research_template_version':1})
    srcs=json.dumps(r['sources'])
    s1=add(P+'.scopes',{'name':'Fibrosis (fictional)','definition':json.dumps({r['scopeFields'][0]['key']:'fibrosis'}),'sources':srcs,'watchlist':'[]','status':'active','archived':False})
    runs=[]
    for i,d in enumerate(['2026-11-02','2026-11-09','2026-11-16']):
        rid='00000000-0000-4000-9100-%012d'%(i+1);runs.append(rid)
        rep=[{'scope_id':s1,'sources':[{'name':s['name'],'status':'used' if j<2 else ('not_reachable' if j==len(r['sources'])-1 else 'not_relevant'),'note':''} for j,s in enumerate(r['sources'])]}]
        add(P+'.runs',{'run_id':rid,'scope_ids':json.dumps([s1]),'kind':'build' if i==0 else 'refresh','run_on':d,'assistant':'claude','research_template_version':1,'sources_report':json.dumps(rep),'items_added':len(items) if i==0 else 1,'items_updated':0 if i==0 else 2,'events_added':len(events),'summary':'Fictional run for the demo. Two changes this week.','status':'completed'})
    ids=[]
    for k,(data,key) in enumerate(items):
        changed='["new"]' if k==len(items)-1 else ('["%s"]'%list(data)[1] if k==0 else '[]')
        ids.append((add(P+'.'+r['trackerTable'],{**data,'natural_key':key,'scope_id':s1,'sources':json.dumps([{'title':'Source (fictional)','url':'https://news.example.invalid/'+key.replace('|','-').replace(' ','-'),'date':today}]),'last_verified_on':today,'last_changed_run_id':runs[2] if k in (0,len(items)-1) else runs[0],'changed_fields':changed,'watched':k==0,'dismissed':False}),key))
    for j,(kind,title,ii,d,imp,exp) in enumerate(events):
        iid,key=ids[ii]
        add(P+'.events',{'scope_id':s1,'item_id':iid,'natural_key':key+'|'+kind+'|'+d,'kind':kind,'title':title,'summary':'Fictional event for the demo.','occurred_on':d,'occurred_month':d[:7],'expected':exp,'impact':imp,'direction':'threat' if imp=='high' else 'neutral','so_what':'Could change the plan for NWB-101 (fictional).' if imp=='high' else None,'sources':json.dumps([{'title':'Source (fictional)','url':'https://news.example.invalid/e%d'%j,'date':d}]),'run_id':runs[2] if j<2 else runs[0],'status':'new' if j<3 else 'reviewed'})
    return {'asOf':today,'note':'Fictional demo data for '+r['name']+'. Every company, asset, identifier and URL is invented; .invalid domains resolve nowhere.','records':[{**x,'data':{k:v for k,v in x['data'].items() if v is not None}} for x in recs]}
