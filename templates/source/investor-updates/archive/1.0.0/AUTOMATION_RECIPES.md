# Investor Updates 1.0.0 — automations

Declared in `catalog.metadata.json` under the app automations scope (RECOMMENDED_AUTOMATIONS.md, E1–E7), following Fundraise 2.0.0 and Partnerships 2.2.0. The app stores **no schedules, recipients or on/off switches**: they live on the platform automations (Automations in the sidebar). Settings names them and where they live.

## Install recommendations (on by default in Add app)

| Key | Name | Trigger | Worker | Saves / sends |
|---|---|---|---|---|
| `meeting_before_draft` | Agenda and pre-read draft | Record date `investorupdates.meetings.meeting_date`, offset −7 days (−10,080 min), 08:00 Europe/Berlin | Research on the owner's Claude or ChatGPT runner, brief `meeting_brief` | Creates one `investorupdates.updates` row (format `meeting_before`, `meeting_id`, status `in_review`); create only. The brief marks meetings that are cancelled, held, past or already have a before part, and research saves nothing (recipes cannot filter by status). |
| `ready_for_review` | Ready for review | Database: `investorupdates.updates`, created/updated, `status` becomes `in_review` | Email | To the owner, with `title`, `format`, `period`. Every scheduled draft, meeting draft and chat draft created in review triggers it once. |
| `new_response` | New question or offer of help | Database: `investorupdates.responses` created | Email | To the owner, with `ask_key` (`question` = a question), `ask_text`, `message`, `responded_on`. |
| `weekly_digest` | Weekly digest | Calendar weekly, Monday 08:00 Europe/Berlin | Email, summary `updates_digest` (E7, read only) | Email updates due or overdue, meetings in the next 21 days with their before status, meetings held without a recap, drafts waiting, unanswered questions, open offers of help. Nothing to report sends nothing (`nonEmpty:false`). |

## App feature (per email plan)

| Key | Name | Context | Trigger | Saves |
|---|---|---|---|---|
| `scheduled_draft` | Scheduled email update | `investorupdates.plans` (one per plan) | Record date `plans.next_period_end` + 3 days (4,320 min), 08:00 Europe/Berlin | Research with brief `plan_brief`; one `updates` row for the period, status `in_review`, create only; dedup by plan + period (the brief says skip, and the app refuses a second draft for the same plan and period). |

Set up from **Automations → From app features → Scheduled email update**, choosing the plan, or in Claude/ChatGPT: `read_app_automation_features` → `read_app_automation_feature_contexts` → `prepare_app_automation_feature` (key `scheduled_draft`, the plan as context) → the exact `confirm_app_service_review` that a person approves. Repeat setup returns the existing definition. A calendar trigger cannot carry a record, so the feature runs a set number of days after `plans.next_period_end`, which the app computes from the cadence when the plan is saved and advances when the period is sent. Change the offset in the automation; the platform automation is authoritative for timing.

## Read and write scope

- Read bindings use `fields:"all"` (E6), so fields added later need no re-approval. They carry no `exceptFields`: the platform refuses a brief helper whose table scope is wider than the research's read bindings (`brief_scope`), and both research briefs read these tables. Confidentiality is kept by the helpers, which pass no email addresses, exchange IDs, email texts or response owners to the runner.
- Write binding: `investorupdates.updates`, explicit fields (`format, plan_id, meeting_id, kind, period, title, category_ids, status, blocks, facts, asks, document_ids, drafted_by, drafted_on`), `allowCreate:true`, `allowUpdate:false`. Research never updates, approves, sends or writes another table.
- Draft sources (Runway, Programs, Fundraise, Partnerships, Contracts, Data Room, Bio Radars, documents) are read under the owner's TrialAgents access, only those the plan allows; every number is a fact with its source.

## Not automations

Sending an update or meeting part, answers to questions, not-read reminders and corrections are a person's confirmed actions in the app (one confirmation each). Approvals are a person's click.

## Without automations

Overview shows what is due and late; drafts are requested in chat ("Draft the October board update"); everything else works.

## Failure behaviour

No runner: `meeting_before_draft` and `scheduled_draft` stay at Needs setup; the email automations work; the app is fully usable. Partial reads in a helper are stated in its output (`complete:false`, or a line in the digest). A failed email never reruns research. Archiving the app pauses every automation; restoring brings them back switched off.
