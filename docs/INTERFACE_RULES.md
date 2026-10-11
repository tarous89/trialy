# Trialy — Interface behavior register

Updated 11 October 2026. Applies to standalone and embedded workspaces and ChatGPT-generated components. This records product decisions and open recommendations; it does not claim runtime implementation.

## Agreed direction

1. **Editable by default:** users should be able to correct information and change presentation, unless permissions, an explicit read-only design, a historical snapshot or the nature of a derived value prevents direct editing. An editable UI never grants database authority. Exact save destinations/overrides are still the recommendation below, not approved behavior.
2. **Details open separately:** use a dedicated detail page for substantial content, or a modal for a short inspection/edit. Do not append details below the current content and turn the workspace into an increasingly long scrolling page. Preserve the originating view's filters, selection and scroll position when returning. Apply this to both app and workspace.
3. **Source visibility:** offer authorized users a way to inspect the underlying record and available source evidence. Never disclose restricted source details through provenance links.

## Recommended edit policy — proposed, awaiting user feedback

Route edits by what the value represents, not by whether the author entered it in this chat session.

| Value | Proposed edit behavior | Persistence target |
| --- | --- | --- |
| Live stored field (including an empty bound field) | Inline edit with a clear shared-data save destination; show source/details on request | New revision of the underlying record, reflected by other live views of that field |
| Presentation title, label, formatting or explanatory text | Edit locally | Component configuration revision; no change to the entity fact |
| Calculated field, aggregate or chart result | Show calculation and offer to edit inputs or calculation; no silent overwrite of the result | Input record or component calculation revision as applicable |
| Historical snapshot, source quote or original document | View original; offer an explicit corrected observation/new revision or a labeled editable copy | Preserve original and historical snapshot |
| Project-specific value | Edit its contextual record | Project relationship/activity; do not overwrite the shared person's or organization's fact |
| Unbound new input | Establish whether it is presentation content or new structured data before saving | Component configuration or an explicit field/record binding; never silently discard it |

Before saving, make the target clear with concise language such as “Update shared record” or “Save this view.” Do not ask the same broad question for every cell if its binding already determines the answer. The user's explicit Save can confirm a manual edit; typing into a field alone is not an authoritative commit. Apply the superseding WRITE_AUTHORIZATION.md contract: visible exact review/approval by default; only explicit longer-term data-type permission can waive repeat clicks. Every committed field change must remain inspectable with its authorization and a safe reversal action.

Avoid silent per-view overrides of shared facts. If an override is needed later, make it explicit and visibly labeled, retain its source relationship and define how source updates affect it. Do not add automatic fallback copies as a default editing strategy.

A same-session edit is not inherently safe and a cross-session edit is not inherently a new interpretation. Use saved/draft state, field binding, current revision and permissions instead. Draft edits remain drafts; committed edits create history even seconds after the initial save. Stale changes must not overwrite concurrent work.

## Implementation implications

- Component bindings must declare value origin, record/field or relationship target, calculation, live/snapshot state and editability. Enforce writes in the backend, not just generated UI.
- Permission-filter source navigation, confirmation summaries and shared-impact indicators; do not reveal hidden projects that also reference a record.
- Reuse the commit/audit path and provide visible pending/saved state, validation and retryable unsaved edits on failure. Correcting an extracted value preserves its original source observation.
- Include basic acceptance checks for inline edit destinations, calculated/snapshot protection, source permissions and returning from detail pages. No broad cosmetic test expansion.

No editing-policy runtime change is authorized or claimed by this document update. Resolve the proposed semantics before treating them as final implementation requirements.

## Implemented interface subset — 11 October 2026

For `trialy-ui-v1` tables, inline edits explicitly review/save to the shared database record with optimistic concurrency and audit. Configuration edits only change the component. Formula fields and read-only actors cannot edit cells. No silent local value overrides. Other proposed editing semantics remain pending. Component sharing/history/configuration use separate detail screens.

## Superseding approval and history requirement — 11 October 2026

Follow [WRITE_AUTHORIZATION.md](WRITE_AUTHORIZATION.md). Provide a fixed Changes and permissions area in both surfaces, with Approve changes controls, field-level before/after values and the applicable permission. Showing an editable field does not authorize silent persistence. This interface and the new enforcement contract are planned, not yet deployed.
