# Account, projects and tools — 23 October 2026

## Approved behavior

- Require an authenticated account before creating any project or tool. “Tools” covers trackers, forms, visualizations and automations.
- Provision the first account database automatically and idempotently. Do not ask users to name/create a workspace. Retain the internal workspace boundary and all existing account permissions. Existing restricted memberships must never cause creation of an alternative database to bypass restrictions.
- Allow independent tools. Home includes All projects and No project, project drop targets, draggable cards, and a keyboard/touch Move to dialog. Public form respondents still do not need an account.

## Implementation

`open_workspace` initializes first-account storage after authentication. The web app initializes it through an authenticated, CSRF-protected POST. Creation is serialized on the user row. Existing inaccessible accounts keep an access-settings message. Existing multiple databases remain reachable through the legacy account-data selector; they are not migrated or merged.

`save_component.projectId` is optional/null. Standalone tools use workspace-scoped manifests. Project-scoped data still requires an explicit project. Migration 037 removes the component project requirement and adds placement columns to the four existing RLS-protected tool tables. Existing runtime permissions suffice; no runtime-role grants are changed. `move_tool` validates source access, active destination, current placement version and current-action authority, then saves an audit event in the same transaction. Worker self-confirmation is rejected.

Placement is intentionally separate from data/security scope: moving a tool does not broaden or retarget its records, remove inherited restrictions, change public links, grant access, or reschedule automations. Previously project-bound tools retain that source project's data/access constraints after organization moves. Future changes to that scope require explicit configuration changes. Home membership reflects placement. Existing specialized project-management/data-scope screens retain their original scope semantics.

New anonymous preview creation is blocked at both the MCP entry and domain layer. Cached calls prompt connection for anonymous users and direct authenticated users to the saved-tool flow without a reauthentication loop. Old preview handles keep the existing recovery and claim path until expiry; no existing work is deleted.

## Verification

- Backend tests cover automatic/idempotent setup, independent connected trackers, form/function placement, move-in/move-out, stale versions, inherited restrictions, workspace isolation, worker denial and old-preview recovery under the restricted runtime role.
- OAuth onboarding regressions check automatic account initialization and existing denial preservation.
- Chromium exercises the production React entry point with synthetic APIs: drag into/out of projects, No project filtering, Move to dialog, retained layout/filter state and mobile layout. The standard Database/Logs/export checks remain in the same harness.
- TypeScript, production build, full backend suite and skill validation run before publication.
- Actual ChatGPT host interaction remains a separate acceptance check. The earlier “content blocked” symptom is not claimed fixed by this onboarding change.
