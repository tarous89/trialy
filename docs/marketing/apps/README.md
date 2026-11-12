# TrialAgents Apps — SEO & LLM content plans

This directory holds **one dedicated Markdown content plan per TrialAgents built-in app**. The plans are added **one app at a time**; do not create speculative campaigns or empty placeholder files for apps that have not been selected.

- **Shared methodology and page layouts:** [TrialAgents Apps SEO & LLM Content Playbook](../TRIALAGENTS_APPS_SEO_AND_LLM_CONTENT_PLAYBOOK.md)
- **Template for the next app:** [_APP_CONTENT_PLAN_TEMPLATE.md](_APP_CONTENT_PLAN_TEMPLATE.md)
- **Documentation home:** [TrialAgents documentation](../../README.md)

## App plans

| App | Plan | Status | Last reviewed |
| --- | --- | --- | --- |
| Runway | [Runway SEO & LLM content plan](runway.md) | Runway hub and Excel comparison published; editorial/SEO audit recorded | 2026-11-12 |

<!--
When the first plan is approved, replace the sentence above with a Markdown table:
| App | Plan | Status | Last reviewed |
| --- | --- | --- | --- |
| <Public app name> | [SEO/LLM plan](<app-slug>.md) | Planning / Approved / Published | YYYY-MM-DD |

Add one row for each newly documented app. Link to its real file, never a missing placeholder.
-->

## Procedure to add an app

1. Confirm its current **public app name**, approved catalog ID/version, intended users, and actual feature and ChatGPT/Claude/web support with [current platform context](../../../CONTEXT.md). A plan is not evidence of feature availability.
2. Copy [_APP_CONTENT_PLAN_TEMPLATE.md](_APP_CONTENT_PLAN_TEMPLATE.md) to `<app-slug>.md` in this directory (lowercase hyphenated, durable slug). Give it a human-readable H1 such as `[App] — SEO & LLM content plan`.
3. Keep **Series A–E distinct**: A comparison pages; B vendor alternatives and category rankings; C assistant-native discovery; D real biotech/CRO workflows; E practical guides and resources. Select relevant ideas for the app, with bullet outlines in each proposed article.
4. For each idea, specify target reader/search intent, suggested URL/H1, unique angle, 4–8 essential content bullets, evidence needed, and priority. Check overlap to avoid thin or cannibalizing pages.
5. Include links at the top to this directory and the shared [playbook](../TRIALAGENTS_APPS_SEO_AND_LLM_CONTENT_PLAYBOOK.md). Keep the complete app plan in **one file**; do not create one MD file per article unless deliberately requested later.
6. Add one linked row under **App plans** above. Update the plan's status and substantive review date when it changes.
7. Before publishing actual web pages, use the shared playbook's independent feature verification, fairness, technical SEO and editorial acceptance criteria.

## Link structure

```text
docs/marketing/
  TRIALAGENTS_APPS_SEO_AND_LLM_CONTENT_PLAYBOOK.md   # shared standards for A-E
  apps/
    README.md                                        # all app plan links
    _APP_CONTENT_PLAN_TEMPLATE.md                    # copy for each new app
    <app-slug>.md                                    # created only when its app is selected
```

**Scope:** This is a content planning library, not a page generator, marketing deployment, approval of an app feature, or an instruction to publish URLs before the page exists.
