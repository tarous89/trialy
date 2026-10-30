# App creation quality — 0.2.32

The app platform provides a current design kit through `read_app_design` independently of templates. Any custom layout remains supported. Low-priority Inter typography, semantic color pairs, spacing and optional card/grid/action classes give custom apps a coherent baseline. Explicit app CSS retains control. Standard tracker theme overrides now cover foregrounds, surfaces, inputs, metadata, table headers and details; requested colors are corrected where needed for legible text. The approved default Vivid stylesheet remains unchanged.

New tracker template version 1.1.0 retains Vivid's default appearance, supports linked draft tables and binds omitted new-table fields as detail-only columns. Version 1.0.0 remains available. Source columns are optional. Template version/digest, renderer and requested theme are retained in preview and revision provenance; custom apps are identified separately. A visual change must be requested rather than silently replacing a selected template's styling.

## One request, one preview

All app preparation operations accept a stable UUID `requestKey`. Exact retries return the current draft, and saved requests resolve to the saved app. Temporary table UUID churn is ignored in the request fingerprint; source, schema and binding differences are not. Changed content requires the same key plus `replacesPreviewId` and `expectedDigest`. Revision retains the preview ID and extends its expiry. Failed rendering/checks leave the previous draft intact. Discard records a tombstone for explicit keys. Concurrent preparation and save/discard serialize per workspace. Requests without a key deduplicate identical pending drafts only; clients should always supply a key. Expired drafts remain subject to the normal lifetime rules.

## Linked tables

Reviewed creation validates the whole new-table graph, including lookup dependencies, before saving. All temporary IDs are mapped to persistent IDs inside the same transaction as the app. Cross-workspace/inaccessible references and derived-field cycles are rejected. Relationship cycles are allowed; derived cycles are not. Existing schema additions retain version checks. Failure leaves no partial tables or app. Normal write authorization, permissions, revision history and audit events remain in force. No example records are written.

## Rendered design inspection

Preparation renders the initial screen and visible standard tracker tabs. A fresh Chromium context inspects 1440px and 390px widths with network access blocked, page JavaScript disabled, active embedded elements removed and a restrictive content security policy. The browser inherits only its minimal runtime paths, not service credentials. The check is bounded to one active browser, ten frames, 4000 elements per frame and a 15-second browser lifetime. It checks text contrast (4.5:1 normal / 3:1 large), text below 12px, vertical clipping, uncontained horizontal overflow and overlapping controls. Failures roll back the candidate and return structured repair findings. Browser unavailability/busy state fails closed; it does not silently pass. Inter is bundled into the trusted app frame so rendered fonts match the check.

This is a quality floor, not proof of aesthetic quality or complete accessibility. Interactive/custom-route states, image/gradient contrast, meaningful content, hierarchy and deliberate spacing require visual review. Warnings identify complex backgrounds. Chromium uses the container's process isolation and the application's inert/offline document restrictions; this does not claim a separate hardened browser sandbox. Runtime execution still uses QuickJS isolation and the existing trusted event bridge. APP_DESIGN_CHECKS=off is for bounded fixtures/tests, not production.

## Verification

Regression coverage includes stable-key retries, concurrent requests, changed/stale revisions, saved receipts, discard, temporary-ID normalization, atomic relationship/lookup remapping and rollback, retained detail fields, real-browser bad-design rejection and all supplied palettes at mobile/desktop widths. Existing application, permission and browser tests remain part of release validation. MCP operation descriptions state their effects; workflow and repair instructions stay in the plugin skills rather than prescribing approval/classifier decisions.
