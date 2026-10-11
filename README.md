# Trialy — Database, Code Execution and Tools for ChatGPT

Updated 11 October 2026. This is the active scope. It supersedes the previous template/workflow-led scope and roadmap; the uploaded initial brief remains a historical source, subject to the user's subsequent decisions.

Repository: `tarous89/trialy`. Development name: **Trialy**. A future public rename to **Trialegions** is a separate cutover. Do not change the existing Trialegions, TrialAgents or Intel applications.

- [Current development steps](DEVELOPMENT.md)
- [Foundation architecture and dependency map](docs/FOUNDATION_ARCHITECTURE.md)
- [Decision and implementation history](HISTORY.md)
- [Historical scope](docs/archive/scope-before-foundation-reset.md)
- [Historical development checklist](docs/archive/development-before-foundation-reset.md)

## Product boundary

Build a persistent foundation that ChatGPT can use as a database, run code against, and access tools through. ChatGPT designs the user's application and logic. Trialy supplies data, isolated execution, authorized tool access and durable evidence.

We are **not currently building templates, specific clinical workflows, a fixed review engine, or a catalogue of business automation actions**. Do not add those to the implementation plan unless the user explicitly changes the scope. Biotech teams remain the intended audience; their use cases do not dictate database schemas, approval stages or mandatory screens.

The first complete path is: generate code → run it on permitted data without authoritative writes → inspect results and proposed changes → confirm the exact proposal → persist changes and/or the executable version → invoke again or schedule within explicitly approved permissions.

## Foundation responsibilities

1. Persistent user-defined data, relationships, originals, queries and controlled mutations.
2. Isolated execution of user/ChatGPT-generated code; bounded compute, temporary storage and network/tool access.
3. Saved, versioned functions with input/output contracts and declared capabilities.
4. General execution jobs, status/results, cancellation, schedules/events and recovery.
5. A tool registry and gateway shared by interactive and background execution.
6. Authentication, tenant isolation, scoped credentials and once/future authorization.
7. Temporary experimentation, exact proposal confirmation, transactional writes, audit and provenance.
8. A minimal ChatGPT interface for data, functions, runs, results and permissions; standalone as backup/admin and for deliberately excluded data/actions.

Custom UI generation beyond this minimal interface is not a prerequisite for the first foundation milestone. Existing generic table/form views remain usable clients, not the limit of what code may produce.

## Decisions retained

- Keep the existing repo and Render services; make the correction on `foundation-reset` before merging runtime changes.
- Use PostgreSQL for committed data and original file bytes. No vector database or separate file service is required now.
- No Auth0 requirement. Existing self-hosted authentication, MFA and OAuth remain.
- Trialy is not fit for patient-level data. Retain the intended-use notice; do not introduce patient-content screening or quarantine. Professional personal information is allowed.
- Human and model permissions remain distinct. Generated code cannot expand either permission set. Human consent need not inherently mean leaving ChatGPT; a trusted confirmation path must be implemented and verified before claiming it works there.
- Experiments and code drafts are not official records. Explicit saving starts persistent version history; a saved function is not automatically granted permission to execute side effects.
- Preserve originals even when extraction/OCR fails. Derived-data failures remain quiet availability flags. Never claim a source or data change is saved before durable commit.
- Allow one execution or future executions within a defined scope. A material code, tool or permission change must not inherit broader approval silently.
- Preserve existing records, revisions and audit evidence during refactoring. No automatic migration of old business rules into new executable code.
- Keep integrations requiring new developer accounts and real ChatGPT host testing deferred as requested. Backend access to tools connected in ChatGPT is not automatic.
- No real-recipient test messages. Signature providers and brand cutover are outside this foundation correction.

## Current implementation versus target

The existing app has transactional records, originals, extraction, permissions, auth, audit/version history, MCP and deployed web/worker services. It also has legacy business-specific screens, templates and rules. Those are frozen pending separation, not newly endorsed product requirements.

The code execution foundation is implemented: bounded QuickJS/WASM JavaScript, permission-filtered tools, exact proposals and atomic commit receipts, immutable saved functions, leased jobs, once/future grants, schedules, result-file saves and shared standalone/embedded controls. Template/business builders are absent from the default experience; existing management remains at `/?legacy=1`. No historical data is removed.

See [the implemented execution contract](docs/EXECUTION.md) for APIs, limits, temporary retention and remaining boundaries. Live external providers and real ChatGPT host acceptance remain deferred. The existing Render services are reused, without a new sandbox account or infrastructure service.

## Development and operation

Node.js 24 and npm are required. `npm ci`, `npm run build`, and `npm run demo` start a loopback-only synthetic PGlite demo at http://127.0.0.1:4317. Do not use customer data in it. Docker includes Poppler, Tesseract and Python for extraction.

For PostgreSQL, configure `.env` from `.env.example`, including DATABASE_URL, SESSION_SECRET and PUBLIC_URL; then run `npm run db:migrate`, `npm run build`, `npm start`, and `npm run worker` in a second terminal. `npm run check` and `npm test` are verification commands.

Existing `/auth/login` provides sign-in/signup. OAuth uses PKCE; MFA/recovery codes exist, but email verification/password recovery are still absent. [ChatGPT setup](docs/CHATGPT_SETUP.md) and [operations](docs/OPERATIONS.md) describe existing behavior; their legacy feature instructions are operational history, not the future product backlog.

Legacy data/file previews live in one web process for up to 24 hours and may disappear on restart. New experiment/proposal/function-preview staging lives in PostgreSQL with a 24-hour expiry. Confirmed data is in PostgreSQL. Keep one web instance until shared temporary preview storage is implemented. Production recovery targets, actual managed backup restoration, restricted runtime credentials and monitoring remain unfinished; no zero-loss or blanket clinical-compliance claim is made.
