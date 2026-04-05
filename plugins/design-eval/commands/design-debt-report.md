---
description: Custom vs system component ratio analysis and design debt calculation
allowed-tools: Bash(node:*)
argument-hint: "--imageSource <source> [--threshold <percent>]"
disable-model-invocation: true
---

!`node "${CLAUDE_PLUGIN_ROOT}/plugins/design-eval/scripts/design-eval-router.mjs" design-debt-report $ARGUMENTS`
