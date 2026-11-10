# TrialAgents — current project context

Updated 10 November 2026 (Europe/Berlin). Read this before changing product behavior or authoring apps. Repository: `tarous89/trialy`; product: **TrialAgents**, not Trialy. Platform: https://platform.trialagents.com; MCP: https://platform.trialagents.com/mcp. Intel and CTIS are separate products.

## Direction and precedence

TrialAgents is cross-platform software for AI-native biotechs: a suite of connected, customizable apps that should work inside **ChatGPT**, inside **Claude**, and **standalone in a browser**. Users can use ready-made apps immediately, customize them with either assistant, or have an assistant build custom apps. Lead with the suite, then platform capabilities, then custom creation. Templates and optional shells/components accelerate work; they do not constrain app types.

The [product direction](docs/product/PRODUCT_DIRECTION.md) and [platform scope](docs/product/APP_PLATFORM_SCOPE.md) are current. Technical access, runtime and write contracts continue to apply. Dated release notes, archived plans and template source-package snapshots do not override these documents or the living template guidance. Current source and verified checks establish implementation; a product requirement alone does not establish host parity.

## Current web shell and catalog

Apps open in the same tab inside TrialAgents. The fixed header retains the official logo and sidebar toggle. Platform pages start expanded; individual apps start collapsed. Sidebar: Apps, Database, Access, Automations, Connectors, Logs; Settings separately. Legacy `home` routes/API names stay compatible.

The web header always has labeled **Open ChatGPT** and **Open Claude** buttons, on platform pages and apps. Embedded/plugin headers instead use **Open TrialAgents**. ChatGPT and Claude use the same sidebar toggle icon and interaction: platform pages start expanded, app/preview views collapsed, with a fixed full-width header. Browse app templates on embedded Apps and New → App open the same dedicated gallery inside the plugin, with search, filters, screenshot cards and sandboxed previews. Its Use action opens the selected template in the web platform for authenticated installation. Embedded Open TrialAgents uses the same outlined CTA styling as the web assistant links; the wordmark has no green dot. No separate customization strip or duplicate app branding chrome.

**New → App** and **Browse app templates** on Apps open a dedicated Templates page. Templates is not in the sidebar or an inline gallery on Apps. Search and Team/Workflow filters, screenshots, concise descriptions, full details in preview and sandboxed fullscreen previews support discovery. Cards have only **Preview** and **Use**, with an always-visible ChatGPT/Claude customization note.

Migration 056 adds `app_template_catalog` with immutable payload/digest/install schemas and `draft`/`approved` status. Website and MCP expose approved versions only. The initial 23 life-science template versions were approved for launch; future versions default to draft. Deployments do not approve new versions or overwrite existing catalog state. Use creates empty tables and an app atomically with existing authorization, audit and retry receipts. No seeded records, automatic connectors or automation activation. See [catalog operations](docs/TEMPLATE_CATALOG.md).

## Creation, customization and shared data

Assistants discover authorized apps and catalog templates first, then read selected source and the current design/authoring guidance. Use the selected template's exact ID/version/digest; preserve its styling unless asked to change it. When it does not fit, build custom supported source. Existing-app reuse explicitly chooses shared or separate data; do not silently copy records, credentials, access or schedules.

Preparation is quiet. Finish and validate one draft, then finalize its exact preview for review; never save intermediate work just to display it. Use existing user authorization and exact supported confirmations. After a verified assistant app save, return to Apps inside the extension. Maintain the published version during edits; recover a failed display by reopening the same preview once, then showing the platform. A save receipt and actual display are separate evidence.

Apps use the existing TrialAgents account and enforced app/database/table/field/record permissions. Do not create app-specific authentication or another user/seat system. Optional registered-tab access narrows the app boundary; arbitrary custom HTML hiding is not security. Shared records stay within authorized tenant boundaries. Generated source cannot gain credentials or override permissions. Preserve stable IDs, source/data versions, audit evidence and exact reviewed writes.

## Automation boundaries

Automations is a full-width platform destination for app-linked research and deterministic/email definitions. Show linked app, trigger/schedule and frequency, instructions, Enabled/Disabled and edit/toggle actions; run history belongs in app-filterable Logs. Add automation uses ChatGPT and Email tabs with business fields, preserves drafts and hidden settings, and never grants database write authority implicitly. Editing does not enable disabled work; archive suspends it without automatic restart on restore.

