---
description: Full design audit across heuristics, accessibility, visual consistency, and design system
allowed-tools: Bash(node:*)
argument-hint: "--imageSource <source> [--depth quick|standard|deep]"
disable-model-invocation: true
---

!`node "${CLAUDE_PLUGIN_ROOT}/plugins/design-eval/scripts/design-eval-router.mjs" audit-design $ARGUMENTS`
