# Trialy — Current development roadmap

Updated 11 October 2026. Development steps for the flexible shared-data/code foundation, not releases. [Scope](README.md) · [History](HISTORY.md) · [Runtime contract](docs/FRONTEND_CODE.md).

## Implemented foundation

1. **Shared data contracts.** Fixed platform records; customer-designed types, fields and relationships; optional person/organization/project/location concept metadata. No mandatory clinical ontology. Schema changes are reviewed and versioned. Table correspondence becomes stale when relevant schema/concept changes.
2. **Loss-preserving reconciliation.** Permission-filtered candidate search; preferred/original same-table identities; explicit cross-table links and reusable field correspondence; project-record links and relationship queries; dated/contextual alternative facts and withdrawal. Selected values can be propagated through current direct links after an exact review. Originals and past values remain; links do not retarget actions or recursively merge databases.
3. **Task-driven capture.** One reviewed setup can create/reuse a table, establish its task scope, add initial rows and link them to a project atomically. Inspect existing structures first. Qualifying new information produces exact proposals; ongoing writes require approval or an explicit expiring permission for one data type. Backfill is reviewed and only fills approved empty fields. ChatGPT supplies source interpretation; Trialy does not monitor conversations or crawl sources independently.
4. **Saved projects and code.** Projects/folders/components, revisions, search, moves, drag/drop, copies, archive and restore. Named assets reference exact committed document versions in PostgreSQL. Copies share references and data; restoring source clears execution authority. Moves preserve restrictions.
5. **Generated interfaces and workers.** ChatGPT-written HTML/CSS and JavaScript render/event code; read-only draft execution; bound data queries/write proposals; project records/relationships; named file text and small raster-image reads; exact saved-function invocation/status/cancel and schedules. Generic tools/workers, no new template or workflow catalogue. See runtime limitations below.
6. **Sharing and collection.** Inherited project/component human and AI restrictions. By default source requires full data access. Owners can explicitly review/release the entire source to a bound audience; required fields/files still need permission. Reviewed external form/view links expire and can be revoked. External responses remain separate immutable inputs until a human accepts an exact database addition. Links are bearer links, not verified-recipient identities.
7. **Integrity and visible control.** Exact field diffs, human approval boundary, per-value history with approval/grant evidence, fixed Changes & permissions area, reviewed reversal and safe archival. Temporary data/file previews persist across process replacement. Source bytes survive quiet extraction failures. Audit/export/recovery coverage includes the new shared-data, assets and collection state.
8. **Operational groundwork.** Existing Render web/worker/Postgres reused. Owner-only operational status includes worker heartbeat, job states and saved-original counts. Non-owner runtime-role SQL and recovery inventory are prepared. Synthetic backup/restore verifies retained original bytes and populated new state; it is not a managed Render recovery test.

These capabilities are implemented, not a claim of production acceptance. Runtime 4552f77 is live on the existing Render web/worker; private plugin 0.2.6 is published. Deployment evidence is in HISTORY.md. The previous detailed working checklist is retained in docs/archive/development-before-completion-2026-10-11.md.

## Remaining execution gates

| Step | Remaining work | Needed to proceed |
| --- | --- | --- |
| 9. Real-host acceptance | Test signup/connect return, workspace opening, generated forms, save approval, restricted sharing and recovery of a saved component in ChatGPT/web. The trusted standalone approval handoff is implemented; automatic opening and in-chat-only approval are not verified. | User's connected ChatGPT session when ready. Local browser automation was blocked by the execution environment. |
| 10. First live external provider | Connect a selected email/calendar provider; implement its scoped server adapter, authorization, exact effect review and duplicate/unknown-outcome handling. Workers cannot inherit ChatGPT connections. Electronic signatures depend on provider requirements/cost. | Choose Google Workspace or Microsoft 365 (or another provider) and supply the required authorized account/developer setup. No real-recipient test messages without instruction. |
| 11. Production recovery and credentials | Set retention, acceptable recovery point/time and region/budget; provision a separate runtime login, apply ops/runtime-role.sql, separate migration credentials; rehearse a managed backup restore into an isolated target. | Production policy/budget and database administration access. Current connected database tool is read-only. Synthetic recovery does not meet this gate. |
| 12. Customer onboarding hardening | Complete sender-backed email verification/password recovery, production operational alert delivery, and relevant deployment/validation evidence for the intended use before customer reliance. | Sender/provider configuration and the production decisions above; subsequent implementation remains. |

## Explicit boundaries, not silently completed work

- The supported frontend is a bounded HTML/CSS/JavaScript render/event contract, not unrestricted browser DOM, React/npm, canvas or remote-code hosting. Supporting those would require a further runtime project; no such compatibility is promised.
- Displaying human-only data privately inside the ChatGPT frame is not implemented. The embedded workspace uses AI-accessible content. Binding-scoped source release must be deliberate because literals in code are visible to its audience.
- Live field edits use reviewed shared-record changes; presentation edits create component revisions. Arbitrary snapshot/local-override routing remains proposed in INTERFACE_RULES.md and is not automatically inferred from generated HTML.
- Canonical identity is a set of explicit reversible claims, not automatic destructive/transitive merging. Ordinary table reads retain originals. Relationship queries follow stored customer-defined relationship fields between records linked to the same project.
- No regulatory certification, validated electronic signatures, universal multi-instance readiness or zero-loss guarantee is claimed. No patient-content scanning is added.

## Verification kept to basics

Build/type-check; focused scenarios for new setup, linked corrections, source/binding permissions, saved assets, collection acceptance and worker status; existing nearby workspace/frontend/exchange/mapping scenarios; populated synthetic recovery rehearsal. Real browser/ChatGPT acceptance and managed recovery remain separate gates. Do not expand tests just to mirror implementation.


## 20 October 2026 capability release

- [x] Typed computed/lookup fields, cross-table dependency validation and read-only enforcement.
- [x] Multiple record/user/document/table/field references with shared searchable selectors.
- [x] Current derived reads, permission and execution-scope checks, filtering/sorting/aggregation before pagination.
- [x] Field default and view-specific renderers; custom pure-code displays and graphical timeline bars.
- [x] Reviewed bulk editing, multi-reference CSV values, versioned configuration and existing authorization/audit contracts.
- [x] Synthetic CRO comparison and security regression tests.
- [ ] Trusted in-chat human approval channel: retain authenticated portal until verified.
- [ ] Real ChatGPT host acceptance of new schema/tool discovery; refresh the connector after deployment.

Precise implementation limits are recorded in docs/FIELD_CAPABILITIES.md; these are not claims of unlimited table evaluation or retrospective computed snapshots.
