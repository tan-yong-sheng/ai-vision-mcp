---
description: Component reusability and pattern analysis
allowed-tools: Bash
argument-hint: "--imageSource <source> [--scope src/components]"
context: fork
---

# /design-eval:component-audit

Analyze component reusability, pattern consistency, and design debt across your component library.

Route this request to the design-eval router script.

Raw user request:
$ARGUMENTS

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | Image source: remote URL, local file, data URI, or GCS URI (required) | `--imageSource https://example.com/components.jpg` |
| `--scope` | Directory scope for component analysis (optional) | `--scope src/components` |
| `--userPrompt` | Optional user context to focus audit on specific concerns | `--userPrompt "Identify high-impact duplicates"` |
| `--temperature` | AI response temperature (0.0–2.0, default: 0.0 for deterministic) | `--temperature 0.1` |
| `--top-p` | Top-p sampling (0.0–1.0) | `--top-p 0.9` |
| `--top-k` | Top-k sampling (1–100) | `--top-k 40` |
| `--max-tokens` | Maximum output tokens (default: 2500) | `--max-tokens 3000` |

## Examples

```bash
# Analyze all components
/design-eval:component-audit --imageSource https://example.com/components.jpg

# Analyze specific directory with user focus
/design-eval:component-audit --imageSource ./screenshots/components.png --scope src/components --userPrompt "Find button component variations"

# With parameter tuning
/design-eval:component-audit --imageSource https://example.com/components.jpg --temperature 0.1 --max-tokens 3000
```

## Execution Instructions

Invoke the design-eval router script which will:

1. Parse command arguments (--imageSource, --scope, --userPrompt, tuning parameters)
2. Select component audit prompt template
3. Wrap user prompt (if provided) with "ADDITIONAL FOCUS:" prefix
4. Build ai-vision CLI arguments with all parameters
5. Invoke ai-vision analyze-image command
6. Return output verbatim to user

**Prerequisites:**
- `ai-vision-mcp` installed globally: `npm install -g ai-vision-mcp`
- Environment variables configured: GEMINI_API_KEY or VERTEX_* credentials
