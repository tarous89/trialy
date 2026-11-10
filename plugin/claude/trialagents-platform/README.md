# TrialAgents for Claude

TrialAgents is cross-platform software for AI-native biotechs: a suite of connected, customizable life-science apps that work inside Claude, inside ChatGPT and on the web at [platform.trialagents.com](https://platform.trialagents.com). This plugin connects Claude to your TrialAgents account.

## What it does

- Opens your TrialAgents apps and workspace inside Claude. On Claude web, desktop and mobile the apps appear as interactive views; in Claude Code results are returned as text.
- Reads and searches the records, projects and documents your account is allowed to see.
- Prepares changes to records and apps for your review, and saves only the exact change you approve.
- Builds new apps from approved TrialAgents templates or as custom apps, and revises existing ones while keeping their data, IDs and permissions.
- Prepares email and other app actions. Scheduled research automations run on the ChatGPT runner; Claude can read them but not create or change them yet.

## Use it

1. Install the plugin, then connect the **TrialAgents** connector from the plugin's Connectors tab.
2. Sign in with your TrialAgents account, or create one, and approve the connection.
3. Ask Claude, for example: "Open my TrialAgents workspace", "Show the open items in my CRO selection tracker", or "Build a grant pipeline app from a template and save it".

## Access control

Claude is a separate connection in TrialAgents. The account owner can switch Claude on or off and restrict its access to specific projects, apps, tables and columns under **Access**, independently of ChatGPT. Claude can only ever see and change what the signed-in person is allowed to, and permission changes always need approval in the signed-in TrialAgents website.

## Data

The plugin's connector sends your requests, and the record, app and document data needed to answer them, between Claude and your TrialAgents account at `https://platform.trialagents.com/claude/mcp`. Sign-in uses OAuth with PKCE; TrialAgents stores only hashed tokens. The plugin itself contains only instructions and stores no data. It runs no scripts, hooks or local programs. TrialAgents is not intended for patient-level data or regulated clinical decisions.

## Support

[trialagents.com](https://trialagents.com)
