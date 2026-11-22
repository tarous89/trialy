# Product scope references

[Initial product brief — 10 October 2026](INITIAL_SCOPE_2026-10-10.md) preserves the supplied original brief verbatim. It records the starting vision, not a declaration that every capability has shipped.

Later explicit product decisions take precedence, including reviewed database writes, app-only account settings, and the connected-resource implementation scope in [issue #5](https://github.com/tarous89/trialy/issues/5). See [connected resources](../CONNECTED_RESOURCES.md) and [database runtime isolation](../DATABASE_ROLE_ROLLOUT.md) for implementation boundaries and validation.

[App automation engine — 31 October 2026](APP_AUTOMATION_ENGINE_2026-10-31.md) records the implemented 0.2.38 engine foundation, its limits and remaining real-host activation gates. It does not claim unattended production execution is verified.

[Product direction](../product/PRODUCT_DIRECTION.md) and [current context](../../CONTEXT.md) define the current apps-first, cross-platform product. [Apps, access and automations](../product/APP_CONFIGURATION_AND_AUTOMATIONS.md) remains the technical contract for: app-level and optional tab access, a platform Automations destination, expandable user/MCP configuration parity, disable/edit lifecycle and shared first-use connection setup. Implementation is approved: Projects show apps by default; optional sections inherit and can only narrow access. Automation management is owner-only. Setup is revisited opportunistically without duplicate tasks or app interruption.

[Implementation scope for the platform decisions — 19 November 2026](PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md) plans the build of the 69 decided access, installation, automation, external-sharing, authoring and performance decisions in seven sessions. It cites the [decisions snapshot](PLATFORM_DECISIONS_SNAPSHOT_2026-11-19.md) by code and the six [code reviews](platform-decisions-2026-11-19/) as evidence. It is a plan: nothing in it is built until its progress table says so.

[Loading speed scope — 22 November 2026](LOADING_SPEED_2026-11-22.md) plans faster opening of Apps home, archived apps, templates and individual apps on the website and in the ChatGPT and Claude plugins, in four sessions. It records the local measurements and code causes behind it. It is a plan: nothing in it is built until its progress table says so.
