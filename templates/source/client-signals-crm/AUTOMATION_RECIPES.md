# Optional ChatGPT and TrialAgents email automations

**Default:** No automations. The app works manually without research, scheduler, automation ID, email delivery or a connected proprietary CRM. Only the platform Automations page and verified host tools can create/enable jobs; the app's Signal monitoring screen is a **scope editor**, not an active runner.

## Research recipe (ChatGPT shared runner, owner opt-in)

**Purpose:** Track new public biotech funding, trial start, regulatory, hiring and partnering announcements, and qualify potential relevance to CRO services without guessing procurement budget.

**Trigger:** Proposed weekly interval in user-approved `Europe/Berlin` timezone (or another permitted interval from live guide), with a user-specified start and expiry. Never activate by app creation, flag or template viewing. Save app first; inspect `list_app_automations` and reuse an existing stable authoring key rather than creating duplicates. Request `prepare_app_monitoring` only after explicit consent and current capability checks.

**Inputs:** Exact authorized company/signal/deal fields and selected owner, watchlist/exclusion domains, research geography, approved source window, verified public websites/registries, previously seen signal keys. No private trial protocol content, patient data, purchased lead lists, or private contacts are transmitted for public search.

**Prompt:**

> Review authorized small-biotech company profiles and selected public company-release, trial-registry and regulatory sources for the approved geographic/therapy scope. For each dated event, identify company and original URL, event type, publication date, source-supported fact, any uncertainty and a **separate hypothetical** CRO-service fit. Deduplicate by `(company, event type, normalized URL, date)`. Flag conflicting/ambiguous evidence. Return a review proposal, not a committed customer fact. Never move sales stages, qualify budgets, send outreach, or assume contact consent. Provide coverage details and explicit partial/failure status. Do not send `no_update` unless every approved source and allowed table is complete and the user opted into silent no-change delivery.

**Writes:** Default read-only research: human reviews proposed `signals` records. Further scoped writes require exact table/column authority, reviewed proposal and expiry. Revalidate access on every run. No automatic approval or implicit new company creation.

**Output:** `observedAt`, published date, source URL, signal identity, duplicate match, verified fact, separately stated interpretation, confidence/caveat, authorized company reference, completeness status, proposed record changes and run receipt after actual completion.

**Failure:** If permissions fail, sources are unavailable, date/currency evidence conflicts, or read budget is exhausted: record partial/failed coverage in platform Logs, do not issue definitive absence, do not approve signals or silently change a deal; keep the app fully usable.

**No-automation alternative:** User opens Signal monitoring, sets scope, copies the recipe into a manual ChatGPT research request, reviews findings, and uses Add signal for a platform-reviewed update. The `runs` table is historical log metadata only.

## Optional team-only email via TrialAgents

If the owner separately requests notification after research, configure a reviewed TrialAgents `prepare_app_action` with a **manual completion trigger**, invoked only after successful research. Do not add an independent email schedule or assume an email action scans source records. A delivery failure must not rerun successful research. Use current typed host capabilities, fixed text, approved expiry and approved registered recipients with app access. No external prospect outreach or ChatGPT email.

**Fixed subject:** `Client Signals & CRM — findings available for review`

**Fixed body:** `Research findings are available in your Client Signals & CRM workspace. Review the source-linked evidence before approving or using the findings. This message contains no confidential prospect data.`

When feature support differs from the guide, omit the unsupported automation rather than pretending it works. Disabled definitions remain available in the platform list, with enablement/runs visible in platform Logs.
