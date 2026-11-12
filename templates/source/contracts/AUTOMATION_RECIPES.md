# Contracts 1.0.0: optional automations

None is required. The app never reads automation state and keeps working when an automation is off, failing or missing. Configure them only after the app is saved, in TrialAgents → Automations (or with `prepare_app_action` / `prepare_automation_setup`). They are recipes, not active definitions.

| # | Automation | Worker | Trigger | Reads | Output |
| --- | --- | --- | --- | --- | --- |
| 1 | Weekly contract digest | TrialAgents email | Calendar, weekly on `contracts.settings.digest_day` (1 = Monday) at 08:00 Europe/Berlin | agreements (name, status, expiry_date, counterparty_id), contracts.terms (notice_deadline, confidentiality_end, extraction_status), contracts.obligations (title, due_date, recurrence, status, verified, amount, currency), contracts.settings (reminder_days), organizations (name) | One email to the owner (and only explicitly approved registered members with app access): notice deadlines and expiries in the reminder windows, verified obligations due and overdue, CDA confidentiality ends; unverified extractions listed separately and never counted. Silent only when nothing is in the windows and the quiet policy allows it. |
| 2 | Extraction of new originals | Research on the user's own Claude or ChatGPT runner | Calendar, daily 07:00 Europe/Berlin | contracts.terms (agreement_id, document_version_id, extraction_status none), agreements, AI-readable document text | Per agreement at most one terms update (none → proposed, `source_quotes`) and new obligations with `verified: false`, exact `source_quote`, `source_page`, `source_document_version_id`; deduplicated by agreement + title + due date; writes only `contracts.terms` and `contracts.obligations` under a narrow expiring grant, or prepares them for review. Never sets `verified`, `verified_by` or `verified_on`. Originals not AI-readable or not yet extracted are reported and skipped. |

**No automation:** Overview, Obligations and CDAs show the same information on demand; extraction is requested in chat (“Read the new original and propose its terms and obligations for Contracts”), and a person verifies in the app.

Prompt example for recipe 2 is in `catalog.metadata.json` → `documentation.tasks.promptExample`.
