# Logical data and permission contract

Six declared, scalar field roles. See `schema_mapping.example.json` for all exact logical keys and example legal TrialAgents database kinds. No EHR, enrollment patient tables or site portal.

1. `projects`: per-sponsor study ID, non-patient study scope, owner, countries, deadline and **approved criteria revision**.
2. `sites`: reusable institution master with verified public site capabilities and professional PI affiliation, source URL/date. **Never copy sponsor-specific questionnaire responses or operational capacity estimates into this master.**
3. `candidates`: one project/site relationship by record ID, CRO owner, feasibility stage, sponsor-reviewed decision/rationale/date/evidence. **Unique projectId + siteId**. This relationship cannot be changed in-place after creation.
4. `criteria`: per-project requirement ID, positive weight, mandatory flag, evidence expectation and revision. Critera cannot change project identity in-place; a new study/project revision invalidates prior ranking until reconciled.
5. `responses`: one `(candidateId, criterionId)` response (reviewer/version record), dated aggregate institutional answer, source, reviewed status, numeric 1–5 rating and clarification rationale. Relations cannot change in-place. `Not applicable` requires optional criterion, reviewer and explanation.
6. `tasks`: handoff task linked to candidate and study, category, owner, date, completion evidence. Task completion cannot be saved without an evidence reference.

### Mapping and write contract

`tableMap` is a JSON object: `{role: {typeId: real_uuid, fields: {logicalKey: realDatabaseKey}, writableFields: [logicalKey]}}`. Only use IDs and fields returned by authorized TrialAgents workspace read/schema tools; don't pass demo or illustrative UUID strings. The `templateBindings` and manifest must declare exact allowed source columns, schemaVersions and write modes. App code never grants access or discovers unauthorized columns. All created/updated records use reviewed server `records.propose` and optimistic `expectedVersion` (create uses typeId). Recipients and hosts are not inferred from database professional contact fields.

The current app is a **single frontend-js access boundary**. The selected study is UI context within that boundary, **not a separate sponsor security boundary**. For distinct competing sponsors or segregated teams, provide distinct authorized app bindings/manifests and do not co-bind private data into this template. Public reusable site profiles may be shared only when existing TrialAgents database permissions permit; sponsor response, decision and private constraints never leak back into site master.

### Computation and incomplete data

Read up to 800 source records/role in bounded 100-item pages; present explicit incomplete/denied and refuse to rank. Site score uses only current-revision project criteria with positive weights. Every criterion must have a reviewed response with valid rating or a reviewer-justified optional N/A. Result 0–100 is descriptive, **not patient enrollment prediction**. No ranking if missing ratings, source, reviewer, date, mandatory criterion, criteria, study revision or complete data. All source data are safely HTML-escaped.

Archiving is reviewed `archived: true`, not irreversible delete; referential history remains. Never auto-restore on app copy or automation setup failure. Reuse stable screen/field keys through drag revisions. No invented user table, app OAuth, secret, connector key, patient identifier or login.

Set `sponsorScope` to one owner-approved sponsor label for project displays and new project-bound writes. This only guards UI choices; it **does not replace server-enforced app/table permissions**. Even with the scope set, never bind unrelated sponsor private rows into one custom-source app.

## Release safeguards

All fields explicitly multiple:false; reference IDs use scalar text. Exact kinds/options/required fields are in schema.example.json. Parent archive snapshots the original version, requires complete dependent reads and rejects active children. Reset Approved/Not applicable responses to Draft before changing their answer/rating/evidence or linked criterion definition; Draft clears reviewer/date. Incomplete reads and unknown totals withhold summaries. Missing institutions or duplicate responses cannot establish rankable evidence. Questionnaire criteria and comparison candidates are paged; every record remains accessible in the registers.
