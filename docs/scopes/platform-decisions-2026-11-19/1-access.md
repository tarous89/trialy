# Code review notes: Roles and access (R1–R5, A1, A2, A4, A5, A7, A8, A11, U3)

Evidence for the [implementation scope](../PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Produced by reading the code at commit `376f29d` on 19 November 2026; nothing was run. Line numbers refer to that commit. Where these notes list open questions, the scope's **Defaults adopted** section gives the answer to build to.

## Roles and access gap analysis (R1–R5, A1, A2, A4, A5, A7, A8, A11, U3)

Static read of the code only; nothing was run. Source lines are very long, so a line reference often covers a whole function. All paths are under `/home/user/trialy`.

The target model is mostly not there yet: there are no app-level roles, co-owners, access requests, member removal or personal assistant limits, and per-column restrictions exist in several separate mechanisms.

### 1. Current model

1. Organization = `tenants`; `memberships.role` is `owner|editor|viewer` (`migrations/001_core.sql:5-6`), but every non-owner is inserted as `'viewer'` and that value is never read.
2. There is exactly one owner per tenant, inserted at creation (`src/domain/service.ts:48`). No code promotes, demotes or transfers, and there is no last-owner rule.
3. Members get a per-workspace role `editor|viewer|inspector` in `workspace_access`, plus `hidden_fields`, `allowed_types`, `database_browse`, `direct_data`, `ai_enabled`, `claude_enabled`, `external_send`.
4. Everything else is one JSON array, `workspaces.permission_rules`, with kinds `project|tool|table|column|database|workflow|connection|app_section` and read/write `inherit|allow|deny` (`src/domain/effective-access.ts:6`), guarded by `access_version`.
5. Apps (`workspace_components`) have `allowed_users`, `ai_enabled` and `created_by`. `created_by` grants nothing except seeing your own archived apps (`src/workspace/archive.ts:38`).
6. There are no app Owner/Editor/Viewer roles. In code, `appRoles` and `role_writers` mean data-contract roles (`src/workspace/role-contracts.ts:98`, `migrations/061`), which is a naming collision.
7. Resolution runs through `access()` (`src/domain/permissions.ts:6-22`), then `toolPolicy`/`applyTypePolicy` (`src/domain/effective-access.ts:25-60`), mirrored in SQL row security (`migrations/057_claude_connection.sql:66-104`).
8. Assistants inherit the user and can only be narrowed: a workspace switch, a per-user switch, a `connection` rule with `write:'deny'`, deny rules for subject `chatgpt|claude`, `ai_hidden_types`, per-app `ai_enabled` and the per-field `ai` flag.
9. Access changes are owner-only and human-only (`src/domain/access-management.ts:38-40`, `src/domain/access-grid.ts:56-59`).
10. About 60 `owner_required` gates cover sharing, automations, monitoring, restore and policy. Billing is per user, not per organization.

### 2. Per decision

**R1 Organization owner — M**
- Current: single owner. Many resources are pinned to one owner through `owner_id … m.role='owner'` joins (`migrations/035:32,38`, `064:131`, `065:100`, `src/app-services/sharing.ts:34`).
- Gap: co-owners, the last-owner rule, reassigning app ownership and a two-permission assistant policy.
- Data: a trigger refusing to remove the last owner of a tenant.
- Server: promote/demote endpoints with `FOR UPDATE`, and an audit of the owner-pinned joins so a demoted owner's links and invitations are handled deliberately.
- Web: role control in Settings → Team (`src/web/Invitations.tsx:8` only lists members).
- Tests: `tests/invitations.test.ts` plus a new owners test.

**R2 Organization member — M**
- Current: the invitation picks viewer/editor/inspector plus deny rules (`src/server/invitations.ts:16`). Any editor can save apps and create tables. Only copies start private (`allowed_users=[creator]`, `src/workspace/service.ts:666,1064`).
- Gap: one member role; the creator becomes first app owner; a private draft until Save.
- Changes: simplify the invitation, write the creator's Owner row on install, and treat an uninstalled draft as creator-only.

**R3–R5 App owner / editor / viewer — L (the core item)**
- Current: none. All app administration is gated on the organization owner:
  - sharing `src/app-services/sharing.ts:17,28,29`
  - `set_component_access` `src/workspace/service.ts:869-870`
  - automations `src/automations/management.ts:24`, `service.ts:43`, `recipes.ts:24`, `testing.ts:21`, `copy.ts:14`; `src/app-services/monitoring.ts:30`, `service.ts:69,76,97`
  - catalog update allows owner or any editor (`src/workspace/app-update.ts:50`)
  - code changes need the owner or a member with nothing hidden (`src/workspace/service.ts:106-125`, `code_change_restricted`).
- Data (migration 078): `app_members(workspace_id, app_id, user_id, role, granted_by, granted_at)` and `workspace_components.team_default_role`, with row security. Startup fails for workspace tables without policies (`docs/DATABASE_ROLE_ROLLOUT.md`).
- Server: one resolver, `appAccess(db, actor, appId)`, returning owner/editor/viewer/none with the organization owner as implicit owner. Replace the gates above, make `toolPolicy` read it, and rewrite `workspace_permission`/`table_permission`.
- Web: rewrite the Access tab (`src/shared/AccessPanel.tsx`, 22 KB) around app roles.
- MCP: `read_access_grid`, `save_access_grid`, `update_effective_access`, `check_component_access` (`src/server/workspace-foundation.ts:118-136`), and the guides in `resources/workspace/WORKSPACE.md`, `src/server/workspace-guidance.ts` and the plugin `SKILL.md`.
- Tests: `access-grid`, `effective-access`, `app-source-access`, `database-isolation`, `shared-automations`, `archive-first`.

**A1 App and team defaults — M**
- Current: the install step offers per-person none/view/edit and per-assistant none/read/propose, changeable only by the owner on the website (`src/workspace/data-access.ts:28,36-45,96-99`). It writes per-user `tool` rules, so future members get no default.
- Gap: a team default (Editor) covering future members, changeable by any installer.
- Guests need separating first. Public-link principals and email-share recipients are ordinary `memberships` rows (`src/app-services/sharing.ts:22`, `migrations/046:79-80`). Add `memberships.kind` (`member|guest|public_link`) so the Editor default never reaches them.
- Depends on the install popup (I2/I3).

**A2 Database and records — L**
- Current per-column mechanisms:
  - `workspace_access.hidden_fields` (`src/domain/permissions.ts:19`)
  - `column` rules (`src/domain/effective-access.ts:13,48-54`)
  - the per-field `ai` flag (`src/shared/schema.ts:10`, `permissions.ts:30`)
  - `app_section` field narrowing (`src/domain/app-sections.ts`)
  - field lists frozen into scoped tool grants (`src/domain/access-management.ts:56`)
  - column rules on invitations (`src/server/invitations.ts:16`)
- Tables have no owning app. `role_writers` covers contract apps only.
- Gap: per-table Edit/View/Blocked per member; app tables following the app role; no column settings.
- Data: `entity_types.origin_app_id`.
- Server: tables with an origin app resolve through `appAccess`; restoring, changing or linking existing tables stays on database access (`src/domain/archive.ts:67`).
- Web: remove the column rows and the hidden-field editors (`src/web/DatabaseAccess.tsx`, `MemberFields.tsx`, `InviteAccessTree.tsx`).

**A4 Assistants — L**
- Current: on/off switches and deny rules, as in the model above. A member cannot limit their own assistant; the only personal control is revoking the connection (`src/web/Connections.tsx`).
- Current: assistants save both data and app changes through `commit_change` and `confirm_workspace_change` with `actionConfirmed:true` (`src/server/mcp.ts:82`, `src/server/workspace-foundation.ts:141`). Nothing enforces a human approval for app changes.
- Gap: Data and Apps, each Edit/View only/Blocked, at three tiers; Apps blocked unless the user owns the app or is creating one; a server-enforced human approval for app edits.
- Data: `data_level` and `apps_level` per assistant on the workspace (maximum) and on `workspace_access` (personal limit).
- Server: `assistantLevel(area)` = min(organization maximum, user rights, personal limit), replacing `assistantEnabled` and the `connection_read_only` check (`permissions.ts:14,16`); a self-service endpoint for the personal limit.
- Cross-dependency: the approval footer (A6) owns the human-approval path.

**A5 Requests and sharing — M/L**
- Current: owner-only. There is no request table and no request email. `prepare_app_sharing` is external email/public sharing, which belongs to the external-sharing area.
- Changes: a grant endpoint enforcing the grantable-role matrix, with lowering or removal restricted to app owners and organization owners.
- Changes: a blocked-table warning, reusing `AccessManagement.explain` (`access-management.ts:23-37`).
- Changes: `app_access_requests`, with email to all eligible grantors via `enqueueServiceJob` (`sharing.ts:25`). Check the daily cap in `migrations/051`.
- Changes: show `granted_by`/`granted_at` with time zone.

**A7 Logs and history — M**
- Current: the full audit goes to a human owner or an unrestricted inspector (`src/workspace/activity.ts:17`). Others get metadata for resources they can reach. Automation logs are owner-only.
- Changes: app owners get app-scoped logs (the `appId` filter exists at `activity.ts:10`), and editors and viewers get record history only. History already follows current permissions (`docs/WRITE_AUTHORIZATION.md:35`).

**A8 Billing — S/M**
- Current: Stripe IDs sit on `users` (`migrations/054`), the endpoints have no role check (`src/server/subscription.ts:21-26`), and the Subscription tab shows to everyone (`src/web/main.tsx:166`).
- Changes: move the IDs to `tenants`, gate on owner, hide the tab; `tests/subscription.test.ts`.

**A11 Remove a member — M/L**
- Current: `unshare` deletes one `workspace_access` row (`src/domain/service.ts:538`, route `src/server/app.ts:115`). The membership row, the user's rules and `allowed_users` entries stay. There is no UI button.
- Changes: one transaction that deletes the membership and access rows and purges the user's rules.
- Changes: the same transaction moves their app Owner rows to the removing owner and keeps co-owners.
- Changes: it disables their automations (`app_monitors`, `app_actions`, subscriptions and recipe setups by `user_id`) and revokes their runners, grants and connector credentials.
- Cross-dependency: automations area for the "set up again or move" flow.

**U3 Access messages — M (S if U1 supplies the header slot)**
- Current: the "existing request-access control" does not exist; a search for request-access wording returns nothing in `src`, `templates` or `plugin`. `src/shared/AppUnavailable.tsx` only knows missing/load/schema.
- Reusable: revocation detection (`src/shared/useAccessRecheck.ts`, `access_revoked` in `src/workspace/runtime-view.ts`).
- Changes: build the control on A5 and the header from U1.

### 3. Migration of existing data

- **Roles:** the tenant owner stays owner. Workspace editor and viewer become members, keeping their current table access as explicit table rules.
- **App roles:** each `created_by` who is still a member becomes Owner. Each existing `tool` rule becomes Editor (write allow), Viewer (read allow) or none (deny). `allowed_users` lists become explicit rows with team default none. Every other app gets the default that reproduces today's effective access, not a blanket Editor.
- **Per-column restrictions:** freeze, do not convert. Keep `visibleFields`/`applyTypePolicy` enforcing existing `hidden_fields`, column denies, `ai:false`, section rules and frozen binding field lists as read-only legacy restrictions. Offer no way to create new ones. Show them in Access with a "move to a separately permissioned table" prompt, and let only an organization owner lift them. Never widen automatically. Pending invitations with column rules keep them.
- **Assistant rules:**
  - workspace switch off → Blocked for both permissions;
  - per-user switch off → that user's cap is Blocked;
  - `connection` write-deny → View only;
  - install-step `read`/`propose` → View only/Edit;
  - table denies, `ai_hidden_types` and per-app `ai_enabled=false` stay as blocks.
- **Guests:** rows with `public-app|` subjects or created by app-share acceptance become `kind` guest/public_link with no team default.
- **Billing:** the single owner's Stripe IDs move to the tenant.

### 4. Build order

1. Migration 078 and the resolver module (guest kind, last-owner trigger, `app_members`, `origin_app_id`, assistant levels, tenant billing).
2. R1 co-owners (unblocks A8, A11).
3. R3–R5 enforcement and row security. This blocks A1, A5, A4, the approval footer, automation ownership and platform app administration.
4. A2 table model and the legacy freeze.
5. A4.
6. A5, then U3 (needs the U1 header).
7. A7, A8.
8. A11 (needs steps 2 and 3 and the automations area).
9. Access tab, guides and tests, alongside steps 3–6.

Rough total: 5–7 engineer-weeks.

### 5. Risks and open questions

**Risks**
- Row-security functions hard-code the tenant owner, workspace role and tool-binding rules. A partial rewrite gives a silent mismatch between application and SQL checks.
- Letting editors and viewers grant roles makes non-owners writers of access state. Keep that in `app_members` with its own version, not in `workspaces.permission_rules`.
- Keep the saved-source check (`src/workspace/service.ts:114-125`) alongside app ownership. Otherwise an app owner blocked from a table could publish code holding copied values.
- About 15 test files assert today's owner/editor semantics.

**Questions for the product owner**
1. Legacy per-column restrictions: freeze as above (my default), or convert each to a whole-table block? Converting is stricter but will break apps bound to those tables.
2. Inspectors currently read the full audit log. Default: they become members with Viewer everywhere and assistants Blocked, and lose organization-wide audit.
3. What is a member's default access to tables that do not belong to an app? Default: existing organizations keep current access; new organizations get View, with Edit granted per table.
4. Are the assistant maximum and personal limit set per assistant (ChatGPT and Claude separately, as stored today) or once for both? Default: per assistant.

Defaults I assumed without asking: the organization owner counts as owner of every app for the A4 Apps rule, and on removal the removing owner receives the departed member's app Owner roles.

### Critical Files for Implementation
- /home/user/trialy/src/domain/effective-access.ts
- /home/user/trialy/src/domain/permissions.ts
- /home/user/trialy/src/domain/access-management.ts
- /home/user/trialy/src/workspace/service.ts
- /home/user/trialy/migrations/057_claude_connection.sql
