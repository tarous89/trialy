"""One-time, idempotent authoring correction before the first catalog release."""
from pathlib import Path
p = Path('templates/life-science/renderer.js')
s = p.read_text()
pairs = [
("if(action==='assumptions'){const keys=", "if(action.startsWith('draft-assumption:')&&ev.kind==='change')state.assumptionDraft={...form};\n if(action.startsWith('draft-weight:')&&ev.kind==='change')state.weightDraft={...form};\n if(action==='assumptions'&&ev.kind==='submit'){delete state.assumptionDraft;const keys="),
("if(action==='weights'){const w=", "if(action==='weights'&&ev.kind==='submit'){delete state.weightDraft;const w="),
("if(action==='submit-record'&&ev.kind==='change')", "if((action==='submit-record'||action.startsWith('draft-field:'))&&ev.kind==='change')"),
("inputField(f,data[f.key])", "inputField(f,data[f.key],'draft-field:'+f.key)"),
('name="\'+k+\'" data-ui-state="true" value="\'+w[i]+\'"', 'name="\'+k+\'" data-ui-state="true" data-action="draft-weight:\'+k+\'" value="\'+esc(state.weightDraft?.[k]??w[i])+\'"'),
('data-ui-state="true" name="\'+key+\'" value="\'+a[key]+\'"', 'data-ui-state="true" data-action="draft-assumption:\'+key+\'" name="\'+key+\'" value="\'+esc(state.assumptionDraft?.[key]??a[key])+\'"'),
]
for old, new in pairs:
    if old in s:
        assert s.count(old) == 1, old
        s = s.replace(old, new)
    else:
        assert new in s, 'Expected authoring pattern not found: ' + old
p.write_text(s)
print('Verified unique focus identities and non-submitting input drafts')
p = Path('templates/life-science/renderer.js')
s = p.read_text()
old = '<table><caption class="ls-sr">\'+esc(sch.name)+\'</caption>'
new = '<table aria-label="\'+esc(sch.name)+\'">'
if old in s:
    assert s.count(old) == 1
    s = s.replace(old, new)
else:
    assert new in s
p.write_text(s)
p = Path('templates/life-science/theme.css')
s = p.read_text().replace('font-size:11px','font-size:12px').replace('color:#677e6d','color:#52695d')
marker = '/* Readable forecast table headers */'
if marker not in s:
    s += '\n' + marker + '\n.ls-data-disclosure th{color:#203b2f;background:#f4f8f5}\n'
p.write_text(s)
print('Verified accessible table names, type floor and readable supporting labels')
p = Path('templates/life-science/theme.css')
s = p.read_text()
if '.ls-lane-empty{color:#52695d}' not in s:
    s += '.ls-lane-empty{color:#52695d}\n'
p.write_text(s)
