---
description: Full design audit across heuristics, accessibility, visual consistency, and design system
allowed-tools: Bash
argument-hint: "--imageSource <source> [--depth quick|standard|deep]"
context: fork
---

# /design-eval:audit-design

Conduct a comprehensive design audit analyzing usability heuristics, accessibility compliance, visual consistency, and design system adherence.

Route this request to the design-eval router script.

Raw user request:
$ARGUMENTS

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | Image source: remote URL, local file, data URI, or GCS URI (required) | `--imageSource https://example.com/design.jpg` |
| `--depth` | Audit depth: quick (overview), standard (detailed), deep (comprehensive) | `--depth deep` |
| `--userPrompt` | Optional user context to focus audit on specific concerns | `--userPrompt "Focus on mobile responsiveness"` |
| `--temperature` | AI response temperature (0.0–2.0, default: 0.0 for deterministic) | `--temperature 0.1` |
| `--top-p` | Top-p sampling (0.0–1.0) | `--top-p 0.9` |
| `--top-k` | Top-k sampling (1–100) | `--top-k 40` |
| `--max-tokens` | Maximum output tokens (default: 2000) | `--max-tokens 3000` |

## Examples

```bash
# Standard audit
/design-eval:audit-design --imageSource https://example.com/design.jpg

# Deep audit with user focus
/design-eval:audit-design --imageSource ./screenshots/design.png --depth deep --userPrompt "Prioritize accessibility issues"

# With parameter tuning
/design-eval:audit-design --imageSource https://example.com/design.jpg --temperature 0.1 --max-tokens 2500

# All options
/design-eval:audit-design --imageSource ./design.jpg --depth standard --userPrompt "Mobile-first design" --temperature 0.2 --max-tokens 2000
```

## Execution Instructions

Invoke the design-eval router script which will:

1. Parse command arguments (--imageSource, --depth, --userPrompt, tuning parameters)
2. Select appropriate depth-based prompt template
3. Wrap user prompt (if provided) with "ADDITIONAL FOCUS:" prefix
4. Build ai-vision CLI arguments with all parameters
5. Invoke ai-vision audit-design command
6. Return output verbatim to user

**Prerequisites:**
- `ai-vision-mcp` installed globally: `npm install -g ai-vision-mcp`
- Environment variables configured: GEMINI_API_KEY or VERTEX_* credentials
