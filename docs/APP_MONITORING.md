# App-level ChatGPT monitoring

## Scope and compatibility

This document describes the legacy per-app host-task adapter. Release 0.2.38 also implements the [shared automation engine](scopes/APP_AUTOMATION_ENGINE_2026-10-31.md), whose schedules are executable server configuration. The [revised app configuration scope](product/APP_CONFIGURATION_AND_AUTOMATIONS.md) plans a first-class Automations list and complete expandable editing across research and platform actions. Those new management and tab-access changes are not implemented by this documentation revision.

New shared definitions belong to a saved app, reuse the owner/workspace runner, and remain optional for app availability. The target lifecycle is disable/enable/edit; retirement follows parent app deletion and retains records/history. Sharing app tabs never shares private monitoring prompts, execution identity or management authority. Existing legacy task links and receipts remain intact until explicitly migrated without dual scheduling.

## Legacy implementation

Optional monitoring attaches to any saved component without changing the component, template catalog, schema, public route or existing permissions. The runtime contract is served by `read_app_monitoring_guide` from the workspace skill reference. Existing app behavior does not depend on monitoring being configured.

Migration 047 adds owner-scoped RLS tables for configuration, immutable completed run records and immutable links to real maintenance receipts. Existing service-review storage provides exact human-reviewed setup. Restricted runtime grants are additive. No new service, API key, worker schedule or external AI provider is required.

The host creates and manages ChatGPT tasks. TrialAgents stores agent-reported task associations only; it cannot independently observe their current lifecycle. The UI deliberately distinguishes local enablement, reported configuration, last received run and unknown host task state. Requested schedule descriptions are not executable cron. Links are reconciled by task ID after creation/update; an app monitor must not create duplicate tasks after an interrupted response.

Reads use current AI authorization and explicit field bindings. Writes reuse single-table maintenance grants; configuration approval cannot mint a grant. Monitor disable/config updates and saves share a workspace transaction lock. Actual saved receipts enforce change limits and prevent retries or unrelated historical receipts from inflating run counts. Daily occurrence limits, one active run, a two-hour deadline and immutable terminal records bound unattended work. Coverage advances only on completed/no-update runs; source coverage remains agent-reported. There is no network execution or source crawling in the server.

Layout-only app publications do not invalidate monitors. Current app/project availability and AI access are checked on operations; schema/permission changes require review. Read-only research works with empty bindings and scopes. Private operational summaries do not publish themselves into app reports or public views. App copies inherit no monitoring configuration.

Deployment uses the existing web/worker migration process. Verify migration 047, MCP guide and tools, restricted-role tests, empty/custom/record-backed app cases, UI review/disable/history, and unchanged published components. Do not claim a full scheduled integration test until an actual host task has run with the intended TrialAgents connection and write approval settings. Manual integration tests and mocked scheduling metadata are not that acceptance test.
