# Effective access contract

Approved scope: 25 October 2026. Trialy is ChatGPT-first. App and plugin share one database and one authorization policy.

## Identities, grants and restrictions

The authenticated actor is resolved by the server. ChatGPT inherits that person's permissions and can only be further restricted. New account databases, ordinary invitations and new uploads default to ChatGPT-enabled after connection authorization. Explicit existing exclusions remain exclusions; inspectors remain human-only.

Interface access, database browsing, data access and configuration authority are separate. A person can use a shared tool without opening Database. A tool-derived grant snapshots its reviewed table/column bindings and record scope. Changes affect shared records after the ordinary review/save; access to another tool is not granted by editing shared data.

Tool context is server-created after resolving the saved tool, never accepted from custom code. Record scope is the tool's declared project membership or all records in its bound table, not an editable presentation filter. New bindings outside a scoped grant require the owner to review sharing again. Moving a project-scoped tool cannot turn that grant into workspace-wide access.

Applicable grants combine. Explicit read restrictions override all paths to that data. Write restrictions preserve permitted reading and override every tool's editing grant. No direct grant is distinct from an explicit block. Tool/project restrictions also constrain their descendant execution context. Read-only tool sharing uses an explicit write restriction; it cannot be undone by inherited edit access.

Account roles remain the base grants. Inspectors cannot edit. Viewers may edit explicitly shared tools; direct Database editing requires the Editor role. Scoped tool grants can provide data editing without configuration authority. Owners manage sharing through a protected authenticated endpoint with CSRF and optimistic version checks. Generated frontends cannot invoke that endpoint, change actors, access credentials or bypass database policy. Workflow controls may only narrow access.

## Transparency and interaction

The Access page separates My workspace from Shared with me. Its directory includes only currently authorized account storage. Owned workspaces show a user/connection selector, initially All users. The All users summary and batch targets exclude immutable owners when other members exist; owners retain full authority. Connections remain separate principals inheriting the signed-in user.

The grid stacks projects (expandable tools), Database (general permissions, tables and expandable columns), workflows, and the selected user's ChatGPT connection. Green square checks mean allowed, grey crosses mean denied, and a grey mixed indicator means underlying permissions differ. Column source details stay behind the information button. Shared workspaces show only the current user's visible resources and effective rights, never other members or hidden columns. Permission management remains owner-only.

Allow edits starts off. Changes remain local, highlight the edited rows in green, and expose Save changes / Ignore changes. A batch saves atomically with an expected access version and existing audits; a failure rolls back every row. Database, table and column restrictions name bound tools in an alert before the batch is saved. Explicit child restrictions remain authoritative when a broader parent grant is enabled.

The shared panel is also available in project/tool/table/column context. Plugin Save prepares an expiring, user-owned review with a short review URL. The authenticated app displays the exact batch and requires Save changes; MCP cannot impersonate human approval. No permission is changed merely by opening the review.

Workflow rows describe the existing private function/automation permissions; saved workflow source remains private to its creator. Owners can restrict a member's existing workflow rights, but a checkbox never silently shares source or transfers execution identity. Database restrictions and write approvals still apply. A connection's view/edit settings can independently stop AI writes without stopping the person's permitted human edits.

## Enforcement

The backend applies permissions to reads, field writes, derived readers, record history and commit validation. Restricted fields are projected before delivery. Runtime row-level security validates tenant/table access and the server-resolved tool context; application policy additionally enforces column and project-record scope.

Connected standard trackers can render permitted portions when a column is restricted. Arbitrary saved source that requires a newly unavailable binding fails closed: copied literals cannot be reliably redacted. Component history retains the existing conservative binding/source checks. Archived tools remain inspectable; execution remains blocked while archived.

Permission mutations increment the access version. Pending changes recheck current authority and version. Cached interfaces clear output when access changes; revalidation runs on focus and periodically. Revocation stops subsequent access, not recall of information already viewed or downloaded.

Database editing follows effective field permissions. Deleting whole records remains owner-only and retains the existing linked-record and history safeguards. Sharing is not a standing write approval: exact preview/approval is still required unless a valid, explicitly authorized type-scoped longer-term grant covers the operation. See WRITE_AUTHORIZATION.md.

## Migration

Migration 042 adds the database-wide RLS rule boundary used by the permission grid. Migration 041 adds rules and separates database browsing from direct-data grants. Existing member grants remain intact. Legacy workspace AI defaults are repaired only when creation evidence exists and no deliberate workspace AI/access-policy decision is recorded. Existing member/document exclusions remain intact. The migration updates invitation row-security checks for inherited AI defaults and preserves inspector restrictions.

## Verification

Tests cover tool edits and record creation without database browsing; source attribution; multiple tools over one record; cross-tool column restrictions; AI inheritance; revoked pending changes; unauthorized permission updates; and execution with the restricted runtime database role. Existing isolation, approvals, history, schema migration, archival and invitation tests remain required. Browser QA covers app/plugin navigation, contextual access, save review, connection recovery and narrow screens.
