# CR06 data contract

## Authority and semantics

All eight role tables are created/reused through **real reviewed TrialAgents database setup**. No source-level permissions, local auth, or plaintext links can override host access. Every field is scalar (`multiple:false`), with snake_case physical keys. References (`companyId`, `contactId`, `opportunityId`) are **single** host record UUID strings, not array relationships or embedded objects. Save parent companies through host review and use receipt IDs in child records. Host must enforce access independently, especially for commercially confidential discussions and contact opt-outs.

## Core relations

`companies -> contacts, opportunities, signals, interactions, followups, reports`. `contacts -> interactions, followups`; `opportunities -> interactions, followups`. `runs` stores **observed** optional research batch outcomes. Each role can be an existing authorized table (no forced duplication) if the real field kinds and scope match.

## Financial/reporting semantics

- Qualified leads are distinct **active opportunities** with `qualification=Confirmed` and `stage` in Qualified/Meeting/RFP/Negotiation. A verified public event does not qualify a deal.
- Signal count includes unique reviewed entries with valid public URL, published date, reviewer+review date, source fact and active company; de-duplicate by company/type/normalized URL/date.
- Time-sensitive recent/overdue counts are withheld unless a human-approved `asOf` date is configured. Inclusive 30-day recent source date window, excluding publication after the cutoff.
- Probability is only a human-entered 0–100 percentage, never AI-inferred. Estimated values require a currency; no mixed-currency aggregation or automatic conversion.
- An approved account briefing requires current **signalId@version** references, matching company, complete authorized source reads, reviewed source facts, report reviewer and date. Changed evidence must return for human review.
- Research batches are not proof of active scheduling. A Completed record requires a dated run receipt, but true host execution must still be verified separately in Logs.

## Validation / conflict behavior

- Required inputs, valid calendar dates, selected options, integer probability limits and HTTPS public sources are checked. Company websites and evidence-announcement keys are duplicate protected.
- Do not silently reassign a historical interaction, signal, follow-up or briefing to a different company/person.
- Changing a deal stage requires **new** dated rationale rather than reusing its prior decision note. Contact opt-out is preserved; no in-app messaging action exists.
- An edit/archive pins the **version at opening**. A later concurrent change blocks the proposal; the editor draft stays present. Soft archive verifies complete linked-child role reads and refuses an unresolved relation.
- Missing binding, denied reads, short pages, unknown totals, invalid scalar shapes and read-budget exhaustion are marked incomplete. Only verified complete-empty means zero. Maximum bounded local read: 10 pages x 40 rows per role. All loaded registers remain paginated.

## Host field translation and empty values

 Host schema translation: logical long and ref are both kind:text (refs hold one saved UUID); use kind:text for URLs/email/narrative, kind:number/date/boolean/select as listed, multiple:false for every field, required:true only where marked, and options:[exact listed strings] for select. Physical keys convert camelCase to snake_case (companyId -> company_id); tableMap maps every logical field to its actual authorized physical key. Example field: {"key":"company_id","name":"Company","kind":"text","multiple":false,"required":true,"ai":true}. Required values cannot be null/blank. Optional blank text/date/reference/select/number values save as null; numbers stay numeric and boolean controls save true/false. A null optOut is unknown, never consent; outreach is not supported. Preserve original host versions, including zero.

 Before any edit to a signal referenced by a reviewed briefing, return the linked briefing to Draft. Signals referenced by any active briefing cannot be archived. After independent database changes or incomplete access, current evidence/version checks label stale reviewed briefs Needs evidence review; reconcile source IDs/versions and obtain fresh review. These are app safeguards, not database-wide foreign-key or transactional dependency constraints.

## Full field specification

### `companies`

| Logical field | Physical example | Kind | Required | Choices / reference |
|---|---|---|---|---|
| `name` | `name` | text | Yes |  |
| `website` | `website` | text | Yes |  |
| `focus` | `focus` | text | Yes |  |
| `phase` | `phase` | select | No | Discovery, Preclinical, Phase 1, Phase 2, Phase 3, Commercial |
| `country` | `country` | text | Yes |  |
| `sizeBand` | `size_band` | select | No | 1-10, 11-19, 20-49, 50-99, 100+, Not verified |
| `sizeSource` | `size_source` | text | No |  |
| `verifiedAt` | `verified_at` | date | Yes |  |
| `owner` | `owner` | text | Yes |  |
| `priority` | `priority` | select | No | High, Medium, Low |
| `notes` | `notes` | long | No |  |
| `archived` | `archived` | boolean | No |  |

### `contacts`

| Logical field | Physical example | Kind | Required | Choices / reference |
|---|---|---|---|---|
| `name` | `name` | text | Yes |  |
| `companyId` | `company_id` | ref | Yes | UUID -> companies |
| `title` | `title` | text | Yes |  |
| `contactUrl` | `contact_url` | text | No |  |
| `email` | `email` | text | No |  |
| `channel` | `channel` | select | No | Not specified, Professional introduction, LinkedIn, Business email, Conference, Do not contact |
| `status` | `status` | select | Yes | Identified, Contacted, Responded, Meeting, Declined, Inactive |
| `optOut` | `opt_out` | boolean | No |  |
| `sourceUrl` | `source_url` | text | Yes |  |
| `verifiedAt` | `verified_at` | date | Yes |  |
| `owner` | `owner` | text | Yes |  |
| `notes` | `notes` | long | No |  |
| `archived` | `archived` | boolean | No |  |

