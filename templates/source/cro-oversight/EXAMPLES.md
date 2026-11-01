# ChatGPT examples — CRO Oversight

**Example 1 — Create the app without automations**

> Build a CRO Oversight app for a small biotech with two outsourced clinical programs. Use the approved sponsor engagements, deliverables, KPI observations and operational issues we already have in TrialAgents. Make the six screens. Do not seed example records, create new logins, set up an email campaign, or schedule tasks.

**Expected:** one catalog-version-pinned app, six connected authorized roles when available, an engagement selector, new engagement form if authorized, no invented data and no automations.

**Example 2 — Record a CRO contract deliverable**

> Add the monitoring report as a work package for Northbridge Clinical. Keep the baseline date, latest agreed due date, CRO owner and evidence link separate. Mark it Submitted, not Accepted, until we record our sponsor acceptance date.

**Expected:** reviewed work-package create in the currently selected engagement; proper source fields, no premature on-time credit, preserved baseline.

**Example 3 — Compare measurements without fabricated statistics**

> Show our monitoring report timeliness target vs actual and whether it improved from the previous measured period. Identify which data came from the CRO and which our sponsor team verified.

**Expected:** target/actual units, direction and dates shown; a source record and only an evidence-supported comparison. If the earlier measurement is unavailable, report it as missing.

**Example 4 — Close an operational issue carefully**

> The CRO says the finding is resolved. Move the issue to Verification, keep the corrective action and next due date. Only mark it Closed after our sponsor team enters the signed verification date.

**Expected:** issue remains unresolved until trusted sponsor closure is dated; reviewed `update_record` and expectedVersion, no extra safety case data.

**Example 5 — Change the layout**

> Under Settings, move Issues before Scorecard, and put Agreed Due immediately after Deliverable in the Work Packages table. Save the layout for the app without changing its data or access rules.

**Expected:** native `tracker:layout` editor, drag/touch/keyboard reorder, reviewed `customLayout` with stable screen/field keys, persisted after reopen. HTML preview itself does not claim to perform trusted layout commits.

**Example 6 — Weekly ChatGPT and dependent email, only if requested**

> Once I approve the CRO Oversight app, prepare a weekly sponsor governance summary in ChatGPT each Monday. Draft a report with evidence and due owners. Notify me by TrialAgents email only when a new draft report is actually saved and verified; do not notify on no change.

**Expected:** a separately reviewed ChatGPT monitoring definition with exact app access, sources, cutoff and idempotency, followed by independently approved *dependent* TrialAgents email; only after saved report ID and server receipt. No app-local login, no second ChatGPT scheduled task, no ChatGPT-send email, no self-activation from metadata. If setup is unavailable, the app still opens and works normally.
