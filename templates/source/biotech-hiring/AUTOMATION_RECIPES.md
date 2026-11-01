# Optional TrialAgents automations — Biotech Hiring & Resource Management v1.4.2

## ChatGPT capacity analysis (optional)

Optional weekly ChatGPT biotech capacity review. Frequency: weekly (Europe/Berlin) only after saving the app, explicit owner approval and verified shared runner. Read authorized People, Activities, Allocations and Hiring Needs records and all available pages. Identify overallocated person-months, unfilled critical expertise, competing work across discovery R&D, preclinical, CMC, clinical development, regulatory, quality, business development and operations. Cite each relevant source record ID and month, distinguish committed versus tentative demand and never count pending hires or placeholders as supply. Propose at most five prioritized actions and accountable owners; deduplicate by kind, activity/person and month. Do not assess applicant protected traits, invent capacities, send emails or change records without a reviewed scope and confirmed write receipt. On no findings, return no_update only if silent completion was approved. Failed runs preserve prior app data and coverage.

## Internal approval notification (optional)

Optional TrialAgents email action (not ChatGPT email). Trigger only when a Hiring Need / Role Gap record changes from Pending to Approved. Owner is recipient by default; include additional members only when explicitly selected and authorized for app data. Subject: Biotech resource request approved: {{role}}. Message: The {{fte}} FTE request for {{role}} supporting {{program}} has been approved, needed by {{targetStart}}. Please open Biotech Hiring & Resource Management in TrialAgents to review. Do not send on unrelated updates or reversed approval. Backend enforces settling, current-state revalidation, per-app hourly and account-wide delivery limits and deduplication; manage enabled state, timing and recipients in platform Automations, outcomes in Logs. No external recipients without separately supported and approved policy.

## No automation

No automation: manual people directory, monthly project allocations, capacity outlook, approved support requests and what-if scenarios all work without scheduling, email, connectors or ChatGPT research.

Save the app first. Automation definition saved, Enabled/Disabled, runner readiness and successful execution/delivery are distinct states. Never send emails from ChatGPT.

## 1.4.2 setup contract

Use current `read_app_automation_guide`, `read_automation_setup` and `list_app_automations`. Use stable authoring keys `biotech-hiring.weekly-capacity.v1` and `biotech-hiring.approval-email.v1`; retain existing saved IDs on edits/retries. Configure weekly eligibility/timezone through the current supported schema; no per-app host ChatGPT Task. Inherit app read access and only separately approved scoped writes with an explicit expiry. Default analysis returns an evidence-linked review to the owner without database writes; saving actions to a table needs an explicit approved destination/schema.

Read every authorized page and respect the 500-row calculation ceiling. Missing, denied, partial or invalid required sources produce a partial/blocked result, never no_update or a definitive zero shortage. Only Active people supply baseline capacity after available_from; pending hires remain hypothetical.

Before preparing email inspect the actual `status` field and current supported placeholder syntax. Do not assume the conceptual placeholders above are executable. If record-field substitutions are unsupported, use the static subject “Biotech hiring request approved” and message “A hiring request was approved. Open Biotech Hiring & Resource Management in TrialAgents to review.” with the supported trusted app link. Default recipient is the owner; additional recipients must be explicitly selected registered members with current access. Use one Pending → Approved transition rule, no duplicate completion email. TrialAgents sends, never ChatGPT. Disable/edit in platform Automations; retain disabled state, archive suspension and no restore/copy activation. Outcomes belong in Logs; delivery failure never reruns successful research.
