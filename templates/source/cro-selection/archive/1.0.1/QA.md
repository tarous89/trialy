# Publication acceptance — CRO Selection 1.0.1

Replaces the uploaded 1.0.0 candidate. No existing saved app is migrated automatically.

Verified locally against the repository host, not only the uploaded standalone mocks:

- Catalog discovery/exact version, validated metadata, deterministic source/CSS packaging and build drift checks.
- Real QuickJS wrapper supplies configuration/bindings exactly once. Five screens pass the mandatory host design gate.
- Real PGlite migrations, reviewed scalar schema/parent-child records, app preview/confirmation/reopen, reviewed record creation/duplication/archive and stale edit/archive rejection.
- Missing/denied bindings, unknown totals and partial pages block changes and approval. Parent archive checks include ratings and prevent missing-evidence archives. Partial datasets display a coverage warning.
- Draft inputs persist across events and errors; all actual inputs are interactive inside the sanitized production frame with a manifest. Proposed changes remain subject to trusted confirmation.
- Immediate project switching, five-CRO comparison pagination, reviewer-specific assessment actions, duplicate assessment rejection and approval evidence gates.
- Native layout drag reorder, drawer field order, review/confirm/reload, stale layout rejection and discard without mutation.
- Production frame browser harness at 320, 390, 768, 1100 and 1440 pixels: navigation, selection, drafts, reviewed create, layout persistence and page overflow. Desktop/mobile screenshots inspected.
- Repository build/type checks and seven template/database/design regression tests. Catalog regression assertions also passed.

The browser harness uses the production frame and native layout components with real backend fixtures; it does not claim a live ChatGPT session or deployed production installation. No real emails were sent and no scheduled job was activated. Automation definitions require separate approved setup; runner readiness/delivery must be verified there. The broader shared notification regression process did not terminate in this environment and was stopped; no notification implementation was changed. Its results are not claimed as a template acceptance pass.

Known scope: bounded 200 records per role, one currency per selection, app-level permissions, no supplier portal or automated award. Native presentation settings apply to screen and drawer-field layout; fixed analytical cards remain fixed. External database edits can change evidence independently; revalidate it before relying on an earlier human approval record.