### `opportunities`

| Logical field | Physical example | Kind | Required | Choices / reference |
|---|---|---|---|---|
| `name` | `name` | text | Yes |  |
| `companyId` | `company_id` | ref | Yes | UUID -> companies |
| `serviceNeed` | `service_need` | text | Yes |  |
| `stage` | `stage` | select | Yes | Identified, Qualified, Meeting, RFP, Negotiation, Won, Lost |
| `qualification` | `qualification` | select | Yes | Pending, Confirmed, Not qualified |
| `owner` | `owner` | text | Yes |  |
| `nextStep` | `next_step` | text | Yes |  |
| `nextDue` | `next_due` | date | No |  |
| `timing` | `timing` | text | No |  |
| `estimatedValue` | `estimated_value` | number | No |  |
| `currency` | `currency` | select | No | EUR, USD, GBP, CHF, Other |
| `probability` | `probability` | number | No |  |
| `stageDecisionAt` | `stage_decision_at` | date | No |  |
| `stageRationale` | `stage_rationale` | long | No |  |
| `sourceUrl` | `source_url` | text | No |  |
| `archived` | `archived` | boolean | No |  |

### `interactions`

| Logical field | Physical example | Kind | Required | Choices / reference |
|---|---|---|---|---|
| `name` | `name` | text | Yes |  |
| `companyId` | `company_id` | ref | Yes | UUID -> companies |
| `contactId` | `contact_id` | ref | No | UUID -> contacts |
| `opportunityId` | `opportunity_id` | ref | No | UUID -> opportunities |
| `channel` | `channel` | select | Yes | Meeting, Call, Email, LinkedIn, Conference, Other |
| `occurredAt` | `occurred_at` | date | Yes |  |
| `owner` | `owner` | text | Yes |  |
| `outcome` | `outcome` | long | Yes |  |
| `archived` | `archived` | boolean | No |  |

### `signals`

| Logical field | Physical example | Kind | Required | Choices / reference |
|---|---|---|---|---|
| `name` | `name` | text | Yes |  |
| `companyId` | `company_id` | ref | Yes | UUID -> companies |
| `type` | `type` | select | Yes | Funding, Trial start, Regulatory, Hiring, Partnership, Other |
| `sourceUrl` | `source_url` | text | Yes |  |
| `publishedAt` | `published_at` | date | Yes |  |
| `observedAt` | `observed_at` | date | Yes |  |
| `fact` | `fact` | long | Yes |  |
| `interpretation` | `interpretation` | long | No |  |
| `relevance` | `relevance` | select | Yes | Unknown, High, Medium, Low |
| `status` | `status` | select | Yes | Candidate, Reviewed, Rejected |
| `reviewer` | `reviewer` | text | No |  |
| `reviewedAt` | `reviewed_at` | date | No |  |
| `caveat` | `caveat` | long | No |  |
| `archived` | `archived` | boolean | No |  |

### `followups`

| Logical field | Physical example | Kind | Required | Choices / reference |
|---|---|---|---|---|
| `name` | `name` | text | Yes |  |
| `companyId` | `company_id` | ref | Yes | UUID -> companies |
| `contactId` | `contact_id` | ref | No | UUID -> contacts |
| `opportunityId` | `opportunity_id` | ref | No | UUID -> opportunities |
| `owner` | `owner` | text | Yes |  |
| `dueAt` | `due_at` | date | Yes |  |
| `status` | `status` | select | Yes | Open, In progress, Done, Cancelled |
| `priority` | `priority` | select | No | High, Medium, Low |
| `completedAt` | `completed_at` | date | No |  |
| `detail` | `detail` | long | No |  |
| `archived` | `archived` | boolean | No |  |

### `runs`

| Logical field | Physical example | Kind | Required | Choices / reference |
|---|---|---|---|---|
| `name` | `name` | text | Yes |  |
| `scope` | `scope` | long | Yes |  |
| `windowStart` | `window_start` | date | Yes |  |
| `windowEnd` | `window_end` | date | Yes |  |
| `status` | `status` | select | Yes | Planned, Partial, Completed, Failed |
| `coverage` | `coverage` | long | Yes |  |
| `runReceipt` | `run_receipt` | text | No |  |
| `completedAt` | `completed_at` | date | No |  |
| `summary` | `summary` | long | No |  |
| `archived` | `archived` | boolean | No |  |

### `reports`

| Logical field | Physical example | Kind | Required | Choices / reference |
|---|---|---|---|---|
| `name` | `name` | text | Yes |  |
| `companyId` | `company_id` | ref | Yes | UUID -> companies |
| `periodStart` | `period_start` | date | Yes |  |
| `periodEnd` | `period_end` | date | Yes |  |
| `evidenceRefs` | `evidence_refs` | long | Yes |  |
| `facts` | `facts` | long | Yes |  |
| `interpretation` | `interpretation` | long | No |  |
| `status` | `status` | select | Yes | Draft, Reviewed |
| `reviewer` | `reviewer` | text | No |  |
| `reviewedAt` | `reviewed_at` | date | No |  |
| `archived` | `archived` | boolean | No |  |
