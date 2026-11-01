# Optional automations

Manual-only is the default. Save and verify the app first. Read current read_automation_setup, list_app_automations and read_app_automation_guide. Definitions use stable authoringKey, retain disabled state on edits, stay listed when disabled, suspend on app archive and never resume on restore/copy automatically. Use the shared ChatGPT runner, never a per-app ChatGPT Task. Automation failure must not block app use.

## Weekly bid coverage review

With explicit owner approval, schedule Monday weekly in Europe/Berlin using authoringKey life.cro-rfp-management.weekly-bid-risk.v1. Use the exact prompt in catalog documentation.tasks.promptExample. Read complete authorized bids, questions, library, reviews and proposals; identify source gaps, mandatory answers, dated reviewer evidence including required Finance, stale content and deadlines within 30 days. Cite saved IDs, versions and cutoff. Never manufacture capability, certifications or prices, approve answers, mark Ready or submit to sponsors.

Default output is chat-only. Before enabling a saved-report workflow, ask the owner to choose an existing authorized report destination and map title, body, review_period and dedupe_key to its actual fields; review the exact bounded write scope and expiry. Dedupe by app ID and review period. If there is no compatible destination, keep chat-only output; do not invent a sixth table. Writes need trusted review every time unless an explicit still-valid scoped grant covers the exact operation. Preserve original receipts on retry.

Denied, stale or partial data is incomplete, not a successful no_update. No_update is allowed only after a complete comparison and an owner-approved quiet policy. A requested report with no findings is still a completed report. Keep success, source cutoff, report ID and committed write receipt separate from definition enabled state and runner readiness.

## Dependent internal notification

Only after a report destination exists, separately approve a TrialAgents email action with authoringKey life.cro-rfp-management.email.after-verified-report.v1, using the supported manual completion trigger linked to successful research. Select owner by default and only explicitly approved registered team members with current access. Never use sponsor contact fields as recipients.

Use the current typed email action and supported placeholders from read_app_automation_guide. Suggested fixed message: “The reviewed CRO bid coverage report is available. Open the linked app to review it.” The platform supplies supported app links; never invent dynamic sponsor, period or summary placeholders. No email for chat-only output, pending review, no_update, zero committed changes, incomplete coverage, denied permissions or absent report receipt. Delivery retries must not rerun research. Inspect Logs for actual outcomes.

## Standalone reminder alternative

If the owner wants only a reminder, select a supported daily-or-slower schedule or actual saved record-status transition from the current typed email schema. Use a fixed internal message and the platform app link. Do not promise automatic deadline scanning or record-date email triggers unless the current action schema explicitly supports them. Do not add a redundant schedule beside a dependent email.
