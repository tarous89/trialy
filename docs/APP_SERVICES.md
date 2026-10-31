# App services release

The builder contract is [APP_SERVICES.md](../plugin/trialy/skills/trialy-workspace/references/APP_SERVICES.md), also available through `read_app_services` on MCP. This release adds no app-specific authentication system or seat purchasing flow.

## Management scope revision — planned

The [revised app configuration scope](product/APP_CONFIGURATION_AND_AUTOMATIONS.md) places platform actions and ChatGPT research definitions in one app-linked Automations destination. Keep executor and trigger independent. TrialAgents still owns email, deterministic jobs and approved connector/LLM calls; the ChatGPT connection is not required for those independent jobs. Research-to-email uses the existing approved completion dependency, with separate outcomes and no duplicate schedule.

Expanded platform rows edit typed action, timing, mappings and recipient policy through the same schema/review as MCP. The target lifecycle offers disable/enable/edit/history, with retirement through parent app deletion and preserved receipts/data. This is documentation for the next UI/lifecycle work, not a change to current service APIs. Optional service failures remain isolated from app reads, saves and rendering; real access revocation still applies.

## Operation

Apply migration 046 using the existing migration login. `npm run db:migrate` also provisions the existing restricted web/worker roles and grants the new tables/functions from `ops/runtime-role.sql`. Existing web and worker services are reused. Do not deploy the worker without migrations and runtime role provisioning.

Configure a domain-restricted Resend sending key as `APP_NOTIFICATION_RESEND_API_KEY` on the worker. Register `https://platform.trialagents.com/notifications/webhook` for `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, `email.suppressed`; put its signing secret in `RESEND_WEBHOOK_SECRET` on the web service. Keep secrets outside git and app source. The sender is fixed to `notifications@trialagents.com`. The web service only enqueues requests; it does not need the sending key.

The worker uses existing PostgreSQL for its durable queue. Three external-job loops run independently of short function execution; one slot is reserved for email. Each external job has a deadline, lease and token. Heartbeats extend leases. Lost connector leases become unknown and are never automatically replayed. Email retries use a stable provider idempotency key, stop before the provider's 24-hour window, and preserve terminal receipts. An interrupted request may have executed externally; cancellation cannot retract it.

Webhook verification uses exact raw bytes, a timestamp bound, constant-time HMAC comparison, and an append-only deduplicated database insert before acknowledgment. Delivery events may arrive out of order; terminal complaint/bounce/suppression states take precedence over sent/delivered. Suppression is global to the sending platform. Run history and job inspection never return stored provider credentials.

Limits: 1,000 external jobs per workspace per rolling day; action-specific daily limit defaults to 100; connector limits still apply. 64 KiB request and response size; background timeout max 30 minutes. This supports ordinary LLM API requests, not unlimited model outputs or token streaming. Provider monetary limits must be configured in the provider account.

Public links have isolated identities with no login credentials and no direct database browsing. Generated code retains its isolated renderer and capability allowlist. Public routes explicitly restrict calls and change previews to the shared app. Team invitations verify the invited email and possession of the token; existing broader permissions remain independent. Revoking a share removes only its grant, preserving separately edited grants.

## Validation

`tests/app-services.test.ts` exercises restricted production roles, exact approval, durable email retry, duplicate delivery events, suppression precedence, revoked actions, committed database triggers, occurrence deduplication, cycle prevention, LLM-shaped nested requests exceeding ten seconds, public app isolation and reviewed editing, and email/account matching.

`tests/visual/app-services.spec.cjs` exercises the sharing controls, public navigation, refresh persistence and revocation on desktop/mobile. Existing connector, runtime-role, access and function tests remain required.

Deploy the existing web and worker from the same commit. Verify their exact live deploys, web `/health`, MCP `read_app_services`, worker `app_services_ready` and continued worker heartbeat. A successful mock LLM call is not evidence of paid-provider acceptance; customer provider credentials remain user configured.

## Published apps and drafts

App preparation writes only owner-scoped preview rows. Saved app routes, public links and the normal app list use the committed component; ChatGPT can recover its own drafts separately. Preparing or revising a draft never changes the published component. Confirmation checks the exact digest and current saved version, then atomically commits the update and its receipt. Stage schema changes with the tracker update so its schema and app publish in one transaction.

Custom draft evaluation has one separate bounded slot; published custom apps retain two execution slots and per-app concurrency keys. A draft cannot occupy a published app slot. Periodic checks compare the viewer's effective access to that app, not unrelated workspace changes. Approved updates load at the existing route when the viewer has no local edits; local edits remain visible until the viewer chooses to discard and load the update. Only actual local edits trigger leave warnings. Access revocation still clears protected content immediately.

Public links follow compatible published revisions, retaining their original frozen data grant. Publishing does not broaden a public link's access. A draft never appears on the public route.
