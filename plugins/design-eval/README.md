# design-eval Plugin

Claude Code plugin for comprehensive UI/UX design evaluation using Gemini CLI.

## What is this?

This plugin provides professional-grade design evaluation capabilities integrated directly into Claude Code. It delegates analysis to Google's Gemini CLI, leveraging its vision capabilities and 1M token context window for deep design assessment.

**Use cases:**
- **Full design audits** - Heuristics, accessibility, visual consistency, design system compliance
- **Accessibility compliance** - WCAG 2.1/3.0 deep-dive with remediation guidance
- **Visual consistency** - Design token validation and pattern adherence
- **Component analysis** - Reusability metrics and design debt assessment
- **Design system governance** - Maturity level assessment and governance validation

## Prerequisites

1. **Install ai-vision CLI**
   ```bash
   npm install -g ai-vision-mcp
   ```

2. **Set up API credentials**

   **Option A: Google AI Studio (Recommended)**
   ```bash
   export IMAGE_PROVIDER="google"
   export VIDEO_PROVIDER="google"
   export GEMINI_API_KEY="your-api-key-from-aistudio.google.com"
   ```

   **Option B: Vertex AI (Google Cloud)**
   ```bash
   export IMAGE_PROVIDER="vertex_ai"
   export VIDEO_PROVIDER="vertex_ai"
   export VERTEX_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
   export VERTEX_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   export VERTEX_PROJECT_ID="your-gcp-project-id"
   export GCS_BUCKET_NAME="your-gcs-bucket"
   ```

3. **Verify installation**
   ```bash
   ai-vision audit-design --help
   ```

## Installation

Install via Claude Code's plugin marketplace:

```
/plugin marketplace add design-eval
```

Or install directly from the repository:

```
/plugin install https://github.com/your-org/design-eval
```

## Usage

### Slash Commands

```bash
# Full design audit
/design-eval:audit-design --url https://example.com --depth deep

# Accessibility compliance check
/design-eval:accessibility-check --url https://example.com --level AA --wcag-version 3.0

# Visual consistency validation
/design-eval:visual-consistency --url https://example.com --design-system ./design-system.json

# Component reusability analysis
/design-eval:component-audit --url https://example.com --scope src/components

# Design debt report
/design-eval:design-debt-report --url https://example.com --threshold 30
```

### Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--url` | URL or file path to design artifact | `--url https://example.com` |
| `--depth` | Audit depth: quick, standard, deep | `--depth deep` |
| `--level` | WCAG compliance level: A, AA, AAA | `--level AA` |
| `--wcag-version` | WCAG version: 2.1, 3.0 | `--wcag-version 3.0` |
| `--design-system` | Path to design system definition | `--design-system ./ds.json` |
| `--scope` | Directory scope for analysis | `--scope src/components` |
| `--threshold` | Design debt threshold percentage | `--threshold 30` |

### Autonomous Agents

Claude can automatically spawn specialized subagents for deep analysis:

- **design-eval:design-auditor** - Full audit orchestrator
- **design-eval:accessibility-tester** - Accessibility expert
- **design-eval:design-system-reviewer** - Governance specialist
- **design-eval:visual-tester** - Visual regression expert

Just ask questions like:
- "Audit the design at https://example.com"
- "Check accessibility compliance for this design"
- "Analyze our design system maturity"
- "Detect visual regressions in this component"

## Skills & Reference Materials

### Design Audit Framework
- Nielsen's 10 usability heuristics
- WCAG 2.1/3.0 compliance checklist
- Design system maturity models
- Accessibility patterns and fixes

### Visual Testing
- Playwright screenshot API usage
- Visual regression testing patterns
- Baseline comparison workflows

### Design System Governance
- Maturity level assessment (1-4)
- Component adoption metrics
- Design debt calculation
- Governance process workflows

## Output Formats

Results are returned as structured JSON with:
- **Findings** - Issues organized by category (heuristics, accessibility, visual, system)
- **Severity** - critical, high, medium, low, info
- **Remediation** - Actionable guidance with code examples
- **Evidence** - Screenshot regions and code references

## Best Practices

1. **Be specific** - "audit accessibility for login form" > "check design"
2. **Set scope** - Focus on specific areas to get deeper analysis
3. **Use depth levels** - quick for overview, deep for comprehensive review
4. **Combine with other tools** - Use alongside code review and testing

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Authentication error | Run `gemini auth` |
| Rate limiting | Wait and retry with backoff |
| Token limit exceeded | Narrow scope with `--scope` or `--url` |
| Timeout | Simplify prompt or reduce context |
| No output | Verify `--url` is accessible |

## Architecture

```
User Command (/design-eval:audit-design)
    ↓
Command Spec (commands/audit-design.md)
    ↓
Subagent (design-eval:design-auditor)
    ↓
Bash: gemini CLI (headless mode)
    ↓
Gemini 3.1-pro Analysis
    ↓
Structured Report (JSON)
```

## Plugin Structure

```
design-eval/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── commands/                # Slash command specs
│   ├── audit-design.md
│   ├── accessibility-check.md
│   ├── visual-consistency.md
│   ├── component-audit.md
│   └── design-debt-report.md
├── agents/                  # Subagent definitions
│   ├── design-auditor.md
│   ├── accessibility-tester.md
│   ├── design-system-reviewer.md
│   └── visual-tester.md
├── skills/                  # Domain knowledge & guidance
│   ├── design-audit-framework/
│   ├── visual-testing/
│   └── design-system-governance/
└── README.md
```

## License

Apache-2.0
