# Database contract

`schema.example.json` is the executable schema for five business tables; `schema_mapping.example.json` maps logical names to DB keys and contains intentionally invalid placeholder IDs. Use only actual saved table UUIDs and authorized bindings. All fields explicitly use multiple:false. bidId/libraryId are scalar text UUID references, not native relationship fields; native arrays require an adapter. Text includes multiline content. Do not seed demo records or recreate incompatible existing tables without reviewed migration.

Map every role field for reliable completeness checks. Forms require write access to all editable fields, otherwise editing is disabled. Missing or incompatible mappings, denied reads, unknown totals and truncated pages cannot establish readiness. Read up to 800 records per role and show explicit coverage warnings. References remain stable IDs, not display names. Access is enforced by the host; layout visibility is not security.

## Decision safeguards

Answers require text, reviewer and approval date. Mandatory questions cannot be Not applicable. Required review gates need reviewer, date and evidence, including a required Finance gate. Approved proposals need narrative, source references, reviewer and date. Ready requires all mandatory answers and required gates plus an approved proposal. Submitted/Won/Lost additionally require manually recorded submission date and delivery status. This is an internal workflow checklist, not independent verification of evidence or sponsor delivery.

Editing approved content or association requires returning it to draft/pending. Revising commercial amount/currency/assumptions requires reopening Finance approval. Copying library content requires a current approved version, snapshots source and destination versions, creates Drafted answer text and clears reviewer/date. All writes are records.propose changes subject to trusted review. No external sending.

Archive snapshots the original displayed version and rejects intervening changes. Archiving a bid also requires complete readable questions/reviews/proposals and no active children. Normal edits preserve the original version and retain draft on conflict. archived=true is reversible, never deletion of history.

Currency is stored per bid. Totals group EUR/USD/GBP/CHF separately and never convert or add different currencies. Unknown/invalid amounts or currencies withhold aggregate estimates. Configuration currency is only the default for new records.
