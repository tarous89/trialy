# App platform backlog

Updated 29 October 2026. These items are explicitly outside the [simple-app P0 release](APP_PLATFORM_SCOPE.md). No task here is implicitly activated by implementing navigation or the generic connector.

The earlier broad proposal is preserved in [planning commit d7679e2](https://github.com/tarous89/trialy/tree/d7679e235a1bcc57ab702ee5e1d23f993732d42e/docs/product). It is design reference, not the active implementation order.

## P1 — Small improvements after first use

| Item | Trigger for taking it up |
| --- | --- |
| Local navigation/event optimization | Measured delays in a real simple app justify additional runtime work |
| OAuth2 authorization/refresh in generic connectors | A selected service needs OAuth; the same Connectors UI is reused |
| Generic response pagination, larger files and richer transformations | A real connector exceeds the initial bounded JSON/text contract |
| Optional project appearance control | Users need to override the stable existing project palette |

These do not postpone required P0 new-tab launch, working links, project color inheritance, data-access enforcement or footer consistency.

## P2 — Advanced apps and operations

- Real browser JavaScript bundles, React/npm dependencies, isolated builds, assets and additional runtime versions.
- Isolated Node/TypeScript and Python functions, then container/language extensions; no arbitrary code inside trusted web/worker processes.
- App-defined HTTP endpoints, inbound webhooks and additional protocols.
- Cron expansion, durable multistep workflows, checkpoints, richer event chains, advanced retry/recovery and long-lived workers. Preserve current jobs/schedules in the meantime.
- Build/release pipelines and immutable artifacts when packaged runtimes require them; current component revisions suffice for P0.
- Invite-only external app audiences, public signup/federation, additional record-scope policies and real-time collaboration. Reuse existing auth before adding identity systems.
- Monetary usage ledger, reservations, account/app spending caps, rate catalogues and provider invoice reconciliation. Required before Trialy-funded variable-cost services; initial connectors use customer credentials.
- Additional execution-provider/storage/production recovery work specifically required by these larger runtimes. Existing production obligations are not waived by postponing them.

Each needs a separately scoped change with measured demand, cost and acceptance criteria. No new runtime/infrastructure purchase follows automatically from this backlog.

## P3 — Branded connectors last

Email sending, Microsoft 365/Google document access, AI providers and other provider-specific services come after the generic connector and actual usage evidence. Build them as adapters to the same credential, scope, review, management and logging contracts.

Trialy-funded services additionally need verified pricing and the P2 spending controls. Customer-connected services still need provider consent. Generating a local document is not the same as connecting to a cloud Word account, and building through ChatGPT does not automatically provide in-app AI execution.

Do not build a connector marketplace or a large unused catalogue. Select the first branded adapter through a separate product decision after P0 is working.
