# Apps, access and automations: revised product scope

31 October 2026. **Documentation-only revision; implementation is paused for review.** This is the authoritative target for the next change. It supersedes conflicting navigation, app-creation and automation-management descriptions in earlier scopes, not existing runtime behavior. The original product brief remains historical. See the [automation engine scope](../scopes/APP_AUTOMATION_ENGINE_2026-10-31.md) for scheduling and execution mechanics.

## Product model

An app is a saved interface with a stable identity and independently managed configuration: optional database bindings, access policy, optional connector bindings and zero or more automations. These are related resources, not separate kinds of app. ChatGPT considers all five during creation and updates only what the requested app needs.

| Platform destination | Responsibility |
| --- | --- |
| Home | Saved apps and projects; open the published app |
| Database | Tables, relationships, records and the app's authorized data bindings |
| Access Control | Each app's effective permissions; expand an app to configure registered tabs when needed; retain existing database and connection controls |
| Connectors | Named external connections, allowed apps, operations and data scopes |
| Automations | Workspace-wide list of app-linked automations, their configuration, status and history; separate shared ChatGPT connection setup |

Use the existing platform navigation and visual components. Product discussion may call the access destination Access Control; the current UI label is Access. This scope does not require renaming unrelated navigation. The new Automations destination belongs to platform management, not to every generated app's own navigation. A contextual link from app details opens this same list filtered to that app, without creating a second configuration store. Keep existing standalone app pages free of management chrome and preserve embedded operation.

An app can have no database, connectors or automations. It always has an access boundary: a newly created app is private to its owner unless explicitly shared. “No access setup” means no additional sharing configuration, not public or unprotected access. No new app-specific login or seat-purchasing model is introduced.

## Current implementation and remaining work

| Area | Verified baseline | Next scope |
| --- | --- | --- |
| App access | Saved apps already have server-enforced sharing and contextual access; the grid groups tools under projects | Make every app individually discoverable in an Apps section, optionally grouped by project, and expandable into registered tabs |
| Tab access | No general app-tab authorization resource exists | Add stable tab identities, inheritance and server-enforced tab execution/data boundaries |
| Automations | Release 0.2.38 has shared runners, schedules, occurrences, guarded research, receipts and owner settings | Add one first-class list across apps and both executors; complete schedule/prompt editing and lifecycle controls |
| ChatGPT setup | MCP Events server methods and guided setup exist | Attempt setup at first supported plugin use, at latest first app creation; expose honest pending/unsupported states |
| Live activation | Web/worker deployed; actual unattended ChatGPT run not verified | Resolve worker shared-key configuration, host event discovery, subscription and unattended acceptance separately |

Do not replace the working queue or build a second scheduler to implement this UI. Existing app services remain the platform executor; existing monitors remain the research executor. Add shared management adapters where necessary, preserving their identities, grants and receipts.

## App and tab access

Every app has a parent permission row with the current view/edit distinction. App use and data editing do not imply permission to edit app code, share resources, manage connectors or manage automations.

The proposed default is **inherit and restrict**. Tabs inherit effective app access until an authorized owner adds a narrower rule. A tab cannot grant access when its parent app is denied. Database, connector, record and AI restrictions continue to apply, and explicit denials remain authoritative. The owner retains the existing owner-management authority. Human permissions and the connected user's AI restrictions remain distinguishable.

For a four-tab app, Access Control can show the app as one row and expand it into Overview, Records, Reports and Budget. The owner can leave the whole app inherited, make Budget read-only or deny Budget to selected users. Ordinary users see only authorized resources; the hierarchy must not disclose restricted tab names or contents. No new per-button, per-function or per-column controls are introduced by this feature; existing database column protections remain supported.

Tabs are registered user-facing sections with immutable IDs and editable labels. Renaming, reordering, changing a route or publishing a layout revision preserves the identity and its restrictions. Temporary filters, modals and every small UI state do not become access resources. Existing tracker view IDs may be reused after validation; custom apps declare their sections explicitly. Never infer protected sections by scraping generated HTML or by trusting client-provided tab names.

New ordinary tabs inherit the app policy, with a clear publication review of any new audience or bindings. New data/connector capabilities still require their own authorization. A restricted tab cannot be replaced with a new ID to bypass its policy: review section additions/removals and preserve the prior restriction until an explicit policy decision. Removing a tab retires its identity and policy for history; it does not delete records. Unregistered routes cannot become an escape from a declared restriction.

