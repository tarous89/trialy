# Lab Inventory 2.0.0: optional automations

None is required. The app never reads automation state and keeps working when an automation is off, failing or missing. Configure them only after the app is saved, in TrialAgents → Automations (or with `prepare_automation_setup` / `prepare_app_monitoring` / `prepare_app_action`). They are recipes, not active definitions. Archiving the app pauses them; restoring brings them back switched off.

| # | Automation | Worker | Trigger | Output |
|---|---|---|---|---|
| 1 | Weekly digest | Research on the user's Claude or ChatGPT runner, then a TrialAgents email | Calendar from `labinventory.settings` (weekly default, Monday 08:00, workspace time zone; daily or monthly as set). The email: database trigger, source `automation_runs`, that research automation, status becoming `completed`. | The runner calls `run_component_frontend` for the app with `state:{section:"settings"}` and returns the text of the `<pre data-digest>` block verbatim as the run summary (no record writes). The email sends `{{run.summary}}` to the chosen registered members. Low stock, suggested reorders, expiring and expired lots, approvals waiting and late orders; at most 3 lines per section; empty sections omitted; one line when nothing needs attention. |
| 2 | Approval request | TrialAgents email | Database: `labinventory.requests` created | To the approver (a registered member with app access): `{{record.requested_by}} requests {{record.quantity}} × {{record.item_name}} (estimated {{record.estimated_amount}}). Open Lab Inventory → Requests.` In-app the approver sees the queue without any automation. |
| 3 | Status updates | TrialAgents email | Database: `labinventory.requests` updated, `status` becomes approved / rejected / ordered / received (one action per status), condition `requested_by` equals the person | To that person only, if they want email: `Your request for {{record.item_name}} is now {{record.status}}.` In-app everyone sees the status on Requests and Overview. |

The digest text is computed by the app with the §7 rules, so the email always matches what people see in Reports & settings. Why a runner: TrialAgents email actions send fixed text or the fields of one record; only a research run can hand a computed summary to an email (`{{run.summary}}`).

**No automation:** Overview shows the same alerts, reorders and approvals on demand; approvers check the Requests queue; requesters see their status on Overview → My requests.
