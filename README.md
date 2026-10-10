# Project Brief: Trialy — ChatGPT-First Clinical Operations Platform

Updated 10 October 2026. This is the agreed product scope and decision record.

Repository: `tarous89/trialy`. Development name: **Trialy**. Intended publication brand: **Trialegions**. The existing Trialegions project is separate and must not be changed by this work.

- [Development plan and current status](DEVELOPMENT.md)
- [Project history](HISTORY.md)

Current status: a working development foundation is implemented. See DEVELOPMENT.md for the exact implemented subset and remaining work. The scope below remains the target product; it is not a statement of production readiness or regulatory certification.

## Run the development application

Requires Node.js 24 and npm. For a self-contained synthetic-data demo:

```sh
npm ci
npm run build
npm run demo
```

Open http://127.0.0.1:4317. This loopback-only harness uses local PGlite under `.data/demo`, seeds an example workspace, and runs the worker. It deliberately bypasses sign-in for synthetic local exploration; it refuses production mode. Do not use customer data in it. PDF OCR needs Poppler and Tesseract; the Docker image includes both.

For the real PostgreSQL application, copy `.env.example` to `.env`, provide DATABASE_URL, a random SESSION_SECRET of at least 32 characters, PUBLIC_URL, and OIDC configuration. Then run:

```sh
npm run db:migrate
npm run build
npm start
# In a second terminal:
npm run worker
```

For UI development, use `npm run dev` and `npm run dev:ui` together. `npm run check`, `npm run build`, and `npm test` are the focused verification commands.

Register `${PUBLIC_URL}/auth/callback` with the identity provider. Configure the MCP resource audience, issuer, JWKS URL and `trialy` scope for `/mcp`. Sign-in and MCP must use the same issuer and subject identity. A verified first ChatGPT connection creates the local account directly; a standalone visit is not required. See [ChatGPT onboarding setup](docs/CHATGPT_SETUP.md) for the separate OAuth callbacks and deployment checklist. The external provider must support the OAuth client-registration/distribution flow required by the intended ChatGPT connection; that live setup is still pending. MFA and organisation policy belong to that provider and have not yet been verified.

`render.yaml` and `Dockerfile` provide a staging starting point: web, worker and paid Postgres in Frankfurt. They have not been deployed or provider-validated. Confirm current plan availability and enter provider settings before deployment. Migrations must finish before the worker starts processing. This configuration does not establish production no-loss guarantees.

Previews expire after 24 hours, live in one web process, and may disappear on restart. Confirmed data is transactional in PostgreSQL. Keep one web instance until shared temporary previews or routing are implemented. Preview loss is not loss of a confirmed save. The initial upload limit is 25 MiB and pending previews share a 100 MiB process budget.

The patient-data suitability notice is displayed in the app. Formal licence acceptance, production recovery, retention policy enforcement, email/calendar and full embedded ChatGPT interaction remain unfinished.

## 1. Product Vision

Build a **ChatGPT-first, fully configurable software platform for biotech and pharmaceutical teams**, especially small and midsize biotechs, clinical development teams, medical officers, and clinical operations leads.

The platform should allow users to create, customize, and operate almost any clinical or business operations workflow through natural-language conversations with ChatGPT.

**The core idea is simple: rather than building dozens of separate software modules, we build a small number of highly flexible, reusable components that ChatGPT can combine into whatever application the user needs.**

Users should not have to learn complicated software, configure databases manually, or navigate hundreds of features. Instead, they describe what they want, and ChatGPT builds and operates the corresponding workspace.

The product should feel like users can **build their own clinical operations software simply by talking to ChatGPT**, while benefiting from ready-made industry templates and built-in safeguards.

## 2. Fundamental Principle: ChatGPT Is the Application

This is the most important product requirement and the primary differentiator.

**ChatGPT must be the primary interface to the entire software platform, not merely an AI assistant connected to another application.**

Users should be able to:

- Create workspaces, data types, forms, views, and workflows through conversation.
- See and interact with the full permitted application directly inside ChatGPT.
- Read, create, modify, analyse, and organise information through either conversation or the embedded interface.
- Access and edit the same persistent data through both methods.
- Configure permissions, integrations, and automations.
- Continue using their workspace across conversations and sessions.
- Collaborate with colleagues through shared workspaces.

