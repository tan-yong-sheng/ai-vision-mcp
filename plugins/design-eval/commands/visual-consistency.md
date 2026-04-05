---
description: Design system token validation and visual consistency check
allowed-tools: Bash(node:*), AskUserQuestion
argument-hint: "--imageSource <source> [--design-system <path>] [--wait|--background]"
disable-model-invocation: true
---

# /design-eval:visual-consistency

Validate design system token compliance and check visual consistency across components.

Raw slash-command arguments:
`$ARGUMENTS`

## Execution mode rules

- If the raw arguments include `--wait`, run in foreground without asking
- If the raw arguments include `--background`, run in background without asking
- Otherwise, ask the user to choose between foreground and background

## Foreground flow

Run the router script:
```bash
node "${CLAUDE_PLUGIN_ROOT}/plugins/design-eval/scripts/design-eval-router.mjs" visual-consistency $ARGUMENTS
```

Return the command stdout verbatim, exactly as-is. Do not paraphrase, summarize, or add commentary.

## Background flow

Launch the router script in the background:
```bash
node "${CLAUDE_PLUGIN_ROOT}/plugins/design-eval/scripts/design-eval-router.mjs" visual-consistency $ARGUMENTS
```

After launching, tell the user: "Visual consistency check started in the background. Check the output when ready."

## Prerequisites

- `ai-vision-mcp` installed globally: `npm install -g ai-vision-mcp`
- Environment variables configured: GEMINI_API_KEY or VERTEX_* credentials