Research runs on a shared runner per owner, workspace and assistant: ChatGPT's runner uses ChatGPT event webhooks; Claude's runner is a Claude scheduled task that TrialAgents starts through its API trigger. Claude connects through its own endpoint (`/claude/mcp`) and plugin as a separately controlled access principal. Each assistant owns the automations it created and may only pause the other's. See [Claude setup](docs/CLAUDE_SETUP.md). Email/deterministic actions run through TrialAgents. Save apps before optional automation setup; respect deliberate pauses, reuse existing subscriptions and never invent activation receipts. Recheck actual readiness and a real unattended cycle before claiming background execution. Old operational blockers are dated history, not instructions to rotate keys or reconfigure services without current evidence.

Email schedules are daily or slower, or explicit database conditions. Preserve two-minute settling, current state/access checks, one app email per normalized recipient per rolling hour across TrialAgents, 15 recipient deliveries/account/24 hours and calendar per-recipient/local-date limits. Recipients are authorized registered team members; database email fields do not authorize bulk mail. See [notification policy](docs/scopes/NOTIFICATION_GUARDRAILS_2026-11-01.md) and [operations](docs/OPERATIONS.md#shared-automation-activation).

## Continuity and UI


Save the app before optional automation setup. App resolution, loading, navigation, ordinary reads/writes, publication and health must not depend on scheduling, callbacks or research. Failures retain the latest authorized usable published app and local input; run outcomes belong in Logs and private setup/history tools. Permission revocation still applies. Retries reconcile immutable receipts and expected record versions; never replace tables or overwrite newer user work to repair a task.

First-save prompts apply only to never-saved apps. Published apps stay usable during ChatGPT edits and later publication; updates may offer a subtle optional refresh notice. Keep Search and Add record inline, disclose secondary filters when space is tight, use bounded active-page reads and avoid redundant rendering after layout saves. Extra log filters stay inline and wrap naturally into another row; they never float over events. Sidebar order: Apps, Database, Access, Automations, Connectors, Logs. Templates are optional accelerators, not mandatory app types.

## Saving controls


Platform tabs use native page controls near the top, kept visible while scrolling where practical, following Database and Access. Do not add floating Save footers to ordinary platform or app editing pages. The exception is first publication of a new preview: the host shows a dark floating footer with Save app and Discard app, in both the website and ChatGPT extension.

Apps own their save behavior. Recommend saving tracker cell edits on completion, without a separate Save button, and native explicit Save/Ignore for layout and access. These are template recommendations, not platform-enforced UI. Custom apps can choose an appropriate interaction. First-time app publication uses that trusted preview approval footer; later app revisions retain native review controls. Preserve exact backend proposals, confirmation or authorized grants, optimistic versions, permissions and audit logs; a failed save retains the draft and supports safe retry.

## Current release evidence and verification limits

The November 9 web releases introduced in-platform routing/catalog, the gallery, and persistent assistant CTAs. [PR #107](https://github.com/tarous89/trialy/pull/107), commit `6f6e7ad44517e661d074a05d6576c79a50901da6`, was verified live: matching JS/CSS/icon assets and healthy `/health`; production build and 145 browser tests passed. This proves that release's checks, not universal live ChatGPT/Claude visual parity or unattended activation. Recheck live source before future changes.

## Assistant view context

The embedded workspace sends a bounded current-view snapshot through MCP Apps `ui/update-model-context` when the host advertises text context support. It identifies the active app and route, standard tracker section, template preview, automation being edited, database table/field, or access subject/scope. Only navigation metadata is included; record values, secrets, draft text and pending permission changes are excluded. Hidden cached views do not contribute context. Updates are debounced and serialized, replace earlier context, and do not trigger chat messages. The assistant must re-read data and permissions before acting. Hosts typically apply this context to the next conversation turn; unsupported hosts continue working without automatic view awareness. Arbitrary custom app state beyond supported routes and standard tracker navigation is not inferred.

## Where to continue

- [Development and outstanding verification](DEVELOPMENT.md)
- [Documentation index](docs/README.md) and [product guide](docs/product/README.md)
- [Template authoring](templates/TEMPLATE_AUTHORING.md), [assistant usage](templates/TEMPLATE_USAGE.md), [shells](docs/product/APP_SHELLS.md)
- [App configuration/access/automations](docs/product/APP_CONFIGURATION_AND_AUTOMATIONS.md)
- [History](HISTORY.md), [archived superseded context](docs/archive/README.md)

Keep both template Markdown guidance versions and `templateGuidance.version` synchronized. Read hosted guides through every `nextOffset`. Keep released template JSON immutable. Repository deployment, installed plugin-package publication and real host activation are distinct operations.