**Enforcement is a release requirement.** The server must resolve the saved app revision, registered tab and actor, then constrain reads, writes, exports, searches, counts, connector operations, deep links and MCP calls through that context. Filter protected data before delivery, including prefetched/cached data, render inputs, source literals and error metadata. A client tab ID is not an authority token. Restrictions apply in both standalone and ChatGPT surfaces.

Hiding a tab is only presentation. Existing arbitrary custom source can contain protected literals or combine every tab's data, so it cannot automatically receive a trustworthy per-tab checkbox. Add enforceable section-specific bindings and source/output isolation where required; otherwise keep app-level access and explicitly report that tab restrictions need a reviewed app update. Never advertise protection that the current runtime cannot enforce. Do not rewrite existing apps silently.

Tab restrictions narrow access through that app section; they do not revoke an independently authorized Database or other-app path. Owners who need to protect the underlying information everywhere must use the existing database/record/column controls. Warn about other applicable access paths in the review. Copied content and cross-tab summaries need explicit source/binding checks; moving a protected result to an unrestricted tab must not implicitly publish it.

Access revocation remains effective immediately for subsequent reads and effects. Clear newly forbidden data, including cached tab output, while keeping remaining permitted tabs usable. The app-continuity rule never overrides actual access revocation.

## Automations destination

Show one paginated list of definitions, including disabled and setup-pending entries, with search and optional filters by app, executor and status. Each row includes name, linked app, executor, schedule/trigger summary, enabled state, operational status, next due time and last outcome. Keep enabled intent separate from readiness: an enabled definition can be blocked by missing authority or connection. Show due work separately from upcoming work; do not use a daily check timestamp as proof of a successful job.

Rows expand on demand. Keep the normal list compact and retain the existing responsive toolbar rule: search and primary action stay on one line; secondary filters go into a disclosure when needed. Load configuration/history only when expanded and paginate history. Do not fetch all prompts, records or histories to render the list.

Expanded configuration uses the same versioned definition, validation and review path as ChatGPT:

- Purpose and parent app; **Runs with ChatGPT** or **Runs in TrialAgents**.
- Enabled/disabled control; schedule or trigger editor, timezone, start/end conditions and a preview of the next eligible run.
- For ChatGPT: editable task prompt, sources, eligibility, coverage, evidence requirements, deduplication, output/destination and completion/no-result criteria.
- For TrialAgents: typed action configuration, approved input/output mappings and relevant email template/recipient policy. Do not manufacture a ChatGPT prompt for a deterministic action.
- Expandable approved read/write scopes, limits, approval expiry, execution identity and optional completion dependency. Secrets and signing material are never displayed.
- Last attempt, last successful completion, pending work, result/save receipts and bounded retry/history controls.

Daily, weekly, monthly, one-time, after-success interval, record-date and database-change schedules must be inspectable and editable here. Expose every user-editable configuration field available through MCP, including database filters and output/source rules; do not require ChatGPT merely to inspect or change an existing configuration. Internal IDs, secret material, immutable receipts and dispatcher instructions are not editable automation settings. UI and MCP use one canonical schema rather than independently maintained copies or a raw JSON-only editor.

Editing schedule or prompt never replaces the shared host task. Save with optimistic version checks and a concrete review of changed instructions, timing and affected permissions. A schedule edit preserves completed coverage and history, affects future occurrences, and shows how pending work will be handled. Reconcile queued occurrences transactionally so the old and new schedules cannot both dispatch. Prompt/objective/source changes create a new definition revision; incompatible active claims are fenced and any coverage reset is explicit. New recipients, data destinations, capabilities or write grants require the normal separate authorization. Prose does not confer authority.

In the proposed first version, only the app/workspace owner can inspect private prompts/history or manage automation. Ordinary app editors/viewers and public-link users gain no automation authority. Scope listings to the authenticated owner and workspace; there is no cross-owner aggregation or implicit use of another person's ChatGPT account. Delegated management is a separate follow-up requiring explicit manage permissions, execution ownership and disclosure rules.

## Lifecycle and data preservation

An automation is durable app configuration. Offer **Disable**, **Enable**, **Edit** and **History**; no standalone Delete operation in the new UI or MCP contract. Disabled definitions stay listed and editable. Require an explicit eligible-state check on re-enable; never silently resume after a failed save, reconnect or app restore. Existing unrelated legacy APIs need compatibility review before changing their behavior.

