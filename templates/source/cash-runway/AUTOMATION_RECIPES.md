# Runway automations (2.2.0)

Runway 2.2.0 declares four `recommendedAutomations` in its catalog entry. They are offered in the install dialog, all selected, while `APP_AUTOMATION_RECIPES_ENABLED` is on. Later they can be added from Automations → From app features, or by Claude or ChatGPT. Zero automations is fully supported: the app loads, calculates and saves without them, and a failing or disabled automation never changes it.

## 1. Runway alert (`runway_below_target`, email)

- **Trigger:** database: `runway.month_closes.runway_status` becomes `below_target` on a new or updated month close. There is no independent schedule.
- **Recipients:** the account owner by default; add only registered, authorized members.
- **Message:** fixed text pointing to Actuals → Snapshots, with the close's `month`, `runway_months` and `cash_out_month`.

## 2. Month-close reminder (`month_close_reminder`, email)

- **Schedule:** monthly, 5th business day (Monday–Friday, no holiday calendar), 09:00 Europe/Berlin.
- **Message:** fixed text: close last month in Actuals → Close month; ignore if it is already closed.

## 3. Monthly exchange rates (`monthly_fx_rates`, research on the Claude or ChatGPT runner)

- **Schedule:** monthly, 3rd business day, 07:00 Europe/Berlin.
- **Reads:** `runway.settings.enabled_currencies` and `reporting_currency`; existing `runway.fx_rates` month/currency pairs.
- **Source:** ECB euro foreign exchange reference rates for the previous calendar month only.
- **Output:** for each enabled currency other than EUR without a row for that month, one new `runway.fx_rates` record: month = first day of the previous month; `rate_per_eur` = monthly average, units per 1 EUR, four decimals; `source = ecb`; `source_ref` = ECB page URL.
- **Storage (PR #169):** the result is saved in the app database under the bounded write permission approved together with the automation: `writeBindings` create only, fields `month, currency, rate_per_eur, source, source_ref`, no updates and no other table. A run is `completed` only with verified save receipts.
- **No result or failure:** `no_update` when every row exists; `blocked` when the ECB source is unavailable, with nothing written.
- **Needs setup:** if the runner's assistant cannot write `runway.fx_rates` (for example it was set to Can read), the automation stays Needs setup and the app is unaffected.

## 4. Monthly runway digest (`monthly_runway_digest`, email)

- **Trigger:** database: a `runway.month_closes` record is created (a month is closed).
- **Message:** fixed text with the closed month's frozen fields: `month`, `closing_balance`, `currency`, `runway_months`, `cash_out_month`, `runway_status` and `commentary`. Every figure comes from the snapshot the app froze; no summary function or assistant computes it.

## No automation

Enter rates and close months manually, or ask Claude or ChatGPT to propose rates (`fx.save`) and close the month (`month.close`). The runway status is still recorded at each close, and Overview shows it.
