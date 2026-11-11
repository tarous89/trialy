# Runway optional automations

Zero automations is fully supported. The app loads, calculates and saves without any of these, and a failing or disabled automation never changes it. Save the app first, then configure automations in TrialAgents Automations with their own reviewed authorization. This metadata is a recommendation, not an active definition.

## 1. Runway alert (TrialAgents email action)

- **Trigger:** a database transition: `closes.runway_status` becomes `below_target` on a new or updated month close. There is no independent schedule.
- **Recipients:** the account owner by default (`to:"account"`); add only explicitly approved, registered team members with current app access.
- **Message (fixed text):** "The latest Runway close is below the runway target. Open Runway → Actuals → Snapshots for runway months, cash-out month and start-raise date."
- **Limits:** platform email guardrails apply (two-minute settling, one app email per recipient per hour, 15 recipient deliveries per account per day).
- **Disable or edit:** in Automations. Run history is in Logs.

## 2. Monthly exchange rates (research on the Claude or ChatGPT runner)

- **Schedule:** monthly, third business day, Europe/Berlin.
- **Reads:** `settings.enabled_currencies` and existing `fx_rates` month/currency pairs.
- **Source:** ECB euro foreign exchange reference rates for the previous calendar month.
- **Output:** for each enabled currency other than EUR without a row for that month, one `fx_rates` record: month = first day of the previous month; `rate_per_eur` = monthly average, units per 1 EUR, four decimals; `source = ecb`; `source_ref` = ECB page URL.
- **Deduplication:** month + currency. Existing rows are never changed.
- **No result or failure:** `no_update` when every row exists. When the ECB source is unavailable, report the failure and write nothing.
- **Write scope:** only `fx_rates`, through review or a narrow, expiring standing grant for that table.
- **Manual fallback:** the owner enters rates in Settings, or asks the assistant in chat to look them up and propose them.

There is no platform service that loads ECB rates without an assistant run; that would be a separate platform feature.

## No automation

Enter rates and close months manually. The runway status is still recorded at each close, and Overview shows it.
