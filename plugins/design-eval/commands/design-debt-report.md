---
description: Custom vs system component ratio analysis and design debt calculation
allowed-tools: Bash(node:*), AskUserQuestion
argument-hint: "--imageSource <source> [--threshold <percent>] [--wait|--background]"
disable-model-invocation: true
---

# /design-eval:design-debt-report

Analyze custom component usage, design system adoption, and calculate design debt metrics.

Raw slash-command arguments:
`$ARGUMENTS`

## Execution mode rules

- If the raw arguments include `--wait`, run in foreground without asking
- If the raw arguments include `--background`, run in background without asking
- Otherwise, ask the user to choose between foreground and background

## Foreground flow

Run the router script:
```bash
node "${CLAUDE_PLUGIN_ROOT}/plugins/design-eval/scripts/design-eval-router.mjs" design-debt-report $ARGUMENTS
```

Return the command stdout verbatim, exactly as-is. Do not paraphrase, summarize, or add commentary.

## Background flow

Launch the router script in the background:
```bash
node "${CLAUDE_PLUGIN_ROOT}/plugins/design-eval/scripts/design-eval-router.mjs" design-debt-report $ARGUMENTS
```

After launching, tell the user: "Design debt report started in the background. Check the output when ready."

## Prerequisites

- `ai-vision-mcp` installed globally: `npm install -g ai-vision-mcp`
- Environment variables configured: GEMINI_API_KEY or VERTEX_* credentials
