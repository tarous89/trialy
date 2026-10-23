# Shared data, source-of-truth, approvals and integrations

Read before generating domain content, data bindings, permission changes, approval interactions or automations. Do not build functionality that the connected platform has not verified. Generic architecture, not a mandatory clinical schema.

## 1. Universal model

```text
Authorized workspace
 ├─ shared entities (people, organizations, assets, projects, documents as needed)
 ├─ context-specific records / relationships (engagements, work items, proposals, roles)
 ├─ sources and dated observations
 ├─ saved tracker/form/visualization components (bindings and configurations)
 ├─ saved functions/schedules (scoped access and explicit grants)
 ├─ access policies and actor identity
 └─ append-only history / evidence of approvals and actions
```

The **underlying database**, not an HTML table, is the source of truth. Views use stable binding IDs and read current permitted values. A person may be an investigator in one project and a consultant in another; don't create duplicate global people or concatenate project roles onto their name. A vendor may submit proposals for several projects with different prices, suitability and selection outcomes. Facts depending on one relationship belong to that relationship.

**Identity vs label:** canonical field ID stays fixed; displayed field name is a per-view presentation setting. Reorder/show/hide/view filters never alter ID, type, authorization or stored meaning. A global-name edit must be a reviewed data-field update; a column-label edit is a component configuration change. Don't silently convert a text field to a relation or computed code field through a display selector.

**One place to write:** table inline edit, record drawer, collection form and ChatGPT conversation can all propose a change to the SAME record. They must not save competing copies in local component state. All connected trackers and dashboards then read the updated record once committed. Temporary in-browser edit state is not a second database.

## 2. Shape data for the new task, not a forced ontology

Start with target outcome and approved inclusion criteria. Inspect current schemas/records and reuse permitted structures before adding types. A useful domain-specific structure might include:

- `entity`: e.g. Organization, Person, Project/Work Package, Document; may reuse common concepts.
- `participation`: link between entities with contextual role/dates/approval/status.
- `activity`: milestone, action, decision, communication reference, review event as required by task.
- `evidence`: current source URL/provider ID/version/observed time and alternative claims.
- `presentation`: tabs, displayed fields, filters, column widths/heights, optional derived formulas and summary views.

No fixed set of these objects is mandatory. For a simple checklist, create fewer. Prefer sparse/extensible fields to a mandatory ten-page intake wizard. Track missing/unknown values explicitly.

**Record versioning:** changes have actor, timestamp, previous/current values, relevant source, authorization and item version where available. Preserve originals and competing observations for correction and audit. Never overwrite or delete historical source files just because the extracted text changed or an entity was matched.

**Cross-tracker linkage:** a work package may belong to several overview contexts. Lookups and aggregations should use explicit stable relationships and permission-filtered queries. Do not assume a named relation means a clinically meaningful dependency; save verified/planned dependency edges separately.

## 3. Live, pending, calculated and historical states

| State | What it means | UI behavior |
| --- | --- | --- |
| New/draft | A proposed row, form, schema or component has not been committed | Editable draft/preview; clearly unsaved |
| Pending edit | A bound field changed locally | Green background, Save edits / Ignore edits; proposed exact diff |
| Committed | Server accepted the exact permitted revision | Update bound displays, show accurate saved state |
| Derived | Computed from current permitted fields/formula | Usually read-only; inspect computation/input, don't overwrite output |
| Snapshot | Saved historic report or dated status | Mark snapshot time/version; avoid quietly changing past report |
| Source original | Immutable document/received submission or external reference | Inspect evidence or propose corrected interpretation, don't silently rewrite original |
| Unknown/missing | No reliable information | Show `—`, Unknown or Pending; never infer negative outcome or zero |

**Action semantics:** draft email != sent email; offer != accepted contract; quoted amount != contracted amount != invoiced amount != paid amount; planned finish != actual finish; document received != approved; proposed site != activated; proposed vendor != qualified. For every action decide whether it was observed, inferred, planned or formally approved.

### Save behavior

- **Data writes:** exact preview of before/after, current schema+record version, destination and permission. Require human confirmation by default. A documented narrow and revocable standing authorization may replace repeated confirmation only for its explicitly scoped type/fields; never infer a general permission from one Save.
- **Schema changes:** explicit structural change review and approval even when a user has a record-edit grant. Avoid silent data migrations or type changes.
- **Component changes:** versioned saved tracker code/configuration and bindings; don't confuse with business data revisions.
- **Source corrections / matching:** show original, preferred interpretation and alternatives; reversible matching with evidence. A tentative alias doesn't grant communication or access to an additional contact.
- **Share/access changes:** owner-authorized grants with hierarchy, audit, revocation and protection of source data. CSS visibility controls alone are insufficient.
- **External effects:** require separate authorization for messages, calendar actions, payments, submissions, signatures and exports to third parties. A data edit permission never grants outside communication.

