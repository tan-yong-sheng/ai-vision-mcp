---
description: "Use this command to validate design system token usage and detect visual consistency violations"
context: fork
allowed-tools: Bash(node:*)
argument-hint: "--imageSource <source> [--design-system <path>] [--userPrompt <text>]"
---

Route this request to the `design-eval:visual-consistency-tester` subagent.
The final user-visible response must be the subagent's output verbatim.

Raw slash-command arguments:
`$ARGUMENTS`
