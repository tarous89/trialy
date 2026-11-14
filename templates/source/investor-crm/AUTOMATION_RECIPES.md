# Fundraise 2.0.0: automations

Declared in `catalog.metadata.json` → `recommendedAutomations` under the [app automations scope](../../../docs/product/RECOMMENDED_AUTOMATIONS.md) (template guidance 1.3.27–1.3.30). They appear in Add app only when `APP_AUTOMATION_RECIPES_ENABLED=true`. All three are selected by default; Add app is the one approval and enables them after the app is saved. The owner can turn any of them off there, or later in TrialAgents → Automations (From app features) or through Claude or ChatGPT with the exact review. The app stores no schedule, recipient or on/off setting, never reads automation state and keeps working when an automation is off, failing or missing.

| Key | Automation | Worker | Trigger | Reads | Saves / sends |
| --- | --- | --- | --- | --- | --- |
| `round_digest` | Weekly round digest | TrialAgents email | Calendar, Mondays 08:00 Europe/Berlin | The installed helper `round_digest` (E7, `records.read` only): rounds, opportunities, activities, investor profiles, settings, organizations | One email to the owner. The helper applies the app's rules: raised = signed only; verbal and soft separate; other currencies flagged and excluded; lead; follow-ups due this week (overdue first); stale conversations (`stale_days`); proposed investors waiting. Partial reads withhold totals. No active round → nothing is sent. |
| `signed_commitment` | Signed commitment notice | TrialAgents email | Database: `fundraise.opportunities.interest` becomes `signed` (update or creation) | The transition only | One email per opportunity, asking the owner to check amount, currency, date and evidence. No record values in the text. |
| `investor_research` | Investor research | The user's Claude or ChatGPT runner | Calendar, first Monday of each month, 07:00 Europe/Berlin | Brief from the helper `research_brief`: fit vocabularies, planned and active rounds, every known investor (including rejected and archived) and investor organizations without a profile. Read bindings use `fields:"all"` (E6). | Results are stored in the app (#169): create-only grants on `organizations` (name, org_type, country, website) and `fundraise.investor_profiles` (always `profile_status` proposed, with source and source_date; never tier, intro path or archived). At most 10 per run. No update grant on anything; no pipeline, round or activity writes. `no_update` when nothing new fits. |

**Without automations:** Overview lists stale and due conversations; Activity lists follow-ups due and pass reasons; Investors → Proposed is where research results (or the user's own proposals) are accepted or rejected.

**Missing pieces leave the app usable:** without a ready runner, research stays at Needs setup; without write access, research stays at Needs setup (never proposal-only); the two emails do not need a runner.

**Not an install recommendation:** per-follow-up reminders. Recipe emails cannot express "only open follow-ups" for activities; an assistant can set one up on request as an email action with that condition.

Tests: `tests/fundraise-automations.test.ts` (Add app selection, active setups, grants, schedule, the brief, research writes and refusals, the delivered digest against the Overview screen, the notice transitions, opt-out, no runner, archive pauses).
