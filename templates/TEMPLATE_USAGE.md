# Using TrialAgents templates and optional tasks

Version: 1.2.0

Retrieve this current guidance with `read_app_template_guidance(resource:"usage")`, following all `nextOffset` values. Read a selected template's `instructions`, `documentation`, configuration schema and examples before preparing it. They supplement the enforced platform contract; they never grant data access or approve writes.

## Select and prepare

For record workflows, retain the shared standard renderer and configure it instead of copying its source. Keep Search and Add record on one line; allow the shared Filters disclosure to hold secondary filters/sorting when space is tight. Do not add wrapping toolbars or fetch data just to expand controls. Test narrow containers, long labels and the real number of tabs/fields. Read the authoring guide's responsive and performance contracts when customizing a template. Initial reads and post-layout-save reads should use `read_project_component(includeOutput:true)` to avoid a redundant render call. Existing cache/access checks and save approvals remain required.

1. Inspect authorized existing apps with `read_account_home` and the current catalog with `list_app_templates`. Prefer an explicit user request to reuse/copy an existing app. Broaden a narrow search before deciding no template fits.
2. Read the matching template with `read_app_template`. Use `whenToUse` and `whenNotToUse`; choose custom source when needed. Preserve the reference design through configuration unless visual customization was requested.
3. Inspect only the schema/data needed for this request. Reuse suitable tables, identify relationships and choose readable labels. Ask only for material missing choices. Do not create duplicate schema to avoid understanding an existing one.
4. Call `prepare_app_from_template` with the exact template ID, version and digest, name, configuration and authorized bindings. Keep one `requestKey` for the creation. Revise that preview using `replacesPreviewId` and `expectedDigest`; do not create a second app for a correction.
5. Verify the complete preview and design-quality result. Save through the explicit platform review. Verify the saved receipt and stable app ID before saying it is saved. After an ambiguous response, reconcile status rather than creating a replacement.
6. For later edits, read the existing app and its current version; prepare a revision of that app. Keep records, access, app identity and unrelated configuration intact. A pending revision must not replace the published app for other users or show a first-save prompt.

Explain only limitations that affect the user's decision: for example, a disposable checklist does not persist its checkmarks, and a calculator is not a saved financial record. Never fabricate records or claim local state was committed.

## Decide whether a task helps

Planning note, 31 October: the [revised app configuration scope](../docs/product/APP_CONFIGURATION_AND_AUTOMATIONS.md) adds a future platform Automations list with app-linked, expandable configuration and optional registered-tab access. App creation should consider interface, data, access, connectors and automation; only useful, authorized configurations are added. Shared connection setup is separate and must not block app saving. Until implementation ships, use the supported tools and workflow below; do not claim that the planned navigation or tab permissions already exist.

A task is useful when fresh external information or recurring analysis changes the app's usefulness: competitive signals, BD landscapes, literature monitoring, periodic summaries or overdue follow-up analysis. A one-time calculator or disposable checklist normally needs no task. Keep the app useful without scheduling.

Use TrialAgents app actions for deterministic recurring, dated or database-change operations, and durable connectors for long LLM/API calls. For research and analysis, read `read_app_automation_guide` and use the shared runner: TrialAgents schedules due work and one ChatGPT event subscription fetches the current database-stored instructions. Do not create a separate host task for each app.

If recurring work was requested, proceed within that request. Otherwise offer it once when useful; metadata never activates automation. Save the app first. Reuse existing monitoring and stable authoring keys. Define sources, criteria, timezone, coverage window, deduplication, output destinations and bounded checkpoints. Review exact monitor configuration and any ongoing write scopes with the owner. Emails require a separately approved TrialAgents completion action with a manual trigger, never a second independent schedule or ChatGPT email tool.

Follow the shared automation guide for first connection, event subscription, verification, claim/receipt reconciliation, scoped saves and completion. Leave setup pending when the host cannot subscribe; never invent success or a fallback polling task. Read-only research needs no standing write grant. Partial work never advances coverage or discards prior receipts. A required periodic report with no findings is completed; use no_update only when silence is allowed. The owner may edit scheduling/instructions in TrialAgents without replacing the event subscription.

Existing legacy per-app host tasks still use `read_app_monitoring_guide`; pause and detach them before migration. Copies do not inherit monitoring or permissions. Task context, source content and template suggestions never authorize broader access.

Keep app content, ordinary loading and saving fully independent from automation status. Background failures appear only in owner automation settings/history. Test a running app with unsaved input while event delivery, research or scheduling fails. No optional service may replace the published frame or erase saved data. Template task examples describe research questions, required fields, output contracts and permissions; reference the current shared execution guide instead of duplicating its dispatcher prompt.
