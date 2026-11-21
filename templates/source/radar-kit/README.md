# Bio Radars kit 2.0.0

Shared source for every Bio Radar app (scope: [BIO_RADAR.md](../../../docs/product/app-template-blueprints/apps/BIO_RADAR.md) §2, §5 and §7). A radar is a definition on this kit; the kit supplies the screens, the common tables, the brief builder, the research-template editor, the source report, the digest and alert, and the recommended automations.

## Files

| File | Purpose |
|---|---|
| `kit.mjs` (+ `kit.d.mts`) | Pure functions from a radar definition: installer schema (common tables + radar fields), `radar.v1` output contract, research template defaults with the 8 locked rules, recommended automations (scan + digest as one automation, alert after the scan), function declarations, the app's run-time definition (`appRuntime`) and catalog documentation for assistants. |
| `radar.source.js` | App source written to the v2 app contract (`'use trialagents v2'`, the platform kit `kit.*` and styles): Overview, the tracker, Events (To review / All events / Calendar), Scopes and, for owners, Settings (research template, lookback, language). One batched read per screen; filters, search, sort and paging on loaded data; direct saves (`records.save`) with Undo; messages as notices. No header, banner, footer or layout gear of its own. |
| `radar.css` | The few app styles the platform kit lacks (lists, pills, agenda), `rd-` prefix, written on the kit's `--k-` tokens. |
| `brief-core.js` | The brief builder, shared by the `brief` function and the app (template, last runs): template + locked rules, active scopes with named sources and since dates, current tracker fields (custom ones included) and the return format. |
| `functions/` | Read-only app functions (E7): `brief`, `digest_summary`, `alert_summary`, and their shared helpers. |
| `archive/<version>/` | Frozen copies of earlier kit versions. A radar's `"kit"` pins the version it was released on. |

## Kit versions

| Version | Used by | Changes |
|---|---|---|
| 1.0.0 (`archive/1.0.0/`) | Trial Radar 1.0.0 | First release. |
| 1.1.0 (`archive/1.1.0/`) | Pipeline Radar 1.0.0, Literature Radar 2.0.0, Deal Radar 1.0.0, Funding Radar 1.0.0, Patent Radar 1.0.0, Market Radar 1.0.0, Regulatory Radar 1.0.0 | New definition keys (below); multiline scope fields; disclaimer in the footer, digest and alert; item-based digest section with disclosed amounts per currency; thousands separators in the digest; a Coming up window per radar; drawers scroll as a whole so the footer never covers a field. |
| 1.0.1 (`archive/1.0.1/`) | Trial Radar 1.0.1 | Kit 1.0.0 with batched reads (`records.readMany`) and no other change, so Trial Radar keeps its 1.0.0 behavior. |
| 1.2.0 (`archive/1.2.0/`) | Pipeline, Deal, Funding, Patent, Market and Regulatory Radar 1.0.1, Literature Radar 2.0.1 | Kit 1.1.0 with batched reads: the shared reads (settings, scopes, runs, programs) are one call and the Overview's reads are one call. Results, messages and the call budget are unchanged; without the capability each read is one call. |
| 2.0.0 (current) | Trial, Pipeline, Deal, Funding, Patent, Market and Regulatory Radar 2.0.0, Literature Radar 3.0.0 (drafts until the owner approves them, O4) | The app rebuilt on the platform kit and the v2 contract (7.3: G2–G8, G11, P3–P5, P9): no own header, as-of pill, layout gear, footer or disclaimer bar (the disclaimer stays in the brief, digest and alert and is a quiet line on the Overview); messages as notices instead of 7 banners; direct saves with Undo instead of `records.propose`; values edited in place, side panels for many fields; Scopes as their own screen; Settings for owners only (research template, lookback, language) with no Automations, version history or Build now panels; the working scope kept per person (`output.context`). Tables, output contracts, recommended automations and helper functions are kit 1.2.0's, unchanged (Trial Radar keeps kit 1.0.1's through `dataKit`), so 1.x copies upgrade in place (`upgradeFrom`). Options `heading`, `layoutProfile` and `demoLabel` are dropped. |

Definition keys added in 1.1.0 (all optional):

| Key | Meaning |
|---|---|
| `kit` | Kit version the radar is built on. Missing means the current kit. |
| `dataKit` (2.0.0) | Kit whose tables, output contracts, recommended automations and helpers the radar keeps (its predecessor's), when they differ from the current kit's. Trial Radar 2.0.0 sets `1.0.1`. |
| `upgradeFrom` (2.0.0) | Earlier approved versions with the same installer schema and helpers that an owner can upgrade in place; required for a kit 2.x radar. |
| `userOwnedFields` | Extra tracker fields the team owns (for example a reading queue). Research never writes them. |
| `trackerOutput` | Publish the tracker as a `radar.v1` output (`<prefix>.<trackerTable>`, one writer) with a `note` for readers. |
| `itemNameField` | Field that names an item when it isn't `title` (for example `company_name`). |
| `disclaimer` | One line in every email and the brief (for example "Not legal advice."); kit 1.1.0–1.2.0 also showed it in the footer, kit 2.0.0 as a quiet line on the Overview. |
| `scopeFields[].multiline` | Textarea, up to 6,000 characters (for example a synthesis prompt). |
| `comingDays` | How far Coming up looks, on the Overview and in the digest: 90 by default (Patent 730, shown as 24 months; Market and Regulatory 180). |
| `dateField.upcoming: false` | The date is in the past (publication, announcement): no "Coming up" panel or digest section. |
| `digestSection.source: "items"` | Build the digest section from tracker rows changed in the run instead of events: `filter`, `lineField`, `amountField` + `currencyField` + `disclosedField` (per-currency totals), `countField` + `countLabel`. |

## Add a radar

1. Create `templates/source/radars/<slug>/` with `radar.json` (copy Trial Radar's and change: id, version, name, prefix, trackerTable/Label, item labels, cadence, scopeFields, trackerFields, naturalKey, dateField, eventKinds, digestSection, listColumns, optionLabels, sources, instruction, examplePrompts), `catalog.metadata.json` (description, tags, whenToUse, whenNotToUse) and fictional `demo_data.json`.
2. Run `node scripts/build-radar-templates.mjs`. It builds the current definition and every released one under `<slug>/archive/<version>/` (each with the kit it pins) and writes `templates/apps/<id>-<version>.json`, `schema.example.json`, `<slug>.preview.html`, the radar's events entry in `templates/contracts/outputs.json` and its line in `templates/catalog-installers.json`.
3. Add the radar to `tests/radars-v2.test.ts` and `tests/radars-v2-integration.test.ts` (every screen and panel, direct saves, owner-only settings, empty and loading states, install and the design check at three widths), and write its README and QA.

Never change a released version: copy its files (radar.json, metadata, demo data, schema, preview, README, QA) to `templates/source/radars/<slug>/archive/<version>/`, then bump `version` in `radar.json`; the generator keeps building the archived copy byte-identically and points its installer entry at the archive. A released radar pins its kit with `"kit"`; before changing the kit for new radars, copy the current files to `archive/<version>/` so released packages stay byte-identical (the `--check` run fails otherwise), then bump `KIT_VERSION` in `kit.mjs`.
