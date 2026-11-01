# Optional TrialAgents / ChatGPT automation recipes — CO-03

**Automation is optional. The default Site Feasibility app has zero automations and works fully for manual sponsor studies.** All task definitions are managed through existing TrialAgents Automations after the app is saved. App pages don't poll schedulers, store task credentials, send email, or show setup error banners.

## A. No automation (default)

The sponsor creates/reuses institutions, study-site candidates, questionnaire criteria, responses, reviewer assessments and startup tasks manually. Users review each exact record mutation via `records.propose` in TrialAgents. Unknown data is flagged and missing answers block completeness and selection. No ChatGPT runner, email, calendar API or site login is needed.

## B. Optional ChatGPT study feasibility briefing

- **Intent:** Internal monthly or manually triggered source-backed study-level feasibility risk brief, not recruitment forecasting or autonomous site approval.
- **Executor:** TrialAgents-approved shared ChatGPT runner, using the existing workspace connection. Configure only through a reviewed `prepare_app_monitoring` after checking `read_automation_setup` and `read_app_automation_guide`; use stable authoringKey such as `co03-feasibility-review-<saved-app-id>` on retries, not a per-app ChatGPT task.
- **Trigger:** Example calendar every one month, sponsor's approved timezone e.g. `Europe/Berlin`. Frequency and owner must be confirmed. Due time is not a promise of successful completion.
- **Read scope:** Saved app, study ID and authorized `studies`, `sites`, `candidates`, `criteria`, `responses`, `evaluations`, `startup` (and professional PI public credentials only if explicitly approved). Respect AI-specific field access, records/page limits, evidence versions, publication dates, and established study-country exclusions. Never read patient records or private participant recruitment lists.
- **Research prompt:**

> For this selected sponsor feasibility study, read only authorized institutional and study-site records. Confirm completeness of all required data sources, criteria versions, response status, selection-review evidence and dates. Summarize country/site coverage, overdue site questions and startup tasks, critical mandatory institutional gaps and source-verification needs. Cite saved candidate/site/criterion/response IDs and dated sources for each finding. Produce an **unsaved Draft** internal sponsor brief with scope, cutoff, evidence, owner actions and explicit missing-data caveats for review. An Approved assessment must have the same evidence fingerprint as the stored responses. Do not infer actual eligible patients, claim GxP greenlight, communicate externally, send email, bypass reviewer approval or rewrite source data. When any required read is denied, truncated, missing, or changes mid-run, mark partial coverage and do not claim completion or `no_update`. Deduplicate on study, candidate, criterion version, source identity and observation date. If complete and there are genuinely no new findings, report `no_update` only under the pre-approved quiet policy.

- **Output:** Source-backed draft in the user's authorized destination (the saved app's own reporting record only if this role is separately approved; CO-03 has no default reports table, so the normal default output is a reviewed ChatGPT response or platform artifact, not a phantom report row). Recommend follow-up tasks for owner review, do not make unapproved schema changes.
- **Completion/failure:** No findings with complete coverage may be silent only when approved quiet policy exists; otherwise record an explicit reviewed no-findings result. On timeout, permission loss, partial records or empty source, return partial/failure, keep app usable and avoid false site readiness. Disabled definitions remain listed and disabled.
- **Write grant:** default no autonomous database writes; an explicit, limited, revocable grant is required for any future saved brief or status field.

## C. Optional internal email after a successful reviewed briefing

- Configure a separate, reviewed **TrialAgents `prepare_app_action` email** rule only if approved; never send through ChatGPT or the generated app.
- For a ChatGPT research-to-email chain, use a **manual-triggered completion action** invoked after verified successful research. Do **not** also schedule the email independently.
- Default recipient: registered app owner; optional recipients must be explicitly selected registered teammates with current app and data permissions. Database `contact_channel` or an institutional address does not authorize emails to sites or candidates.
- **Fixed subject:** `Site feasibility briefing is ready for review`
- **Fixed message:** `An internal sponsor feasibility briefing has completed. Please open the Site Feasibility app in TrialAgents, check source coverage, and review the findings before taking action.`
- No unsupported variable interpolation; no external site email, mailing list, digest mode, bulk outreach, or unreviewed escalation. Follow backend delivery delay/coalescing/limits and recipient revocation. A delivery failure must not rerun completed ChatGPT research.
- Missing connection, disabled rule or failure is visible in the platform's Automations/Logs only and never blocks ordinary app use.

## D. Separate deterministic team notification (only if expressly requested)

A direct, independent TrialAgents email could be configured on a supported **specific database field transition** (for example `candidates.stage: Assessed → Selected`) after verifying the actual bound field/transition, approval scope, recipient list and current app permission. Do not use “any change” notifications, cross-app table sweeps or hourly email. A change that is reversed before dispatch must be revalidated/cancelled by the backend. This option is **not** automatically combined with recipe B/C.

## What is not provided

No site surveys sent from the app, no automatic questionnaires emailed to institutions, no public survey tokens, no consent capture, no EHR/CTMS API integration and no unapproved external communications. Explicit new work may require separately approved platform-supported forms or connectors, outside this template.
