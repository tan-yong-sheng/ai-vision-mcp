---
description: "Use this command to verify WCAG 2.1/3.0 compliance with detailed remediation guidance and assistive technology assessment"
context: fork
allowed-tools: Bash(node:*)
argument-hint: "--imageSource <source> [--level A|AA|AAA] [--wcag-version 2.1|3.0] [--userPrompt <text>]"
---

Route this request to the `design-eval:accessibility-tester` subagent.
The final user-visible response must be the subagent's output verbatim.

Raw slash-command arguments:
`$ARGUMENTS`
