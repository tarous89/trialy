# CRO Oversight — data model, field mapping and validation

This is a **six-role business data model**, not an app-local account model. TrialAgents' existing account, project and database permissions remain authoritative. Create/reuse saved tables only after workspace inspection and explicit review. No source data is created merely by installing the template. The supplied `schema_mapping.example.json` contains **placeholders** and logical-to-real names, not IDs to copy to a live workspace.

## Tables and fields

| Role in `tableMap` | Purpose | Required fields | Useful fields (logical names) | Scalar types and notes |
| --- | --- | --- | --- | --- |
| `projects` | CRO engagements | `name`, `provider`, `study` | `phase`, `owner`, `status`, `start`, `contractEnd`, `scope`, `source`, `notes`, `archived` | `name/provider/study` text; `status` scalar text/select (`Active`, `On hold`, `Completed`); `start/contractEnd` date; `archived` boolean |
| `tasks` | Contract work / deliverables | `name`, `projectId` | `stream`, `owner`, `baseline`, `due`, `actual`, `status`, `source`, `notes`, `archived` | `projectId` saved **project record ID** stored as scalar text UUID, never CRO name; due dates scalar date; `actual` means sponsor-accepted date; `archived` boolean |
| `assessments` | KPI observations | `name`, `projectId` | `stream`, `targetValue`, `actualValue`, `unit`, `direction`, `cutoff`, `origin`, `source`, `notes`, `archived` | Value/target scalar number; `unit` scalar select/text; `direction` `higher`/`lower`; `cutoff` date; `origin` `Verified sponsor data`, `CRO-reported`, `Manual assessment` |
| `requirements` | Operational issues | `name`, `projectId` | `severity`, `status`, `opened`, `due`, `closed`, `owner`, `action`, `source`, `notes`, `archived` | Severity `Critical`/`Major`/`Minor`; status `Open`/`Mitigating`/`Verification`/`Closed`; `closed` is **sponsor-verified closure date** |
| `activities` | Meetings and governance decisions | `name`, `projectId` | `meetingDate`, `owner`, `status`, `decision`, `actionOwner`, `due`, `source`, `notes`, `archived` | `meetingDate/due` scalar dates; status `Open`/`In progress`/`Done`; no participant or patient records |
| `reports` | Sponsor oversight narratives | `name`, `projectId` | `period`, `cutoff`, `status`, `owner`, `summary`, `evidence`, `archived` | Status `Draft`/`In review`/`Approved`; cutoff date; summary/evidence plain text referencing saved source IDs |

All source/reference URLs, notes, scope, actions, decisions, report summaries and evidence identifiers are saved as **text**, not unsupported custom URI types. Use actual existing database key conventions (often `contract_end`, `project_id`, `target_value`, etc.) and confirm permissions. The layout schema's `projects`, `tasks`, `assessments`, `requirements`, `activities`, and `reports` group IDs are stable presentation IDs, not permission grants.

## Derived measures — no invented precision

**Accepted on time**: number of work packages with status `Accepted`, valid accepted date `actual`, and `actual <= due`, divided by accepted work packages with valid `actual` and `due`. A CRO `Submitted` or `Sponsor review` item is **not accepted**. Baseline due is retained separately; a changed agreed due does not mutate the original due date automatically.

**KPI exceptions**: for `direction=higher`, below target when `actual < target`; for `direction=lower`, below target when `actual > target`. Missing actual, target or direction shows `Not measured` or `Direction needed` and is excluded from the measured/exceptions count. Never average unlike units or claim a composite score.

**Issue closure and aging**: an issue counts as sponsor-closed only when `status=Closed` and `closed` is a valid date on/before `asOf`. A `Closed` issue without date remains visibly unresolved/unverified. New reviewed updates reject closure dates before `opened` or in the future. Overdue issue actions are unresolved issues with due before the as-of date.

**Coverage**: each role's saved records are read in complete authorized pages of 100, up to a maximum verified window of 800. Missing, denied or truncated role data must be surfaced. KPI/dashboard counts that depend on a missing/partial role display `—` rather than a false number. For a larger clinical operation, configure a narrower source cohort in the platform or use a dedicated backend aggregation, not an invented client-side total.

## Record action and integration rules

- Create/Edit: prepare reviewed `records.propose` with bound table type, authorized field names and expected record version on updates; do not modify another team's source data silently.
- Duplicate: prefill an editable new record, clearing sponsor acceptance/closure where necessary; creates a **new** ID only after reviewed save. It must never duplicate a patient's data.
- Delete: confirmation, then reviewed `archived:true` update; history remains. A CRO engagement with linked live records cannot be archived until those records are reassigned/archived.
- Relationship: `projectId` must refer to a currently visible authorized saved CRO engagement. An unbound/denied parent role disables dependent record creates, and server access is still authoritative.
- App settings: native gear emits `tracker:layout`. The `templateLayoutSchema` first line, `templateConfiguration.layoutProfile` and versioned `prepare_tool_layout(customLayout)` manage screen and field order without source code or security-rule changes.

This template is for sponsor **operational** oversight only. It is not a validated CTMS, safety case system, subject database, clinical GCP control or eTMF repository. No patient identifiers, SAE case narratives, sites' protected records or new app-local user/account data may be stored.

## 1.2.1 executable contract

Use `schema.example.json` for platform-valid fields and `schema_mapping.example.json` for logical mappings. Set every mapped field to `multiple:false`. `project_id` uses `kind:text` and an actual saved engagement UUID; native relationship arrays need an explicit adapter. Choices use `select`; narrative/reference fields use `text`. Bind every mapped field with its current schema version and permitted manifest mode. Original edit/archive versions are retained. Engagement archive fails when any child source or its reference/archive fields cannot be read completely. Denied, short, unknown-total and truncated reads are incomplete, never verified zero.
