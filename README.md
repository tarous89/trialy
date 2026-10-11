# Trialy — Shared Data and a Home for What ChatGPT Builds

Updated 11 October 2026. This is the active scope. It supersedes the previous template/workflow-led scope and roadmap; the uploaded initial brief remains a historical source, subject to the user's subsequent decisions.

Repository: `tarous89/trialy`. Development name: **Trialy**. A future public rename to **Trialegions** is a separate cutover. Do not change the existing Trialegions, TrialAgents or Intel applications.

- [Current development steps](DEVELOPMENT.md)
- [Foundation architecture and dependency map](docs/FOUNDATION_ARCHITECTURE.md)
- [Decision and implementation history](HISTORY.md)
- [Historical scope](docs/archive/scope-before-foundation-reset.md)
- [Historical development checklist](docs/archive/development-before-foundation-reset.md)

## Product boundary

Trialy is the persistent workspace behind the things ChatGPT builds. ChatGPT designs interfaces, application logic and data reconciliation. Trialy supplies a connected database, an organized home for saved components, authorized tools and background execution, with access control and traceable changes throughout.

Users build their database while doing their work; database maintenance is not a separate routine they must perform. A study tracker and a conference tracker can reference the same investigator and organization, while retaining separate study participation and conference follow-up records. Shared means connected within the authorized workspace, never globally merged across customers or permissions.

Projects and folders organize saved components: forms, trackers, visualizations, presentations/files, mixed interfaces and workflows with actions. These are examples of user-created content, not platform templates or a fixed component catalogue. Users can move projects between folders and components between projects without copying shared entities or breaking stable references. Moves must recheck access and must not silently expose data or expand execution grants.

The full permitted experience belongs in ChatGPT, with the standalone app on the same backend as backup/admin and for data deliberately excluded from AI. A durable generated interface host is part of the product scope; a minimal data/function/run panel alone does not complete it.

## Foundation responsibilities

1. Connected, user-defined data with stable entity identities, relationships, originals and provenance across projects.
2. AI-proposed normalization and reconciliation: preferred values, aliases, source observations, conflicts and reversible match/merge decisions.
3. Projects, folders and saved components with stable IDs, versioned source/configuration, shared-data bindings and organization controls including drag and drop.
4. Isolated hosting of ChatGPT-generated interfaces, plus bounded server-side code execution. Saved UI must not receive host credentials or bypass human/AI permissions.
5. A trusted tool gateway for authorized services, including future email, calendar and conditional signature adapters.
6. Saved functions, general jobs, schedules/events, cancellation and recovery so authorized components can run while ChatGPT is closed.
7. Granular human and AI permissions, team/external sharing, once/future authorization and scoped access for collecting information from others.
8. Preview before official saving, exact commits, audit/version history and recoverability of saved data, code, components and relationship decisions.

## Reconciliation and saving decisions

- ChatGPT may judge that two differently named entries represent the same entity; do not require hardcoded business matching rules or a confirmation for every spelling variation.
- Preserve each original observation, source and competing value. Store a preferred interpretation plus reversible links/merge decisions and their rationale. Correction must be able to separate an incorrect match without losing source facts or project-specific context.
- Do not branch the entire database for every possible interpretation. Keep uncertainty and alternatives at the relevant entity, fact or relationship. This is an implementation direction, not an already implemented capability.
- Experiments remain provisional. Initial imports/components require confirmation before becoming saved work. Later maintenance can use a scoped, revocable standing permission; it is not unrestricted permission to rewrite data.
- A likely identity match does not itself authorize contacting someone, changing recipients, sharing restricted information or granting access. Reconciliation operates only on data the acting identity and AI may access.

We are not building industry templates, prescribed review chains or fixed business workflow modules. User-created workflows are in scope as code and components on the shared foundation. Biotech teams remain the intended audience without dictating database schemas or mandatory screens.

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
- Defer integrations requiring new developer accounts until provider/account selection is needed. ChatGPT testing has begun with user-driven connection/use; full host acceptance is still pending. Backend access to tools connected in ChatGPT is not automatic.
- No real-recipient test messages. Electronic signatures remain conditional on provider requirements and cost; they are not implemented. Brand cutover remains separate.

## Current implementation versus target

The existing app has transactional records, originals, extraction, permissions, auth, audit/version history, MCP and deployed web/worker services. It also has legacy business-specific screens, templates and rules. Those are frozen pending separation, not newly endorsed product requirements.

The code execution foundation is implemented: bounded QuickJS/WASM JavaScript, permission-filtered tools, exact proposals and atomic commit receipts, immutable saved functions, leased jobs, once/future grants, schedules, result-file saves and shared standalone/embedded controls. Template/business builders are absent from the default experience; existing management remains at `/?legacy=1`. No historical data is removed.

See [the implemented execution contract](docs/EXECUTION.md) for APIs, limits, temporary retention and remaining boundaries. Shared cross-import entity reconciliation, general saved UI hosting and movable project/component organization remain to be built. External service adapters are not connected; complete real ChatGPT host acceptance is still pending. The existing Render services are reused, without a new sandbox account or infrastructure service.

## Development and operation

Node.js 24 and npm are required. `npm ci`, `npm run build`, and `npm run demo` start a loopback-only synthetic PGlite demo at http://127.0.0.1:4317. Do not use customer data in it. Docker includes Poppler, Tesseract and Python for extraction.

For PostgreSQL, configure `.env` from `.env.example`, including DATABASE_URL, SESSION_SECRET and PUBLIC_URL; then run `npm run db:migrate`, `npm run build`, `npm start`, and `npm run worker` in a second terminal. `npm run check` and `npm test` are verification commands.

Existing `/auth/login` provides sign-in/signup. OAuth uses PKCE; MFA/recovery codes exist, but email verification/password recovery are still absent. [ChatGPT setup](docs/CHATGPT_SETUP.md) and [operations](docs/OPERATIONS.md) describe existing behavior; their legacy feature instructions are operational history, not the future product backlog.

Legacy data/file previews live in one web process for up to 24 hours and may disappear on restart. New experiment/proposal/function-preview staging lives in PostgreSQL with a 24-hour expiry. Confirmed data is in PostgreSQL. Keep one web instance until shared temporary preview storage is implemented. Production recovery targets, actual managed backup restoration, restricted runtime credentials and monitoring remain unfinished; no zero-loss or blanket clinical-compliance claim is made.
