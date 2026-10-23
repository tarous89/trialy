# Tracker reference fidelity — 0.2.16

The approved HTML was partially ported: array values acquired decorative green chips, empty-tab examples were display-only, and table/row resize handlers were missing. The skill also retained an obsolete “4–6 visible fields” rule and mixed prototype-only capabilities with shipped features.

The connected renderer is now the canonical reusable skeleton. `prepare_tracker` compiles configuration into this exact renderer; the server design reader exposes both `skeleton` and a detailed `parity` resource. The preserved reference HTML is unchanged. The parity map covers the specimen's page anatomy, final CSS, editing, dimensions, detail drawer, filtering, record lifecycle, settings, permission model, mobile and keyboard interactions, with explicit runtime boundaries.

Changes:
- Neutral ordinary text, URLs and multiple-value lists; semantic statuses/choices retain approved tints.
- Click-to-edit real fields and locally editable fictional examples, in table and details. Blur/Enter closes; Escape cancels the active editing session. Pending real changes still require the dark footer's exact save and backend authorization/version checks.
- Explicit column widths, horizontal overflow, pointer/keyboard column resize (85–650px) and row resize (38–180px). Sizes remain local to the current open tracker; no database field or record mutation. Resizing retains horizontal scroll and tab switches retain sizes.
- Pinned Details uses the reference SVG; details remain viewport-height with a single page scroller.
- All-fields-visible guidance is consistent. No copied vendor workflow, dummy record writes or cosmetic permission enforcement.
- Saved exact standard sources from 0.2.15 are upgraded. Custom source is never replaced. Older unsaved create_tracker drafts containing a previous exact compiled source may need regeneration; approved digests are not rewritten.

Verified locally: TypeScript/production build; existing 70-test suite plus the new skeleton regression; full production embedded-browser journey with real isolated database and synthetic MCP host (preview/Home/save, example isolation, click/edit/discard, multi-values, pointer/keyboard sizing, local interaction round trips, full-height details, layouts and mobile); skill validator. Actual ChatGPT host behavior still requires opening the refreshed plugin.

Known reference-only boundaries: generic duplicate/delete controls, nested create-related-and-return, custom domain filters/ranks and granular per-tab/per-column permission editing are not added by this release. Source URLs display as neutral text in the sandbox. See the parity resource rather than inferring support from the prototype.
