# Experiment Notebook 1.2.2

Internal nonclinical notebook for small biotech/research teams. Uses the existing TrialAgents account; no app authentication or additional accounts. The trusted host supplies the official icon linking to https://platform.trialagents.com.

## Package and build

Canonical source/CSS, catalog metadata, complete scalar schemas, fictional demo and preview live here. Run `node scripts/build-notebook-template.mjs`; `--check` verifies exact generated catalog/preview. Catalog: `templates/apps/life.experiment-notebook-1.2.2.json`. The repository build checks reproducibility. Only the catalog JSON is loaded by MCP; all mandatory setup and automation documentation is embedded in it. v1.2.1 was an unpublished uploaded candidate and is not registered.

## First use

Read current authoring/usage/design guidance and this exact catalog version/digest. Reuse authorized tables or propose the seven documented schemas through trusted review. Use actual saved UUIDs, physical field keys, schema versions, bindings and manifest permissions. `schema_mapping.example.json` includes explicit multiple:false and select options. Relations are scalar text UUIDs. URLs and narratives are text. Optional empty values are null.

Prepare using the catalog API and one stable requestKey. Preview with no fictional records; save once, verify receipt/app ID and reopen. In the overview create a research project, in Protocol references create a method version, then create an experiment referencing those saved IDs. Every role has reviewed create/edit/duplicate/archive actions. Archive is soft deletion; original versions and dependencies are checked. A proposal is never a saved record. Drafts remain until closed or refreshed after a confirmed save. Never retry an ambiguous proposal without reconciling its receipt.

## Evidence and completeness

The source reads a bounded 700-row window per role. Search/paging cover that window, not the whole database. Missing/denied bindings, missing fields, unknown totals, short pages, arrays and exhausted reads withhold derived results and block writes; narrow authorized bindings through ChatGPT for larger datasets. Same-analyte, same-unit readings are grouped separately by condition AND time point. Mean and sample SD are descriptive only. No significance, biological replication or unit conversion is inferred.

Return reviewed reports to Draft, reviewed findings to Draft, and completed experiments to Needs review before changing their supporting evidence. Referenced protocols cannot be rewritten: duplicate a version. These app guards do not impose foreign keys or immutable history on independent database edits. Not a validated ELN, clinical/patient record system, GxP signature system or instrument integration.

## Layout, access and optional work

Native `tracker:layout` uses templateLayoutSchema and reviewed customLayout with the original app version. Screen and column order/visibility persist; drawer Additional fields keeps hidden fields accessible. Layout never changes bindings or permissions. Custom screens inherit app-level authorization; hiding a tab is not security.

The app calls only records.read and records.propose. No scheduler, email or connector dependency. Automation is optional, configured only after saving using the shared platform workflow. See MCP_USAGE.md and AUTOMATION_RECIPES.md. Repository registration, deployed MCP discovery, app save, background activation and delivered email are separate outcomes.
