# TrialAgents interface rules

Current: 9 November 2026. Applies to apps inside ChatGPT, Claude and standalone web. [Platform scope](product/APP_PLATFORM_SCOPE.md) governs navigation, headers and template discovery. The older proposed edit-policy table is [archived](archive/2026-11-09-product-reset/docs/INTERFACE_RULES.md); it is not authority to implement snapshot overrides.

- Use Apps as the visible destination. Same-tab web apps retain the platform header and collapsed sidebar; platform pages start expanded. Keep both assistant CTAs on web and Open TrialAgents in the plugin.
- Use one page scroller, bounded active-page reads, useful details, search/filter/sort before pagination and responsive inline controls. Keep app input during loading/save errors and retain the usable published version during edits.
- Substantial details open in their own page/panel; small inspections can use a modal. Preserve filters, selection and scroll on return. Show only authorized source/evidence.
- Record changes target the bound shared record; presentation changes target app configuration/source. Derived values remain read-only unless their source/formula is explicitly changed. Preserve originals, expected versions and audit history; never silently create per-view overrides.
- Platform pages have native top Save/Ignore controls where needed. Apps choose suitable record/layout saves; tracker recommendations are guidance, not enforced global UI. Only first publication uses the trusted Save app / Discard app footer.
- Generated controls cannot grant access. Use the backend [write authorization](WRITE_AUTHORIZATION.md), [access](ACCESS_CONTROL.md), [frontend runtime](FRONTEND_CODE.md) and [template guidance](../templates/TEMPLATE_AUTHORING.md) contracts.