The embedded software interface should support interactive tables, forms, dashboards, documents, timelines, and other visualisations.

**Standalone application:** A separate web application should exist, but primarily as a backup, an administration surface where needed, and an interface for information or functionality deliberately excluded from ChatGPT or unsupported by the integration.

The ChatGPT experience and standalone application must operate on the same underlying data.

The goal is not to duplicate every screen of a traditional SaaS application. The goal is to make all permitted functionality accessible inside ChatGPT, with interfaces generated or configured according to user needs.

## 3. Product Architecture: Reusable Building Blocks

The platform should be highly abstract and configurable.

Rather than hardcoding separate modules for vendor management, RFPs, trial tracking, and document management, build the following fundamental components.

### A. Workspaces and Data

Users can create workspaces containing custom data types, fields, records, and relationships.

For example, a user could ask:

"Create a CRO database with company names, locations, clinical experience, service capabilities, contact people, and previous proposals."

ChatGPT should create the corresponding data structure and usable interface.

Different types of records should be able to reference one another without unnecessary duplication.

### B. Views, Forms, and Visualisation

Any data should be displayable through reusable interface components, including:

- Tables and lists
- Forms and questionnaires
- Dashboards and reports
- Timelines and calendars
- Document and record views
- Comparison matrices

Users can request new views or modify existing ones conversationally.

Tabs are simply configurable views of the underlying data—not hardcoded software modules.

### C. Rules, Actions, and Automations

Users can define behaviours using natural language.

Examples:

- "Remind me when a CRO hasn't replied after seven days."
- "Notify the study manager when a milestone becomes overdue."
- "Every Monday, prepare a summary of open issues."
- "When a proposal arrives, extract its budget and update the comparison."

The platform should support event-triggered and scheduled automations, conditional logic, actions, notifications, and approval steps.

Rules should operate reliably even when the user is not actively chatting.

### D. Documents and Communications

A unified mechanism for handling files, notes, messages, and communications.

It should support:

- Document storage and linking to records
- Document versions and review status
- Email and calendar connections
- Communication histories and follow-ups
- External forms and document requests
- Linking conversations, documents, and decisions to the relevant entities

### E. Templates

Provide a comprehensive library of ready-to-use templates for common biotech workflows.

**Templates are configurations of the same underlying components—not separate software products.**

Users can install, combine, modify, and extend them through ChatGPT.

Templates should provide practical starting points while preserving full flexibility.

## 4. Access Control and Collaboration

Granular access control is a core product feature.

Permissions should be configurable for:

- Entire workspaces
- Data types and tables
- Individual columns and fields
- Documents and folders
- Shared views
- Individual records when necessary
- Actions and workflows

**Human access and ChatGPT access must be controlled separately.**

The intended default experience:

- The workspace owner has full control, subject to platform safeguards.
- Following explicit authorisation, ChatGPT has access to everything the owner has permitted it to access by default.
- The owner can exclude specific spaces, tables, fields, documents, or functionality from ChatGPT.
- Colleagues receive access only through explicit sharing or assigned roles.
- Each colleague's ChatGPT access is limited to that colleague's own permissions and any additional AI-specific restrictions.

Users should be able to share selected views or parts of their data without exposing the complete workspace.

Access restrictions must be enforced at the data and action level, not merely by hiding information in the interface.

Information excluded from model access may remain visible to authorised humans in the embedded interface through a verified UI-only data path. It must not appear in model-visible responses, summaries, widget state, or other AI processing. Information excluded from the entire ChatGPT surface remains available through the authorised standalone application. See section 11.

## 5. Built-In Safeguards and Compliance Requirements

The platform is intended for clinical-development and biotech operations, so reliability, accountability, and controlled access must be fundamental.

The following capabilities should be platform-wide rather than optional features of individual templates:

- **Audit trails:** Track relevant changes, actions, actors, and timestamps.
- **Version control:** Preserve document, record, and configuration history.
- **Access control:** Enforce permissions consistently across the platform and ChatGPT.
- **Approval integrity:** Preserve who approved what and which version was approved.
- **Data provenance:** Maintain links to the sources of important information.
- **Reliable automations:** Track execution history, failures, and retries.
- **Data protection:** Secure storage, controlled sharing, backup, recovery, and export.
- **Change control:** Validate significant configuration and workflow changes before activation.
- **Human oversight:** Require appropriate review for high-impact actions and formal decisions.

