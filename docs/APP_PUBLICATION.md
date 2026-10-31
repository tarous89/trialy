# Open apps and published updates

App publication is independent of a viewer's open runtime. A publish changes the default version for new opens; an existing viewer keeps the source, route and local inputs they loaded. The shared frontend runtime handles this for standalone apps, the extension and public links, without template changes.

A small banner offers an explicit refresh. It does not re-render the app, mark it dirty or block controls. Refresh with unsaved work asks before discarding it, swaps only after the new version renders successfully, and retains the original view and inputs if loading fails. Action errors appear in a dismissible popup without a backdrop. Data saves refresh data through the loaded version; saving an app's own layout explicitly loads that published layout.

## Server contract

- The first authorized `run_component_frontend` returns a random `viewId`. Requests from that viewer and `apply_component_records` proposals carry it alongside the original `expectedVersion`.
- `app_runtime_views` stores the exact published source and field contracts. A caller cannot choose an arbitrary historical revision. Tokens are scoped to workspace, app, user and origin; a human can approve their own AI-origin proposal, while AI cannot reuse a human-origin view.
- Runtime views survive process restarts and releases. They expire after 30 days and the maintenance sweep removes them. Expiry asks the viewer to refresh; it does not remove the rendered app.
- Current app, project, document, table, column, record and write permissions still apply. Read visibility newly granted during a view is recorded so later revocation also invalidates cached values. Actual access revocation and app archival may remove protected content.
- Database writes must fit both the loaded and current app's bindings and writable manifests. Writes compare affected field contracts, current values and record versions again at confirmation. Adding an unrelated column or changing a label does not break an existing write; incompatible value contracts reject the affected action without committing it.
- Functions require the same execution binding and use current execution authorization. Connectors and app actions use their existing current authorization and review mechanisms. App/source/layout edits still use exact current versions, preventing an old viewer from overwriting a newer publication.
- Access checks do not execute generated code. Publishing or temporary access-check network errors never replace an open app. Views do not grant access or bypass security.

## Rollout and validation

Migration `048_app_runtime_views.sql` and the additive privileges in `ops/runtime-role.sql` ship with the existing migration hook. No customer app, template or database schema is rewritten. This behavior applies to clients running the updated frontend; already loaded frontend bundles from before deployment need a normal page refresh to adopt it.

Backend coverage includes old-version reads and saves, proposals confirmed after publication, fresh-version opens, invalid/cross-user/cross-origin tokens, schema migration failures, public links, access revocation and expiry. Browser coverage exercises standalone, embedded and public apps, retained inputs, user-controlled refresh, failed-refresh recovery, dismissible action errors, idempotent retry after a lost save response, and existing navigation/save flows.
