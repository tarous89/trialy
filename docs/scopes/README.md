# Product scope references

[Initial product brief — 10 October 2026](INITIAL_SCOPE_2026-10-10.md) preserves the supplied original brief verbatim. It records the starting vision, not a declaration that every capability has shipped.

Later explicit product decisions take precedence, including reviewed database writes, app-only account settings, and the connected-resource implementation scope in [issue #5](https://github.com/tarous89/trialy/issues/5). See [connected resources](../CONNECTED_RESOURCES.md) and [database runtime isolation](../DATABASE_ROLE_ROLLOUT.md) for implementation boundaries and validation.

[App automation engine — 31 October 2026](APP_AUTOMATION_ENGINE_2026-10-31.md) records the implemented 0.2.38 engine foundation, its limits and remaining real-host activation gates. It does not claim unattended production execution is verified.

[Apps, access and automations — revised scope](../product/APP_CONFIGURATION_AND_AUTOMATIONS.md) is the latest product target: app-level and optional tab access, a platform Automations destination, expandable user/MCP configuration parity, disable/edit lifecycle and shared first-use connection setup. Implementation is approved: Projects show apps by default; optional sections inherit and can only narrow access. Automation management is owner-only. Setup is revisited opportunistically without duplicate tasks or app interruption.