These safeguards should support regulated working practices where applicable, but the platform must not automatically claim regulatory compliance for every user-created workflow.

**Intended-use limitation: Trialy is not fit for purpose for patient-level data.**

Professional contact details and user identities are in scope. Explain the patient-data limitation in the licence and first-use onboarding. Do not build patient-data scanning, screening, classification, quarantine, or content-rejection steps for uploads, imports, fields, or connected data. This is an intended-use boundary, not a technical filter or assurance that patient information can never enter the system. Normal authentication, permissions, input validation, and security controls remain required.

## 6. Initial Use Cases and Template Library

The platform should be capable of supporting many workflows from the beginning through its reusable building blocks.

Prioritise the following templates.

### Priority 1: RFP Lifecycle and CRO Selection

- Create and manage RFPs
- Define requirements and study scope
- Create CRO shortlists
- Send RFPs and track responses
- Collect proposals and clarifications
- Compare services, budgets, assumptions, and exclusions
- Evaluate and score vendors
- Manage internal reviews and selection decisions
- Preserve the selected proposal and agreed commitments

### Priority 2: Clinical Trial Tracking and CRO Oversight

- Create study workspaces
- Track milestones, deadlines, and deliverables
- Monitor CRO responsibilities and performance
- Manage risks, issues, actions, and decisions
- Track contracts, budgets, and change orders
- Import operational updates
- Generate study dashboards and progress reports

The selected CRO and its agreed commitments should carry forward automatically from the sourcing process into trial tracking.

### Priority 3: Document Management

- Store and organise documents
- Manage versions and reviews
- Request and collect documents
- Track missing and expiring documents
- Manage approval processes
- Link documents to studies, vendors, sites, and other records

### Additional Templates

- Site identification, feasibility, and management
- Principal investigator databases and engagement tracking
- SOP management and training coordination
- Expert/KOL and advisory-board management
- Congress and publication planning
- Team tasks and project management
- Vendor and contract management
- Budget and resource tracking
- Email communication and follow-up workflows
- Custom reporting and recurring management updates

**These should not become separate mandatory navigation modules.** They are examples of applications users can create from the same underlying platform.

## 7. Expected User Experience

The ideal experience starts with a conversation.

For example:

**User:** "I need to select a CRO for our Phase II oncology study. Create a workspace to manage the RFP process, compare proposals, track communications, and eventually manage the selected CRO."

**ChatGPT should:**

1. Understand the request and identify suitable templates.
2. Reuse any existing records or workspace components.
3. Prepare the proposed data structures and relationships in preview mode.
4. Present tables, forms, comparisons, and views for experimentation.
5. Preview proposed rules, statuses, and automations without activating them.
6. Ask the authenticated user to confirm the exact content to save to Trialy.
7. Commit the accepted content as version 0 and return a saved receipt.
8. Allow further operation through conversation or the interface, preserving history of committed changes.

The user might subsequently say:

"Add a column for oncology experience."

"Share this comparison with our medical director, but hide the financial details."

"Send reminders to vendors who haven't submitted their proposals."

"Create a dashboard showing the status of every active trial."

The platform should interpret these instructions and perform the authorised actions against the same persistent workspace, requesting confirmation when appropriate.

Users should also be able to interact manually with tables, forms, and other interface elements without having to issue conversational commands.

## 8. Important Product Design Principles

**1. ChatGPT-first, not ChatGPT-assisted.**  
The full permitted software experience lives inside ChatGPT.

**2. Maximum flexibility, minimum complexity.**  
Users should be able to create many types of applications without facing a crowded interface.

**3. Configuration instead of custom development.**  
Most workflows should be created by combining reusable components rather than writing new application code.

**4. Templates instead of rigid modules.**  
Provide industry-specific starting points without restricting users to predefined workflows.

**5. One consistent data foundation.**  
Information should be reusable across workflows, views, and templates.

**6. Conversation and interface are equally capable.**  
Both should access the same functionality and persistent data.

**7. Permissions are fundamental.**  
Human users and ChatGPT must have independently configurable access.

**8. Safeguards cannot be configured away.**  
Flexibility must not undermine auditability, data integrity, security, or required approvals.