| Operation | Required result |
| --- | --- |
| Disable one automation | Stop new claims and fence further uncommitted effects from active attempts; retain app, records, definition, receipts and completed results |
| Disable ChatGPT connection | Stop that runner's research; independent approved platform actions remain available; dependent chains respect parent disablement |
| Edit schedule/prompt | Version the definition and reconcile affected work; do not republish/reload the app or erase data/history |
| Rename/move/publish app | Keep stable automation links; revalidate changed access, bindings and compatibility; layout-only edits do not interrupt research |
| Archive app | Suspend its automations; restoring the app does not silently restart background work |
| Delete app | Retire its attached automation definitions and prevent future effects through the existing app-deletion flow; retain audit/run receipts under existing retention policy |
| Copy app | Create a new private app with no active copied grants, runner or schedules; optional copied automation drafts stay disabled until reviewed |

Deleting or disabling automation never deletes underlying app records, tables or previously saved research. App deletion does not cascade into shared database data. Already committed results or already dispatched external effects cannot be undone by Disable; show this accurately in management history. Provider unknown outcomes use existing reconciliation instead of unsafe resend. A stale email dependency can be blocked without undoing completed research.

## Shared ChatGPT connection and onboarding

The shared connection is infrastructure for many definitions, not an automation row and not a task per app. Retain one logical runner/subscription per authorizing user and workspace. Daily dispatch (proposed default 06:00 in the confirmed local timezone), immediate eligible triggers, due calculations, receipts and bounded continuation reuse the existing engine. The server sends a small wake-up event; ChatGPT fetches current authorized due instructions. Full mutable prompts do not live in callback payloads or a copied host schedule.

Target the first supported plugin setup/use and, at latest, the first app-creation conversation for guided connection setup. Plugin installation or OAuth alone cannot establish a host subscription or background-work authorization. When the host offers no install-time execution hook, first tool use is the actionable point. Reuse already-recorded consent and an existing runner; do not repeat permissions unnecessarily or create duplicate subscriptions.

Keep connection setup separate from approving each automation. The user's reviewed onboarding choice may cover later definitions within an explicit scope; it does not authorize every future suggested objective, recipient or write. Apps save and run even if setup is declined, unavailable or incomplete. Do not block first app creation to force automation setup. Show pending setup in Automations, and offer a resumable handoff; never imply that accepting OAuth proves unattended execution.

Readiness requires actual supported host discovery/subscription and a verified background cycle. A successful callback delivery is not job completion. The current production checks still include the shared web/worker encryption key, host discovery, subscription, renewal/revocation and a real unattended run. This scope does not claim those gates are complete or promise an exact-time ChatGPT execution SLA.

## ChatGPT app creation and authoring standard

Apply this workflow to every template and custom app. Automation remains optional; considering it is standard, automatically adding it is not.

1. Read the supported current app, access, connector and automation contracts; inspect relevant existing resources before creating duplicates.
2. Design the interface and stable user-facing sections. Choose data bindings or explicitly no database. Preserve existing app identities during revisions.
3. Establish owner-private app access by default; configure requested sharing and supported tab restrictions. Validate permissions and data/connector boundaries independently of visual design.
4. Reuse/configure only required connectors. Decide ongoing work: none, ChatGPT research, platform action, or a linked research-to-platform-email chain.
5. Propose useful automation with concrete timing, prompt/action, sources, outputs, limits and permissions. Existing user intent can authorize preparation; template recommendations alone cannot activate it.
6. Save the reviewed app and data configuration through existing safeguards. Then persist/reconcile approved automations against that saved app with stable authoring keys. Automation preparation/activation failure cannot roll back a successfully saved app or block its use. Never dispatch from an unsaved preview.
7. Complete or resume shared connection setup at the first opportunity if authorized and supported; reuse it for every later app. Platform-only actions do not depend on ChatGPT readiness.
8. Verify app save, permission configuration, automation definition, enabled/readiness state and next occurrence separately. Link the user to the app and its filtered Automations view; report partial setup honestly.

When implementation ships, update app/tool descriptions, dynamic authoring/usage guidance, bundled workspace/design instructions and examples together. Required authoring documentation covers app purpose, stable sections and inheritance, optional data/connector bindings, access expectations, automation mode and executor, timing/timezone, complete prompt/action, sources/output contract, failure/no-result behavior, permissions, lifecycle and no-automation examples. All examples remain template-independent. This planning pass must not publish instructions that claim unimplemented tab controls or tools already exist.