## 4. Source field and documents

Every evidentiary row should offer a **Source** field with an appropriate display label. Default to linking existing files in provider storage (Google Drive, SharePoint, OneDrive etc.), source URLs, stable document IDs and/or concise text/evidence notes. For a stable connected source prefer provider ID + version + last verified time + friendly URL, not just a mutable web link.

- A plain URL is a pointer, not evidence the file is accessible or was read. Do not claim contents/permissions from a URL alone.
- Storage providers retain their own access controls; Trialy must re-check user permissions and must not expose restricted URLs through table filters, aggregates or tooltip metadata.
- Store an immutable accepted copy in Trialy only when explicitly requested, needed for provenance, or supported by authorized project/document policy. The template must not assume every Source is uploaded.
- Represent multiple sources as link/reference records if needed; don't concatenate long URLs in one dense column. Link label should be human-readable; the Details panel can hold richer provenance.
- Failures to fetch, permissions to read, missing/expired links or source version changes must appear as missing/unverified rather than proven facts.

## 5. Different types of components over one data foundation

### Tracker
Editable bound views, one or more tabs, table and record details, user-defined presentation settings, actions/next steps, optionally a derived Overview. It is not an independent database.

### Form
A targeted data collection interface. The response is a staged submission with a record identity and related destination. For external contributions, **receive -> inspect/verify -> approve/accept -> commit -> refresh views**. A form for an existing record proposes edits rather than accidentally creating duplicates. Share links need expiry/revocation and scoped inputs.

### Visualization
A read-only presentation of authorized committed data: progress, overview stats, tables, timelines, comparisons and legitimate charts. Every metric needs a source, filter, calculation (and currency/units/as-of if relevant). Retain distinction between live and versioned snapshot. Aggregate only what user could read at the field level.

### Automation
An authorized scheduled or event-triggered function. Inputs: a timer, approved record change, accepted form result or explicit user event. Outputs: either a report/reminder proposal, a reviewed database change, or a separately authorized external action. Include idempotency/retry, failures, no self-trigger loops and cancellation. Avoid autonomous contacting, regulated submissions, money transfers or sharing without separate permission.

**Status of Trialy's documented platform as of 20 Oct 2026:** PostgreSQL shared records, typed fields/links, source/provenance, audited write proposals, project/component saving, generated bounded JS frontend, form collection, internal functions and schedules exist at foundation level. External email/calendar/Drive/SharePoint worker adapters, trusted in-ChatGPT human approval and full real-host acceptance were still pending. Check current repo/runtime rather than assuming these statuses remain true in future; the demo must never imply they're complete just because UI controls render.

## 6. Access precedence and hidden vs restricted

Example resolver pseudocode:

```text
function effective(user, tab, field) {
  if (!tenantAllows(user) || !workspaceAllows(user) ||
      !dataTypeAllows(user, field) || !projectAllows(user) ||
      !componentAllows(user) || !sourceAllows(user, field)) return 'Restricted';
  let base = user.baseRole === 'Editor' || user.baseRole === 'Owner'
      ? 'Can edit' : user.baseRole === 'Viewer' ? 'Can view' : 'Restricted';
  let tabAccess = explicitTabOverride(user, tab) ?? base;
  let fieldAccess = explicitColumnOverride(user, tab, field) ?? tabAccess;
  return authorizedCeiling(user, field, fieldAccess);
}
```

The resolver diagram is conceptual, not a claim that underlying Trialy API accepts these names. **Resolve on backend reads and writes**; don't trust caller-provided roles, filters or field lists. Human and AI permissions are separate; reading from a connected external app does not automatically grant worker access to the same app. Keep owner privileges server verified.

Use **Custom** as a derived displayed master role when a person has one or more differing explicit overrides. Preserve their previous base role internally so defaults continue to resolve consistently. Show effective per-cell outcomes (“Can edit / Can view / Restricted”), not “Inherit role” or duplicate “Custom” labels. See [UI_INTERACTION_CONTRACT.md](UI_INTERACTION_CONTRACT.md) for exact behavior and theme colors.

The **Hidden** setting in Layout simply removes a field from that view. Do not treat hidden as a confidentiality mechanism. A restricted user must not be able to recover restricted data by changing column visibility, inspecting source code, opening Details, sorting a hidden field or querying aggregate results.

## 7. Capabilities and failure reporting

If a requested behavior is unavailable in an actual host/runtime, state the limitation and offer a faithful supported implementation. For standalone HTML demos, local in-memory Add/Edit/Save, UI-only Access settings and mock data are acceptable only if truthfully described; never say saved to database. For production, do not invent API endpoints, connector permissions, synchronization or success confirmations.

The currently approved UI reference is intentionally not a production backend: `assets/approved-theme2-reference.html` demonstrates behavior with fictional local data. Adapt **UI behavior and visual structure** from it, replace all domain data, and wire actual data transactions through the verified host interface when available.
