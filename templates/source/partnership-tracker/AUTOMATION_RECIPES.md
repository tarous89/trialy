# Optional Partnership Tracker automation

Metadata describes possible work; nothing is active. Manual tracking and on-demand ChatGPT research require no runner, scheduler, mail action or external account. App loads and saves make no automation calls.

## Weekly public partner discovery

Stable authoringKey: partnership_discovery_v1. Save the app first, inspect current setup/automation guides and existing definitions, and reuse IDs on retry. Use the shared owner/workspace ChatGPT runner, never one ChatGPT Task per app. Suggest Monday 09:00 in the owner-confirmed IANA timezone with an approved anchor, expiry, source scope and limits. Use a 14-day overlapping research window and coalesce missed windows under the current platform contract. Prefer supported Work chat, high reasoning and the most capable available model, while distinguishing requested preferences from observed host settings.

Prompt: Read the authorized organization, program, opportunity and signal records completely. Research official public pharma/corporate news, licensing announcements and registries for the selected nonconfidential program. Identify company legal identity, official URL and publication/verification date; distinguish source facts from tentative fit. Do not disclose confidential dossiers, private contacts, terms or patient information. Deduplicate company identity plus official source URL and publication date against saved records and the last successful coverage window. Propose new signals in New status. Save only with separately approved existing write scope, current grants and reconciled receipts; otherwise return the draft for human review. Never invent a saved record or advance coverage after partial failure.

Return searched sources, duplicates, new committed count, exact record IDs, coverage and known gaps. Complete empty results may use no_update only with an approved quiet policy. Denied, expired, partial or failed reads are blocked/partial; these never trigger completion mail. Ambiguous writes reuse/reconcile original receipts. Changes in configuration retain disabled state, scope and hidden settings; archive suspends work, restoring/copying does not activate it. Outcomes belong in Logs; no standalone Delete action.

## Optional dependent email

Stable authoringKey: partnership_discovery_email_v1. Use the inactive automation.example.json shape only after substituting the saved app UUID/current version, approved expiry and registered owner plus explicitly selected teammates with current app/data access. Confirm a separate single-step TrialAgents email action with a manual trigger; attach its saved ID/version as completionActionId/completionActionVersion on the approved research definition. Do not add a second timer, database notification or ChatGPT email action.

Subject: Partner discovery ready

Body: Open https://platform.trialagents.com to review newly saved partner signals.

Use fixed text. Send only for verified successful research with new committed signals and reconciled receipts under the owner's approved policy. No mail for no_update, partial/blocked/failed results, pending human review or missing receipts. Delivery failure does not rerun research. The platform enforces current access, recipient authorization and its existing delivery/coalescing limits. Never infer permission from contact fields or bypass limits. Actual delivery must be verified separately.

## No-automation path

Create and use all eight role tables and the six-screen app without any schedule or mail action. Enter companies, opportunities, evaluations, meetings and signals via reviewed forms. Use the Discovery prompt manually when desired. Setup failure or declined connection leaves this path fully usable.
