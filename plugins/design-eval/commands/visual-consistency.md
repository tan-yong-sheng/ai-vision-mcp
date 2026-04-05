---
description: Design system token validation and visual consistency check
allowed-tools: Bash(node:*)
argument-hint: "--imageSource <source> [--design-system <path>]"
disable-model-invocation: true
---

!`node "${CLAUDE_PLUGIN_ROOT}/plugins/design-eval/scripts/design-eval-router.mjs" visual-consistency $ARGUMENTS`
