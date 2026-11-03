# Account settings and subscription operations

Settings now collect first and last names, expose inherited invitation restrictions, and list the Team offer from the public TrialAgents landing page (€490/month). Subscription state is informational; no quotas or paywalls are introduced.

Set `STRIPE_SECRET_KEY` as a secret on the web service to activate Stripe Checkout. Use a test key in staging and verify payment and cancellation before setting the live key. No secret belongs in source control. Configure the Stripe customer portal for subscription management. Checkout uses server-owned EUR monthly pricing and binds the session to the authenticated account. Repeated clicks reuse an open session. Loading Subscription reconciles its stored checkout with Stripe; only an owned, paid, completed session is linked, and its current subscription status is read from Stripe. There is no webhook requirement for this informational plan display.

Support submissions persist before delivery. The worker sends them using the existing Resend credentials to `SUPPORT_EMAIL` (default `support@trialagents.com`), retaining the request reference and sender details. Temporary errors retry with the same provider idempotency key. Historical requests are retained without sending an old-message backlog. Monitor `support_delivery_retry` errors and `support_requests.delivery_status`.

Migration 054 assigns unfiled apps to a default project and persists invitation restrictions atomically on acceptance. Project placement continues to preserve the app's original data scope. Invitation restrictions and parent restrictions remain enforced by existing authorization, including AI access.
