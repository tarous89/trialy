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
