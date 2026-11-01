# CRO RFP Management 1.2.1

Six-screen internal workspace for small CRO teams: bid overview, intake, requirements, approved-content library, review gates and proposal preparation. Existing TrialAgents authentication, access, trusted reviews and logs apply. No app-specific accounts, sponsor portal or outbound submission. The host supplies the official linked TrialAgents watermark.

The catalog lives at `templates/apps/life.cro-rfp-management-1.2.1.json`. Editable source, stylesheet, catalog metadata, exact schemas, fictional demo, preview and setup/automation instructions live here. Build with `node scripts/build-rfp-template.mjs`; use `--check` to verify catalog/preview reproducibility. The main build enforces this check. No demo data is inserted into user databases.

Use digest-pinned MCP catalog discovery, current authoring/usage guidance, verified scalar schemas and real bindings. Preserve requestKey, app identity and expected versions for saves/retries. Native layout uses tracker:layout and reviewed prepare_tool_layout; reordering never changes data access. Optional automations are configured only after save and explicit approval.

Validation commands: `node --import tsx --test tests/rfp-template.test.ts tests/rfp-integration.test.ts` and `node --import tsx scripts/test-rfp-browser.ts`. These exercise the real runtime, disposable database, reviewed writes, production frame and native layout. See QA.md for release evidence. Catalog publication does not prove live deployment or activation.
