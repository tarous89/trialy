# Fundraise 2.0.0: optional automations

None is required. The app never reads automation state and keeps working when an automation is off, failing or missing. Configure them only after the app is saved, in TrialAgents → Automations (or with `prepare_app_action` / `prepare_automation_setup`). They are recipes, not active definitions.

| # | Automation | Worker | Trigger | Reads | Output |
| --- | --- | --- | --- | --- | --- |
| 1 | Weekly round digest | TrialAgents email | Calendar, Mondays 08:00 Europe/Berlin | active round; opportunities (interest, amounts, currency, is_lead, stage, offer_status, last_activity_on, next_due); activities (follow_up_due); settings.stale_days; dataroom.engagement when readable | One email to the owner: raised, verbal and soft vs target, lead status, stale and due items, engagement highlights. Totals only from complete reads; otherwise the email says the data was partial. |
| 2 | Signed commitment notice | TrialAgents email | Database: `fundraise.opportunities.interest` becomes `signed` | opportunity (organization_id, round_id, amount_committed, currency), organizations.name | One email to the owner per opportunity that becomes signed. |
| 3 | Investor research | Research on the shared Claude or ChatGPT runner | Monthly or on request | settings vocabularies, organizations (name, website), investor profiles | New organizations (org_type investor) and `fundraise.investor_profiles` with `profile_status` proposed, `source` and `source_date`; deduplicated by organization name and website; never changes accepted or rejected profiles or opportunities. Writes only those roles under a narrow expiring grant, or proposes for review; `no_update` when nothing new. |

**No automation:** Overview lists stale and due conversations; Activity lists follow-ups due and pass reasons; the user accepts or rejects proposed investors in Investors.

Prompt example for recipe 3 is in `catalog.metadata.json` → `documentation.tasks.promptExample`.