## Failure isolation and compatibility

Automation listing, scheduling, callback delivery, task execution and history are optional management paths. None is a dependency of app resolution, rendering, navigation, ordinary data reads/writes, publication or web health. Retain bounded worker pools, independent queue work, statement deadlines, leases, idempotency and UI boundaries; also bound scheduler/database load so a background backlog cannot exhaust app request capacity.

A failed background job leaves the latest authorized published app and local unsaved input usable. It must not replace content, force refresh, show an error overlay/save footer or corrupt state in standalone or embedded apps. Diagnostics and retry controls belong only in Automations. Within that management page, failed reads keep the last valid list/detail state when available and allow localized recovery. Pending editor input is preserved on save failure; never show an unsuccessful save as committed.

Research writes use reviewed scoped transactions and receipts. Retry/reconnect never clears tables, reapplies completed effects, erases user edits or substitutes a stale snapshot for the live database. Permission/schema changes can block a job safely; unrelated app operation continues. Actual permission revocation still restricts the app as required by the access contract.

Existing apps retain app-level permissions and all current data, links and published versions. Tab restrictions are opt-in until an app has a compatible section contract. Existing legacy monitors/actions retain their execution mode, IDs and history; list them through adapters and prevent dual scheduling during explicit migration. No global rewrite or automatic activation is authorized.

## Delivery scope and acceptance

This revision changes documentation only. Resume implementation only after the product review; do not deploy this branch as a feature release.

1. **Unified management:** add the Automations destination and paginated app-linked listing over existing executors; owner-only expanded editors, disable/enable, history and honest connection state. No queue rewrite.
2. **App access hierarchy:** expose every app as a parent; add registered section identity and effective-policy enforcement before displaying tab permission controls. Ship custom-section support only with a demonstrated data/source boundary.
3. **Creation and connection:** align general creation, dynamic templates, MCP descriptions and onboarding. Preserve first-app success when connection/automation configuration fails.
4. **Compatibility and release:** migrate only required metadata additively; validate legacy apps/monitors, app lifecycle, permissions and optional-service outages; verify real host activation separately.

Required acceptance scenarios:

- A new static app, a data app and an app with automations all save and remain independently usable; repeat creation retries do not duplicate definitions or subscriptions.
- Four app tabs inherit access; deny/read-only rules survive rename, reorder, routes and publication. Direct URLs, forged tab IDs, MCP calls, exports, summaries and cached/prefetched data cannot bypass them. A new tab cannot accidentally reveal a previously restricted tab's data/source.
- Access review explains independent data grants; denying an app tab does not silently revoke unrelated legitimate Database access. Revoking data access still constrains all dependent app and automation operations.
- Automations lists research and platform jobs across authorized apps. UI and MCP round-trip every editable field, including database triggers, without losing configuration. Daily-to-weekly-to-monthly edits preserve receipts and show accurate next due times.
- Disable during a running job stops subsequent effects without deleting earlier saves or interrupting the app. Concurrent edits reject stale revisions. App deletion retires jobs without deleting shared records or audit history.
- Layout updates, disabled automations, pending setup, quota exhaustion, callback failures and crashed scheduling/tasks leave an open app usable with unsaved input intact in both surfaces. Task retries cannot overwrite concurrent user changes or duplicate effects.
- Research plus email has one research occurrence and an independently tracked TrialAgents email dependency; no duplicate schedules, ChatGPT email execution or rerun of completed research on delivery failure.
- Fresh install/first use, first app, reconnection, unsupported host, declined setup and existing runner all have truthful status and no duplicate or involuntary activation. One real authorized unattended cycle is required before calling the connection active.

## Decisions for review

User-confirmed direction: app-level access, optional tab granularity, first-class Automations destination, expandable user/MCP configuration parity, disabling rather than standalone deletion, shared setup independent of per-app definitions, template independence and uninterrupted app service.

Proposed defaults pending review: tabs inherit and can only narrow app access; automation management remains owner-only in this iteration. Newly inherited tabs still require publication/access-impact review for new exposure. Delegated managers, per-function/column app controls, a visual workflow designer, separate tasks per app and automatic template-triggered activation are outside this scope.
