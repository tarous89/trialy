# Programs 2.0.0: optional automations

None is required. The app never reads automation state and keeps working when an automation is off, failing or missing. Configure them only after the app is saved, in TrialAgents → Automations (or with `prepare_app_action` / `prepare_automation_setup`). They are recipes, not active definitions.

| # | Automation | Worker | Trigger | Reads | Output |
| --- | --- | --- | --- | --- | --- |
| 1 | Monthly update reminder | TrialAgents email | Calendar, monthly on `programs.settings.update_day`, Europe/Berlin | programs (name, lead, status), programs.updates (program_id, month) | One email to program leads who are registered members with app access, listing active programs without an update for the month. Silent when all have one. |
| 2 | Slip notice | TrialAgents email | Database: creation of a `programs.slips` record whose plan item has `is_key = true` | slips (old_end, new_end, days, reason, detail), plan_items (name, owner, is_key) | One email to the owner (registered, authorized member) with item, old and new date, days and reason. Never for non-key items. |
| 3 | Monthly status draft | Research on the shared Claude or ChatGPT runner | Calendar, monthly the day after the update day, Europe/Berlin | slips, decisions, raid and existing updates for last month | At most one draft `programs.updates` record per program and month (dedup: program_id + month), built only from recorded changes, never overwriting an update and never setting program health. Writes only to `programs.updates` under a narrow expiring grant; otherwise proposes for review. |

**No automation:** program leads write the monthly update in Updates; Overview lists missing updates, overdue milestones, gates without criteria, risks past review and stale health.

Prompt example for recipe 3 is in `catalog.metadata.json` → `documentation.tasks.promptExample`.
