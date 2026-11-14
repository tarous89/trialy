# Contracts 1.1.0: automations

Contracts has **one** recommended automation and no scheduled AI work. It is shown switched on in the Add app dialog and can be turned off; the app never reads automation state and works fully without it.

| Key | Automation | Worker | Trigger | Content |
| --- | --- | --- | --- | --- |
| `contract_actions` | Contracts: actions needed | TrialAgents email (no AI) | Calendar, weekly, Monday 08:00 Europe/Berlin (editable) | One email to the owner, built by the read-only summary function `actions_summary` (`contracts.actions-summary.js`). Lists agreement names in three groups: **Deadlines** (notice deadlines within the first reminder window, default 30 days; active agreements without renewal expiring within 30 days; open obligations overdue or due within 7 days), **Waiting for signature** (drafting, in negotiation, out for signature, with days in status) and **To check** (terms or obligations an assistant filled in that nobody has checked). Nothing is sent when all groups are empty. |

**Setup after install.** Catalog installs cannot attach functions, so the row is **Needs setup** after Add app. To turn it on (an assistant does this on request, catalog instructions step 8):
1. Replace `__TABLE_MAP__` in the function source with the saved app's `tableMap` configuration.
2. Prepare it as a read-only function: `scope.capabilities ["records.read"]`, `scope.typeIds` the agreements, organizations, contracts.settings, contracts.terms and contracts.obligations tables from that map, `documents: false`.
3. Bind it to the app as `actions_summary` in a reviewed app revision.
4. Set up `contract_actions` from Automations → From app features, or with `prepare_app_automation_feature` and `confirm_app_service_review`.

Verified end to end in `tests/contracts-automation.test.ts`.

**Removed in 1.1.0:** the scheduled "extraction of new originals" research automation (owner decision C1: filling in a contract is something the user asks for) and the `digest_day` setting.

**No automation:** Overview, Obligations, CDAs and Pipeline show the same information on demand. Users may add their own automations, including AI ones, later.
