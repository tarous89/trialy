# Electronic signature decision — 2026-10-10

Formal signatures remain conditional and deferred. TrialAgents internal approvals and read acknowledgements are not marketed as regulated electronic signatures. No provider account, charge or signature email was created.

| Provider | Development access | Production terms and open questions |
|---|---|---|
| Docusign | Free developer account/demo environment; demo agreements are not legally binding | Dedicated API plans exist. The live pricing page could not be reliably retrieved; confirm a quote for the exact required plan, envelope volume, identity controls, evidence and life-sciences configuration. Do not substitute ordinary web-app pricing. |
| Dropbox Sign | Free API test mode; requests are watermarked and not legally binding | Official pricing currently advertises Essentials from 50 requests, $75/month equivalent with $900 yearly billing, and Standard from 100 requests, $250/month equivalent with $3,000 yearly billing. Dynamic page contains conflicting placeholder values: verify checkout/quote, billing frequency and applicable terms before purchase. Embedded signing requires Standard according to official help. |

Free development access is not a free production API. Neither provider's general electronic-signature availability establishes that a particular TrialAgents workflow meets clinical record/signature requirements. Before integrating, select the provider and authorized spending, confirm identity/reauthentication requirements, signature meaning, exact source binding, evidence export, data residency, verification, retention and customer validation responsibilities. Preserve signed output and evidence as new immutable originals, verify signed callbacks, and use idempotent request/callback identifiers. Test mode can still send emails; use explicitly designated test recipients only.

Sources reviewed:
- https://www.docusign.com/products/apis
- https://ecom.docusign.com/plans/developer
- https://sign.dropbox.com/products/dropbox-sign-api/pricing
- https://help.dropbox.com/plans/how-much-does-the-dropbox-sign-api-cost
- https://developers.hellosign.com/
