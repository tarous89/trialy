---
name: trialy-workspace
description: Use when the user opens Trialy or works with its clinical team workspaces, trackers, templates, records or document sources.
---

# Trialy workspace

Call `open_workspace` when the user opens Trialy and after a successful connection, resuming their original workspace request. Render its interactive view. If authentication is needed, use the host connection flow; never request passwords or tokens in chat. Trialy signup and consent return to the registered host callback.

For a new account, use the view's onboarding to obtain the workspace name and explicit AI-access confirmation. Do not create extra workspaces or silently enable AI access for existing workspaces.

Read and write only through the authenticated tools. Backend permissions apply to every operation. Never route restricted fields through chat, hidden model context or another tool. The current embedded view uses only AI-accessible data; human-only fields are not supported here yet.

Create and edit through `prepare_change`. Show the preview and obtain explicit confirmation of that particular change before `commit_change`. A permission to connect or read does not authorize saving an experimental preview. Use `discard_preview` when requested. Report a change as saved only after a committed result. If a save response is interrupted, use `save_status` and the same receipt/idempotency identifiers instead of blindly repeating a write.

Original document storage and extraction are separate. An unavailable or partial extraction is a quiet source-coverage flag, not proof the original is lost. When answering questions, disclose material missing coverage; do not invent content from unextracted documents.

Trialy is not fit for patient-level data. Do not claim regulatory certification, validated electronic signatures, zero-loss production recovery, or complete feature parity. Do not add patient-content screening or quarantine. Keep the user-facing intended-use notice and report actual supported behavior.

The workspace declares host entrypoints and a fullscreen preference. Automatic opening after OAuth depends on the host; never claim this was verified merely because the tool was registered.
