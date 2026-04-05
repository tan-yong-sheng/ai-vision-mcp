---
description: Design system token validation and visual consistency check
allowed-tools: Bash
argument-hint: "--imageSource <source> [--design-system <path>]"
context: fork
---

# /design-eval:visual-consistency

Validate design system token compliance and check visual consistency across components.

Route this request to the design-eval router script.

Raw user request:
$ARGUMENTS

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | Image source: remote URL, local file, data URI, or GCS URI (required) | `--imageSource https://example.com/design.jpg` |
| `--design-system` | Path to design system definition (JSON or YAML) | `--design-system ./design-system.json` |
| `--userPrompt` | Optional user context to focus audit on specific concerns | `--userPrompt "Check spacing consistency"` |
| `--temperature` | AI response temperature (0.0–2.0, default: 0.0 for deterministic) | `--temperature 0.1` |
| `--top-p` | Top-p sampling (0.0–1.0) | `--top-p 0.9` |
| `--top-k` | Top-k sampling (1–100) | `--top-k 40` |
| `--max-tokens` | Maximum output tokens (default: 2000) | `--max-tokens 2500` |

## Examples

```bash
# Check visual consistency (infer tokens from usage)
/design-eval:visual-consistency --imageSource https://example.com/design.jpg

# With design system definition
/design-eval:visual-consistency --imageSource ./screenshots/design.png --design-system ./design-system.json

# With user focus
/design-eval:visual-consistency --imageSource https://example.com/design.jpg --userPrompt "Verify color palette consistency"

# With parameter tuning
/design-eval:visual-consistency --imageSource ./design.jpg --temperature 0.1 --max-tokens 2500
```

## Execution Instructions

Invoke the design-eval router script which will:

1. Parse command arguments (--imageSource, --design-system, --userPrompt, tuning parameters)
2. Select appropriate prompt template (inferred vs. validated against design system)
3. Wrap user prompt (if provided) with "ADDITIONAL FOCUS:" prefix
4. Build ai-vision CLI arguments with all parameters
5. Invoke ai-vision audit-design command
6. Return output verbatim to user

**Prerequisites:**
- `ai-vision-mcp` installed globally: `npm install -g ai-vision-mcp`
- Environment variables configured: GEMINI_API_KEY or VERTEX_* credentials
