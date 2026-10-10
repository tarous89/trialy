# Trialy focused acceptance and evidence

This is an implementation evidence map, not a claim of regulatory compliance. Customer intended use and their operating procedures determine validation and record requirements. Test only the affected critical paths after a change; do not build a large duplicate test programme.

| Requirement | Evidence now | Remaining acceptance |
|---|---|---|
| Tenant and AI isolation | SQL-backed permission tests, hidden-field search/view/history and derived-field checks | Real ChatGPT connection; UI-only human data path remains disabled |
| Preview before authoritative save | Discard, digest, stale revision/configuration, retry and atomic bulk tests | Human end-to-end preview/save in both surfaces |
| Original preservation | Bytea payload, hash validation, original versions, failed extraction check | Managed backup/restore drill and representative customer formats |
| Controlled records | Append-only revisions, audit, original and approval triggers; new revisions after approval | Separate runtime DB login and operational access review |
| File control/training | Exact-version review and acknowledgement tests; retained source references | Human review/acknowledgement usability |
| Preservation/export | Archive blocks writes; retention cannot shorten; holds recorded; JSON/HTML copies | Customer retention policy and controlled backup retention |
| Configurable operations | Typed fields, unique values, numeric formulas, calendar filtering, aggregate queries, templates | Representative CRO evaluation and study-oversight scenario |
| Background processing | Leased retries, independent worker, no destructive extraction failure | Live worker recovery and scheduled permission-revocation scenario |
| Account connection | Local OAuth PKCE/code replay/token rotation/account binding tests | Host return/automatic workspace opening, app availability by account |

## Small representative scenario

Use only synthetic data. Install RFP oversight v2 in a new workspace. Add an RFP, two CROs and proposals; upload one small source. Link evaluation rows to each proposal and an exact source version, enter criterion score/weight and compare weighted totals grouped by proposal. Confirm selection and rationale in the Studies/Risks and decisions tables, then link contracts, change orders and commitments. Each change uses preview and confirmation; selection is a human decision, not automatic AI award of a contract.

Verify a hidden financial field and its dependent calculation are absent from the model. Replace the proposal original, confirm the prior original and approval remain identifiable, and acknowledge the intended version. Export the workspace, run the offline verifier, and compare the source checksum. An unsupported extraction must leave the original downloadable and show only a quiet availability flag.

## Onboarding and distribution

1. Connect the existing private Trialy plugin using the designated test ChatGPT account. Complete signup/consent and verify it returns to the initiating host connection.
2. Open the workspace, create a synthetic record, preview/discard, then preview/save. Read the result from a separate conversation and standalone session.
3. Exercise embedded upload/download in that host. If host file handling or automatic opening is unsupported, record the actual behavior and keep the standalone path available; do not advertise automatic behavior as proven.
4. Record account plan, app availability, approved permissions and tested host behavior. Trialy adds no organizational ChatGPT-account requirement.
5. Test disconnect/reconnect, logout and revoked access without sending messages to real recipients.
6. Customer production remains gated on recovery evidence, identity hardening, any required provider integrations and customer intended-use review.

## Brand cutover

Keep Trialy repository/internal IDs and the existing Trialegions product separate. Before public rename, explicitly select the destination domain and authorize the replacement. Inventory old routes/data, agree migration/redirects, verify backups and OAuth callback/issuer behavior, update brand configuration and plugin listing, perform a synthetic connect/save/read-back check, and retain a rollback route. No current Trialegions data or domain is changed by this development work.


## Additional implementation evidence

- MFA: encrypted setup, confirmation, password-plus-code login, replay rejection, single-use recovery and disabling checked using synthetic accounts. Real-user authenticator/browser acceptance remains for later.
- Permissions: table AI exclusion, document read/write/inspection restrictions and inherited-folder movement-bypass checks pass.
- External exchange: selected columns only, extra-field rejection, idempotent submission, immutable intake, owner acceptance and link revocation checks pass. Link-holder identity is explicitly unverified.
- Automations: event batching, grant revocation, authorised draft creation, prevention of self-triggering, and Berlin DST gap/overlap checks pass.
- Template upgrades: a representative upstream field addition preserves renamed local tables and existing records; conflicting changes require review.
- Recovery: isolated synthetic data-directory backup and restore passed. Exact schema hashes and evidence are in `recovery-synthetic.json`; this does not replace the managed Render restore drill.
- Current code deployment: `f9cca6b`, both Render services live. Build and 26 reported checks passed. ChatGPT connection/host acceptance and production recovery expectations remain outstanding.