**9. Small-team usability.**  
The platform should work for an individual medical officer or a small clinical operations team without lengthy enterprise implementation.

**10. Broad capability without forced complexity.**  
Support diverse use cases while showing users only the functionality relevant to their current work.

## 9. Development Philosophy

**Build the reusable platform first, while using real clinical operations templates to guide and test its design.**

Do not attempt to build a full traditional CTMS, RFP platform, eTMF, QMS, and CRM as separate products.

Instead, create one flexible system capable of assembling their common workflows.

Use existing infrastructure and integrations wherever sensible rather than reinventing authentication, databases, file storage, scheduling, and external communication services.

Prioritise a reliable, persistent, fully functional ChatGPT-native experience.

The first end-to-end example should be:

**RFP creation → CRO sourcing and comparison → vendor selection → ongoing study and CRO tracking.**

This example should demonstrate how multiple use cases can be built on one shared foundation without duplicating records or requiring separate software modules.

## 10. Instructions for the AI Builder

Use this brief as the starting product vision.

Begin by defining the minimum reusable components required to support all the described workflows, the user experience inside ChatGPT, and the non-negotiable safeguards.

Then develop a coherent implementation plan that distinguishes:

- Components we need to build ourselves
- Existing infrastructure and services we should integrate
- The shared platform capabilities
- The initial industry templates
- The ChatGPT-native interface and interaction model
- The initial end-to-end product experience

**The ultimate goal is a universal, configurable operations platform for biotech teams—where users can build and operate their own software through ChatGPT, while the platform automatically provides the structure, reliability, access controls, and accountability necessary for professional clinical operations.**

## 11. Confirmed Product Decisions — 10 October 2026

### A. Preview, Commit, and Subsequent Changes

- Conversation is not automatically an application record. Having the plugin active does not save all conversation content into Trialy.
- New tables, trackers, forms, views, documents, imports, data batches, and proposed configurations begin in clearly labelled preview mode.
- Users may iterate, select only part of an import, replace a wrong document, or discard a preview before committing.
- A preview has no effect on authoritative records, live automations, notifications, or external recipients.
- Present the destination and exact proposed contents before an explicit Save to Trialy confirmation. Bind confirmation to the precise preview revision; subsequent changes require fresh confirmation unless covered by an explicit, recorded future-action permission.
- After authentication and permission checks, commit the accepted content as version 0. Application version history, authoritative retrieval, record retention, and backup obligations apply to that committed content.
- Later conversational edits and imports may also be previewed. Their acceptance creates a new revision; it never erases or rewrites prior committed history.
- An explicit Save action in the application can itself express confirmation. Avoid redundant confirmation dialogs for the same action.
- Discarding a proposed change leaves the committed record unchanged. Correcting or removing committed information follows the applicable audited lifecycle and retention rules.
- Saving and approving are different: a saved working draft is persisted and auditable, but is not automatically approved, effective, or electronically signed.
- Committed regulated work cannot be made unaudited by relabelling it as preview. Trialy must not use preview mode to conceal actual regulated decisions or activity.

### B. Preview Storage and Operational Boundaries

- Preview content is excluded from authoritative records, ordinary project search, and long-term record archives. Prefer client-side or ephemeral preview storage outside the committed database backup path. Merely putting previews in a separate PostgreSQL table does not exclude them from physical snapshots; do not make a backup-exclusion promise that the infrastructure cannot satisfy.
- If preview processing requires temporary server storage, isolate it with scoped access and a defined expiry/deletion policy. Do not claim that a preview was never technically stored.
- Preview recovery across sessions and its retention duration remain design decisions. The interface must distinguish temporary preview from saved work.
- Minimise content in security and operational logs. Such logs are distinct from business-record version history; a discarded preview is not promised to erase independent ChatGPT conversation history or every infrastructure trace.
- Do not automatically copy a whole chat or source upload into the authoritative record. Persist only the confirmed material and required provenance. If a controlled record needs its source retained, show that inclusion before confirmation.
- Offer one-time permission or revocable permission for future actions of a defined type. Record the workflow, permitted actions, destination, and authorising user. Recurring commits within that scope may proceed without repeated confirmation; actions outside it require fresh permission. Required formal human approvals/signatures are not bypassed.

