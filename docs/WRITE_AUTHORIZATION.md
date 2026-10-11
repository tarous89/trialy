# Database write approval and change history

Agreed 11 October 2026. This supersedes earlier automatic-maintenance defaults. It is the target specification; runtime enforcement and the shared history interface still need implementation.

## Default: propose, review, approve, save

ChatGPT may extract, structure and reconcile information into a proposed change. An existing schema, approved task, previous save, same chat session or code execution grant is not permission to save further database changes.

Show a visible review with an Approve changes button and a discard/cancel option before each database write unless an applicable longer-term data-type permission exists. One approval may cover an explicitly listed batch; it need not require a separate click per cell. The review identifies the data type, records, every changed field, previous and proposed values, additions/removals, and the authorization being requested. Initial inserts show their supplied values with no prior value. Derived changes are identified too. Pending drafts remain distinct from saved history.

Manual editing follows the same principle: editing does not save silently; a visible review/save action confirms the exact changes. Editing presentation alone does not change underlying records. Server-side enforcement applies equally to ChatGPT, the standalone app, generated code, imports, reconciliation and background workers. Prompt instructions alone are insufficient. Changed inputs or stale versions require a fresh preview; replaying an accepted confirmation must not duplicate effects.

## Optional longer-term permission

A user must explicitly grant longer-term permission for a named data type. No general workspace-wide or all-future-data-types write grant. Multiple types require separately identifiable authorization for each; a mixed batch must have valid authority for every change or return for review as a whole.

Show the permitted actions, fields, source/task constraints, eligible actor/function or worker, validity period and revocation control. New types, new fields, schema changes and broader inclusion/source rules do not inherit permission. Schema/setup approval and permission for future record writes are separate choices. Permission never expands data visibility or authorizes external actions such as sending email.

With a valid grant, an in-scope change can save without another approval click, but must still produce a visible, inspectable change summary and permanent field-level history linked to that exact grant version. Background activity must be discoverable in the same history; it must not depend on an open chat. Revocation or expiry stops subsequent writes and leaves history intact. Existing permissions must be assessed against the new contract, never silently upgraded into blanket authority.

## Fixed Changes and permissions area

Provide a permanent, easy-to-find area in both the standalone app and embedded workspace. Include pending reviews, completed changes and longer-term permissions. Allow filtering by data type, record, actor, date and permission; open details on a separate page or short modal.

For every committed field-value change record the stable record/type/field identity, old and new values (including unset versus null), actor, timestamp, change-set/receipt, source or rationale where available, and the exact approval or longer-term grant that authorized it. Include AI/code/worker origin and derived-value changes. Record authorization evidence in the same transaction as the data and audit entry. Preserve prior grant versions and revocation history. Failed attempts and unsaved proposals must not appear as successful saved changes.

History and previews obey current human/AI field and record permissions, including values from old versions. A human-visible review must not automatically put restricted values into model context. Do not claim an app-only MCP tool is cryptographic proof of a human click; verify a trusted confirmation path.

## Reverse safely

Offer Reverse change for a field or selected change set, with a preview and explicit approval. Reversal creates a new audited change referencing the original and its authorization; it never removes history. If later edits, formulas or relationships make reversal unsafe, show the conflict and require a reviewed correction rather than overwriting newer work. Reversing a creation with dependants must preserve references or use an appropriate reviewed archival/correction operation. Database reversal cannot recall a sent email or undo other external effects.

## Lean acceptance checks

Verify that ordinary writes require approval, correct type-scoped grants permit only their stated writes, revocation/expiry stops writes, field diffs and authorization are committed atomically, hidden values remain hidden, and reversal preserves history and rejects stale overwrites. Reuse existing transaction, permission and receipt tests; no broad cosmetic test expansion.
