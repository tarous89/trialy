# Project Brief: ChatGPT-Native Clinical Operations Platform

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

Information excluded from ChatGPT should remain available only through authorised alternative interfaces.

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

**Initial data scope: no patient-level information.**

The platform should focus on business, scientific, and operational information. This restriction must cover imported documents and connected data, not just database fields.

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
3. Create the necessary data structures and relationships.
4. Generate useful tables, forms, comparisons, and views.
5. Configure relevant rules, statuses, and automations.
6. Present the actual working application inside ChatGPT.
7. Allow the user to customise and operate everything conversationally or through the interface.

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