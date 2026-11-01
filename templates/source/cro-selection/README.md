# CRO Selection 1.0.1

Sponsor-side selection for a small biotech team: shortlist, requirements, bid comparison and evidence-backed human decision. No app-specific accounts or auth; existing TrialAgents account and app/data permissions apply. Optional in-app branding is omitted; retain the platform watermark.

Canonical catalog: `templates/apps/life.cro-selection-1.0.1.json`. Source and CSS here generate that file and the fictional offline `preview.html` with `node scripts/build-selection-template.mjs`. Build checks reject drift. The offline preview is illustrative, not proof of backend saves.

`schema.example.json` contains valid scalar field definitions; `schema_mapping.example.json` shows logical mappings. Replace type placeholders only with actual authorized table UUIDs. Save parent records first. Demo data is fictional and is never installed by the template.

Use current template authoring/usage guidance. Read catalog documentation for full creation, revision, recovery, permission and automation instructions. Native layout orders/hides screens and orders drawer fields; hidden drawer fields remain reachable through Show additional fields; fixed analytical cards/matrices retain their meaning. Read coverage is bounded to 200 rows per role; incomplete coverage blocks changes and approval. Use narrower authorized tables or another workflow for larger datasets.

Return an approved decision to Draft before modifying its supporting evidence. No automatic award, currency conversion or external supplier outreach. Approval records represent human decisions; independently changed database evidence must be rechecked before relying on them.

## Verification

`node --import tsx --test tests/selection-template.test.ts tests/selection-integration.test.ts`

`node --import tsx scripts/test-selection-browser.ts`

`npm run build`

See QA.md for checked behavior and live-environment limitations.
