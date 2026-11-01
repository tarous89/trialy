# App notifications and simple automations — agreed scope

Approved 1 November 2026. This supersedes earlier email intervals/run caps and any proposed report/digest modes.

The UI retains ChatGPT and Email tabs. Show linked app, name, schedule or database condition, instructions or email subject/message, and selected recipients. Do not expose raw IDs, JSON, read/write scopes, limits, anchor dates, catch-up, timezone configuration, execution models or retry controls. Existing advanced definitions retain their values when edited; they are not silently reset. Times use the current IANA timezone, displayed as help text. Calendar choices are daily/weekly/monthly with every N days/weeks/months. New interval-based email is rejected by the server.

Email notification actions have one email step, separate from processing/functions/connectors. Database rules use entry creation or an explicit field transition. Prefer status, assignee and revision fields over a send-email Boolean. ChatGPT can update approved fields and the backend triggers email without a discretionary send call. ChatGPT may run multiple times daily; its limits are independent of delivery limits.

## Backend contract

- Two-minute settling delay after the latest relevant update. Unrelated edits do not restart it. Re-read current record state, approval, app/data access and recipient before freezing a message and before dispatch. Deleted/archived records, resolved conditions, cancelled work and revoked access cannot generate a new email.
- Collect pending items under the approved notification rule. Updates to the same record replace its pending state. Multiple items produce a simple link to current app work, not one email per row. No cross-account content combining.
- Global rolling-hour recipient gate across all apps/accounts using normalized registered email, plus 15 recipient deliveries per tenant/account in rolling 24 hours. Calendar notifications also have one slot per rule/recipient/local date. Count recipients, not API calls. Atomic worker-only reservations survive retries and ambiguous outcomes.
- Bounded pending batches (100 per account) and items (1,000 per batch). Excess suspends the offending rule with an owner-visible diagnostic; ordinary hourly/daily limits only defer work. Source records are retained. A deferred notification remains subject to current eligibility checks.
- Recipient addresses are exact, explicitly approved registered account members with current app and full notification-data access. A database email column is never an address list. The owner is included by default in the editor. Invitations are separate from app automations. Current account registration is not proof of email ownership; accepted email invitations establish possession, and platform-wide verified sign-up remains its separate onboarding scope. Do not claim unverified addresses are verified.
- `APP_NOTIFICATION_EMAILS_ENABLED=false` on workers or the database notification guard disables new app email delivery while retaining pending work. Invitation/security delivery is separate. In-flight provider-accepted messages cannot be recalled.
- Provider keys and immutable payloads are retained across delivery retries; no blind fresh-key resend after uncertain acceptance. Failures do not rerun research or undo saved data.
- Logs and action history show queued/waiting/completed/cancelled/blocked outcomes without leaking message bodies or another account's global recipient activity.

## Migration and rollout

Migration 051 adds account-scoped pending batches, items, recipient outcomes and a private global budget ledger. It cancels only unsent legacy app-email jobs; historical receipts and user records are preserved. Email actions requiring unsupported intervals/multiple steps/broad update triggers are paused for owner review. A database fence rejects unguarded app-email jobs and prevents an old worker from claiming jobs produced by the new version during rolling deploys. This fence remains effective on rollback; restoring old code does not restore unsafe sending.

## Required verification

1,000 changes -> one pending batch and one email per approved recipient. Test same-event replay, unrelated edits, meaningful edits during delay, condition reversal/deletion, recipient revocation, simultaneous reservations, different apps/accounts sharing one recipient, account recipient counting, calendar slots, paused sending, provider acceptance followed by a lost response, and recovery without duplicate emails. Desktop/mobile UI must remain minimal and retain failed-save drafts.
