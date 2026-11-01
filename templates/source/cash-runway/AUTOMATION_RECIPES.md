# Automation recipes — Cash Runway 1.2.2

These are publisher-owned **recommendations**, never active jobs. Save the app first, inspect current `read_app_automation_guide`, `list_app_automations` and `read_automation_setup`, then prepare only accepted automation definitions with stable `authoringKey`. The default is **no automation**.

## A. Optional ChatGPT finance briefing

**Mode:** ChatGPT research/analysis on the shared TrialAgents owner/workspace runner. NOT a separate host ChatGPT Task for this app. **Suggested cadence:** monthly on the first business day after approved actuals arrive, only after owner consent; timezone Europe/Berlin, with a post-actuals-check guard. **Linked app:** saved Cash Runway. **Authoring key:** `life.cash-runway.monthly-board-briefing.v1`.

**Prompt:**

> Every month on the first business day after approved actuals are available (Europe/Berlin), check this app for a new approved actuals cutoff later than the last successfully briefed cutoff. Read complete authorized ledger, scenario and briefing pages; respect every app/database permission and the 800-row calculation limit. Check source currency, opening-balance date, forecast coverage and scenario assumptions. Recompute cash roll-forward and scenario shortfalls deterministically; compare with prior approved report. Do not create a report if no approved new data: return no_update and the most recent successful check. If new approved data exist, draft a concise board-finance briefing with exact cutoff, currency, source record IDs, finance reference URLs where present, evidence dates, gap flags, budget versus actual variances, cash reserve exposure and explicit decisions. Propose ONE new Draft briefing using a stable dedup key of app ID + cutoff + report type; do not change or delete actuals. Save only under the owner's existing approved write scope or ask for exact review; reconcile the committed write receipt and report ID before completing. A partial, denied, duplicate or unapproved run must not trigger an email. ChatGPT must not send email.

**Sources:** bound approved ledger/scenarios/briefings, app data access, finance references already saved. No bank, emails, patient records, external search or mandatory connectors. **Output:** one new Draft briefing referencing exact cutoff, record IDs, source links, assumptions and gaps. Use a stable deduplication key `(appId, actualsCutoff, 'monthly-finance')`. A report is not approved until the owner's reviewed database save receipt succeeds. Never invent amounts. No new data: `no_update` and last successful check, with no write, no email. Partial, failed or denied result does not advance coverage.

## B. Dependent TrialAgents email, not a ChatGPT email

**Mode:** TrialAgents Email action. **Authoring key:** `life.cash-runway.email.after-briefing.v1`. **Trigger:** manually linked to the verified successful new briefing completion, no independent schedule. **Recipients:** app owner by default, plus separately selected registered teammates with current app/data permission. Never use the finance vendor/contact email fields. **Send policy:** at most as often as the backend permits; the reviewed rule must not bypass one-app-recipient-per-hour and 15-account-recipient-deliveries-per-24h budgets. No digest/report settings in app.

**Exact action guidance:**

> After a verified successful Cash Runway monthly briefing research run has committed a new reviewed briefing record, email the app owner and separately approved registered team members with current access only. Subject: Cash Runway finance briefing ready — {verified_cutoff}. Body: The {verified_cutoff} briefing is available in TrialAgents. A reviewed record was saved at {server_update_completed_at_utc}; {saved_changes} record(s) committed. {one_sentence_verified_summary}. Open {trusted_current_app_link}. Do not send if saved_changes=0, no_update, pending review, denied/failed/partial work, stale access, missing validated completion timestamp, or unknown result. Use TrialAgents email action executor with manual after-success dependency; no independent email calendar schedule and never an email/ChatGPT connector from the template.

The backend inserts validated completed-at UTC, committed change count, summary and current app URL. No placeholders from an untrusted record get authority to send. A delivery outage must never rerun successful ChatGPT research or re-save records. Store email result in Logs.

## C. No automation (default)

> Create the Cash Runway using reviewed finance tables and no automations. Users enter opening balance, actuals, budgets and scenario drivers; saved data and all six screens work without background services, external connectors or scheduled email.

## D. Alternative standalone review email (do not combine with B)

For a finance handoff without ChatGPT, prepare ONE owner-approved TrialAgents email rule based on a trusted `briefings.status: In review → Approved` transition, subject `Cash Runway briefing approved — {period}`, message `Your approved finance briefing for {period} is available: {trusted_current_app_link}`. Only valid newly committed status transitions notify. Do not also configure B for the same approved report. No polling or report-generation job is required.

## Safe management

All definitions remain visible when Disabled. Edit/Enable/Disable and next eligible schedule appear on the full-width platform Automations page, never inside app source. Verify runner subscription readiness separately from `enabled`; status/outcome belongs in Logs. Copying the app creates no active copied automation; archiving suspends work, restoring does not silently resume. Do not expose technical fields or keys in the end-user form.

Use the current scheduling schema to encode monthly eligibility and an approved actuals cutoff guard; a business-day phrase is not itself a supported calendar expression. Exact dates govern cash. Only a reviewed month-end cutoff permits monthly forecast/runway statements. Never infer financial approval merely from a successful draft-record save.