### C. Authentication, Commit Integrity, and No Lost Saved Work

- Every read/write of private Trialy data is authenticated and authorised against the appropriate tenant and user.
- Persist accepted structured data, version identifiers, and audit entries transactionally. Files must be durably stored and verified before their records are acknowledged as saved.
- Return Saved only after the configured durable commit succeeds, including the record ID and revision.
- Use idempotency keys so a retried save cannot duplicate records or actions. If a response is interrupted, reconcile the original transaction before retrying; distinguish failed, pending, and saved states.
- Detect concurrent edits and stale previews; do not silently overwrite another user's saved work.
- Design for no loss of acknowledged saves within an explicitly documented failure model. Direct database writes and backups alone are not proof of this guarantee.
- Render remains the preferred application host. Database durability/replication must be chosen against this requirement; Render's documented asynchronous HA can lose recent writes, so it cannot alone establish zero-loss failover.
- Start development/testing on modest paid Render Postgres, including initial file storage. Do not provision a separate database or object-storage service now. Resolve production durability, recovery-time targets, and disaster scope before customer reliance; prefer the existing platform if it meets those requirements. Build portable storage interfaces so any necessary later change does not require an application rewrite. Do not promise absolute protection against every conceivable event.

### D. Human Visibility and AI Access

- Model access and human visibility are separate permission dimensions.
- Allow authorised users to see model-restricted information in the embedded application, provided the UI-only path is verified not to expose it to the model.
- Apply restrictions to tools, summaries, retrieval indexes, background AI processing, widget state, and other indirect paths.
- Human permissions remain the upper bound on access. The assistant may not infer authority from content, a preview, or an unsigned client parameter.
- Model-restricted data cannot be used by the assistant for analysis or conversational editing unless the user is authorised to change that restriction and explicitly does so.
- UI-only does not mean data never passes through the ChatGPT hosting surface. Where that entire surface is excluded, use the standalone app.
- Revocation prevents future access; do not promise retraction of information already disclosed in a previous conversation.

### E. Regulatory Purpose and Authoritative Records

- Design for EU and US regulated clinical-operations workflows.
- Trialy itself is the authoritative system for committed oversight records and controlled documents within its defined intended use. It must not depend on an external eTMF, CTMS, or QMS to complete that responsibility.
- Infrastructure services and optional email/calendar/signature integrations remain compatible with a self-contained Trialy product; they do not make another clinical platform the system of record.
- Build the validation evidence, retention, inspection export, record lifecycle, access controls, and change-control foundation required by this intended use.
- Do not claim that all user-created configurations are automatically validated or compliant. Relevant workflows require documented assessment and appropriate verification.
- Terms and onboarding communicate patient-data unsuitability; this decision is not a legal conclusion that notices remove every obligation associated with information actually processed.

### F. Electronic Signatures

- Include electronic signatures in the overall scope, conditionally on integration cost and suitability.
- Assess production API charges, minimum commitments, per-signature costs, authentication, evidence export, long-term signature verification, and EU/US regulatory suitability.
- Distinguish free developer/sandbox access from free production use.
- If no suitable affordable integration is available, defer formal electronic signatures explicitly. Retain version-bound internal approvals without describing them as regulated signatures.
- The model cannot sign on behalf of a person. Signing requires an explicit authenticated human action against the exact record version.

### G. Account Availability and Development Approach

- Trialy will not require an organisational or enterprise ChatGPT account. Aim to support individual and free accounts wherever OpenAI supports the required app capabilities.
- Trialy authentication is still mandatory for private application data and commits. OpenAI's plan, geographic, and distribution restrictions remain outside Trialy's control.
- Explain AI access choices and relevant data handling without imposing a blanket organisational-account requirement.
- Plan one complete product through concrete dependency-ordered development steps, with testing and validation throughout and final integrated acceptance testing.
- Preserve the reusable configurable platform and original template breadth. Formal signatures are a conditional item, not a reason to delay all other development.

### H. Remaining Design Decisions

1. Temporary preview lifetime and whether users can explicitly save resumable drafts.
2. Concrete permission scopes and revocation UX for the agreed one-time/future authorisation model.
3. Permitted recovery time and the failure scenarios under which acknowledged saves must survive without loss.
4. Suitable production signature provider, cost, and evidence requirements.
5. Record-class retention schedules and detailed workflow validation responsibilities.

