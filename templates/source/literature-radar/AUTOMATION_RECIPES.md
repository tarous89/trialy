# Optional automation

## mode

optional

## whenUseful

Manual search is fully supported without scheduling. Optionally, after the app is saved, an owner may approve weekly public-publication discovery via the shared TrialAgents ChatGPT runner, with a separately reviewed TrialAgents email only after verified new committed records.

## readRequirements

Read the selected topic current scope version, keywords/excluded terms, allowed sources and all existing saved DOI/PMID identities in the owner-authorized TrialAgents app before searching. Search public metadata for papers since the approved cutoff. Verify DOI/PMID, title, journal, author and publication date against official sources; provide source URL, verifiedAt, firstSeenAt and matching rationale. Dedupe DOI/PMID globally, link existing master publication with a new topic match instead of cloning. Flag uncertain/title-only matches for review, never publish unverified metadata, full-text reproductions or inferred scientific findings. Propose only authorized new publication/match records, await exact confirmed receipts, then save a run outcome with cutoff, coverage, checked sources, new saved count and completion. No new confirmed saves permits no_update only with complete coverage and an approved quiet policy. Partial or failed coverage => report visibly and do not claim completion. Do not change previous screening, scope or reviewer decisions automatically. Only completed authorized reads and owner-approved sources qualify. Use one current topic scope revision, normalized DOI/PMID, current app grants, UTC cutoff, and evidence dates. Never treat partial coverage as no_update. Owner must verify timezone, expiry, scopes and actual trigger before activation. Stable keys: literature_discovery_v1 and literature_completion_email_v1. Reuse IDs/versions on edits. Choose owner-confirmed weekly timezone/anchor, explicit expiry and current app-bound read/write scope. Without approved standing write authority return private draft findings for manual approval; never infer a grant. Never advance cutoff on partial/failed coverage.

## outputContract

Save only reviewed publication IDs, topic matches and run history to the existing authorized tables with exact request keys and receipts. Keep pending/unreviewed metadata outside authoritative counts. For complete search with zero accepted additions use no_update only if the approved quiet policy permits silence; otherwise record a completed required report. Partial/failed/denied search may not send completion email. Separate Email automation: fixed approved message, owner plus explicitly authorized TrialAgents team members only; manual after-success, not an independent schedule. No ChatGPT email. Proposed tasks are never active by template inclusion. Fixed email subject: Literature update available. Fixed body: Open https://platform.trialagents.com to review your authorized literature updates. Do not invent interpolation. Keep disabled definitions disabled; archive suspends work, restore/copy does not activate it. Delivery failure never reruns completed research. Logs show outcomes; no live readiness is implied.

## promptExample

For the saved Literature Radar app, read the current authorized topic criteria and scope revision, current publication DOI/PMID index, sources and last confirmed cutoff. Search PubMed and owner-approved public metadata for recent nonclinical methods publications. Deduplicate globally by normalized DOI/PMID and by exact topicId:publicationId. Verify source URL, publication and verification dates. Propose additions and request human approval, reconcile receipts, save only an accurate source-coverage run record. Return partial on unavailable sources; do not claim no_update from incomplete coverage. Do not send external email. If asked, request separate TrialAgents owner approval for weekly research and a fixed-text completion notification under current team access.

Default: manual research with no scheduled jobs. Read the current automation guide for typed configuration, exact expiry, triggers and existing grant scope. Suggested weekly research uses the owner's confirmed IANA timezone and anchor date. Stable keys prevent duplicate definitions. A separately reviewed completion email uses a manual trigger and fixed text, attached only to successful new committed records; no independent schedule or duplicate delivery path. No actual schedule or email was activated by this package.
