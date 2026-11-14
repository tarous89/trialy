# Partnerships 2.0.0: automations

The platform runs these automations, not the app. The app never reads their state, never waits for one, and keeps working when an automation is off, failing, pending or missing. Schedules, recipients and on/off live on the automations in TrialAgents Automations; the app stores none of them. Before saying anything runs, check with `read_app_automation_readiness`.

## Install recommendations (`recommendedAutomations` in `catalog.metadata.json`)

These three are selected by default in the Add app dialog, and the owner can opt out of any of them. Add app is the single approval, and it includes the write permission listed below. They are enabled after the app is saved. If the runner or write access is missing, they stay at Needs setup and the app still installs. Later changes go through Automations → From app features, or through Claude or ChatGPT with `read_app_automation_features`, `prepare_app_automation_feature` and the exact confirmation.

| Key | Worker | Trigger | Reads | Saves (create only) |
|---|---|---|---|---|
| `partner_research` | Research on the user's Claude or ChatGPT runner | Calendar: weekly, Monday 07:00 Europe/Berlin (daily or monthly by editing the automation) | Settings (digest intro line, stalled days), asset profiles, opportunities, stage history, follow-ups, activities, conferences, partner and asset names, earlier signals (including dismissed ones) and reports | New `partnerships.signals` (kinds deal, trial, pipeline, financing, people, news; at most two `target_suggestion` per asset), deduplicated on organization + kind + source URL (company name for targets). Every run, including one that finds nothing, saves one `partnerships.research_reports` row whose summary is in the §6 digest format. |
| `partner_digest` | TrialAgents email | After each completed `partner_research` run, including one with no findings | `{{run.summary}}` | One email to the recipients chosen on the automation (by default the owner). Recipients must be workspace members; partner addresses are never accepted. Delivery limits: one app email per recipient per hour, 15 per account per day. |
| `meeting_briefs` | Research on the user's runner | `partnerships.activities.occurred_on`, one day before, at 08:00 | The meeting, its opportunity, stage history, partner, contacts, assets and existing briefs | One `partnerships.briefs` row with status `draft`, only for a meeting, call or conference meeting that has a linked opportunity and no brief yet (any other activity finishes as no update). A person marks it reviewed in the app. |

Research results must be saved in the app (PR #169). A proposal-only substitute is not allowed. The permission is limited to the tables and fields above, with create only. Research cannot create or change opportunities, stages or any other table, cannot change or accept signals, and never contacts anyone.

## Follow-up reminders (set up in chat or Automations on request)

Reminders need the condition `status = open`. Install recipes cannot express it yet: recipe emails carry no conditions, and catalog apps cannot ship a summary function. They are therefore not offered at install. When the user asks, the assistant prepares the two email actions in `automation.examples.json` with `prepare_app_action`:

- a `record_date` trigger on `partnerships.follow_ups.due` at 08:00 (due date) and at +1 day (overdue);
- the condition `status equals open`;
- `memberField: owner_member_id`, so each reminder goes to the follow-up's owner. The app copies that member ID from Settings → Team and digest → Member IDs. When a follow-up has no member ID, the reminder goes to the action's recipients.

In the app, the follow-up also shows as Today or Overdue.

## Archiving and no automation

Archiving the app pauses all of them. Restoring brings them back switched off, and they resume only when the owner resumes them.

Without automations, ask your assistant in chat ("Find news on our Partnerships targets and suggest two new targets for NWB-101", "Write the brief for tomorrow's Ironvale meeting") and review the proposals in the app. Overview shows what is due and stalled whenever you open it.
