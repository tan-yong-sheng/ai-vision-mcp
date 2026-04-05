---
description: Deep WCAG 2.1/3.0 compliance review with remediation guidance
allowed-tools: Bash(node:*)
argument-hint: "--imageSource <source> [--level A|AA|AAA] [--wcag-version 2.1|3.0]"
disable-model-invocation: true
---

!`node "${CLAUDE_PLUGIN_ROOT}/plugins/design-eval/scripts/design-eval-router.mjs" accessibility-check $ARGUMENTS`