### I. Naming and Initial Document Architecture

- Use Trialy as the development name for the repository, infrastructure, database, and documentation. The intended publication brand is Trialegions. Keep the existing Trialegions project isolated; publication/replacement is a separate controlled cutover.
- Make public branding configurable; internal resource names need not change at publication.
- Initial testing is expected to use one or a few files. Store original file bytes in PostgreSQL binary storage (bytea), with document/version identifiers, tenant ownership, filename, MIME type, size, checksum, and access controls. Keep binary payloads separate from frequently queried metadata.
- No external object store or separate vector database is required initially. Apply practical upload size limits and measure database/backup growth before customer onboarding.
- Build text/structure extraction and basic full-text search. Preserve page/section references where available. A vector index is optional later; it is derived data and must remain rebuildable from retained sources.
- Original versions are authoritative. Extracted text, OCR, table representations, thumbnails, embeddings, and indexes are derived representations linked to an exact original version and processing version.
- A successful source save does not require successful extraction or indexing. Processing runs asynchronously after source commitment, or in isolated temporary preview storage before commitment as appropriate.

### J. Failure Handling: Preserve Sources and Continue

- Distinguish acquiring/saving an original from processing an original already durably stored. Receiving an upload, having an external URL, or holding a temporary copy does not mean Saved.
- Before acknowledging Saved, verify complete source persistence, metadata, and required audit/version entries. If this fails, mark the affected item Not saved or Pending and give a concise actionable notice; continue unrelated items and work. Never silently drop an original or acknowledge an unsuccessful save.
- For derived processing, use a bounded attempt policy: by default one attempt plus one retry for plausibly transient failures. Skip futile retries for unsupported or otherwise non-retryable input.
- If OCR, text extraction, table extraction, or indexing remains unavailable, preserve the source and record the diagnostic internally. No error modal, toast, email, or user notification for these routine recoverable processing failures.
- Show a quiet per-document availability indicator such as No extraction available next to the saved document. Distinguish pending processing from unavailable processing; flag partial extraction accurately rather than implying completeness.
- The source stays downloadable/viewable. An extraction failure never deletes it, rolls back its successful save, blocks a batch, or stops unrelated workflows. Retry later or on explicit request without replacing source history.
- Track source persistence and each derived capability separately. An indexing failure must not incorrectly label a usable extraction unavailable.
- Return machine-readable coverage/availability to authorised AI tools. Search must account for permitted documents not represented in its index, so the assistant does not mistake missing extraction for absence of relevant content.
- AI may use an authorised alternative reading path when available. Otherwise skip the affected input or mark the dependent output incomplete. Do not invent missing values or present incomplete analysis as exhaustive.
- Failure to produce a derived result should not stop the overall workflow. Only the specific dependent action remains pending/skipped when it cannot be performed correctly; unrelated actions continue.
- Quiet handling applies to regenerable processing failures. Authentication/permission enforcement, required approvals, source integrity, and truthful save status remain mandatory. Genuine source loss/corruption, unsaved user changes, or required persistence failure needs a concise notice to the affected user and internal incident handling.
- Record processing attempts/status separately from document-content revisions. A reprocessing attempt must not create a new authoritative source version or pretend that a user edited the source.
- Persist processing jobs durably; restart/retry safely without duplicate side effects. Bind outputs to source versions, avoid publishing stale results, and prevent one failed file from monopolising workers.

## 12. Technical and Regulatory References for Follow-Up

- EMA computerised systems guidance: https://www.ema.europa.eu/en/documents/regulatory-procedural-guideline/guideline-computerised-systems-and-electronic-data-clinical-trials_en.pdf
- FDA electronic systems guidance (October 2024): https://www.fda.gov/media/166215/download
- OpenAI plugin reference (UI-only metadata and model-visible results): https://developers.openai.com/plugins/reference
- Render Postgres high availability and data-loss limitations: https://render.com/docs/postgresql-high-availability

- PostgreSQL binary storage: https://www.postgresql.org/docs/current/datatype-binary.html
- PostgreSQL limits: https://www.postgresql.org/docs/current/limits.html

These references inform implementation and validation planning; this scope is not a certification of compliance.

