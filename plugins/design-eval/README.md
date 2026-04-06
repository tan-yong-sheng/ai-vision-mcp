# design-eval Plugin

Claude Code plugin for comprehensive UI/UX design evaluation using Gemini vision analysis.

## What is this?

This plugin provides professional-grade design evaluation capabilities integrated directly into Claude Code. It leverages Google's Gemini vision models through the ai-vision-mcp integration, enabling deep multi-dimensional design assessment across heuristics, accessibility, visual consistency, and design system governance.

**Use cases:**
- **Full design audits** - Multi-dimensional analysis across heuristics, accessibility, visual consistency, and design system governance
- **Accessibility compliance** - WCAG 2.1/3.0 deep-dive with remediation guidance and assistive technology assessment
- **Visual consistency** - Design token validation, violation detection, and visual regression testing
- **Component analysis** - Reusability patterns, design debt calculation, and consolidation opportunities
- **Design system governance** - Maturity level assessment (1-4), adoption metrics, and governance process evaluation

## Prerequisites

1. **Install ai-vision-mcp**
   ```bash
   npm install -g ai-vision-mcp
   ```

2. **Set up API credentials**

   **Option A: Google AI Studio (Recommended)**
   ```bash
   export IMAGE_PROVIDER="google"
   export GEMINI_API_KEY="your-api-key-from-aistudio.google.com"
   ```

   **Option B: Vertex AI (Google Cloud)**
   ```bash
   export IMAGE_PROVIDER="vertex_ai"
   export VERTEX_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
   export VERTEX_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   export VERTEX_PROJECT_ID="your-gcp-project-id"
   export GCS_BUCKET_NAME="your-gcs-bucket"
   ```

3. **Verify installation**
   ```bash
   ai-vision --help
   ```

## Installation

Install via Claude Code's plugin system:

```
/plugin install ./plugins/design-eval
```

Or add from directory:
```
/plugin add design-eval
```

## Usage

### Slash Commands

All commands follow the pattern: `/design-eval:<command>`

```bash
# Full design audit (heuristics + accessibility + visual + governance)
/design-eval:audit-design --imageSource https://example.com/screenshot.png --userPrompt "focus on mobile experience" --depth deep

# Accessibility compliance check (WCAG 2.1/3.0)
/design-eval:audit-accessibility --imageSource https://example.com/form.jpg --userPrompt "check keyboard navigation" --level AA --wcag-version 3.0

# Visual consistency validation (design tokens)
/design-eval:audit-visual-consistency --imageSource ./component.png --userPrompt "validate against brand colors" --design-system ./design-tokens.json

# Component reusability analysis
/design-eval:audit-components --imageSource ./src/components --userPrompt "identify duplicate patterns" --scope src/components

# Design system maturity and debt assessment
/design-eval:audit-design-debt --imageSource ./screenshots --userPrompt "assess governance health" --threshold 30
```

### Command Reference

| Command | Purpose | Key Arguments |
|---------|---------|---------------|
| `audit-design` | Comprehensive multi-dimensional audit | `--depth [quick\|standard\|deep]` |
| `audit-accessibility` | WCAG 2.1/3.0 compliance analysis | `--level [A\|AA\|AAA]`, `--wcag-version [2.1\|3.0]` |
| `audit-visual-consistency` | Design token validation & regressions | `--design-system <path>` |
| `audit-components` | Component reusability & patterns | `--scope <directory>` |
| `audit-design-debt` | Maturity & governance assessment | `--threshold <percent>` |

### Argument Format

All commands use this standardized format:

```
--imageSource <source>        Required: URL, file path, or base64 image
--userPrompt <user-prompt>    Required: Custom focus areas and instructions
[optional params]             Optional parameters in brackets
```

**Examples:**
```bash
# With required params only
/design-eval:audit-design --imageSource ./screenshot.png --userPrompt "check for accessibility issues"

# With optional depth parameter
/design-eval:audit-design --imageSource https://example.com --userPrompt "detailed analysis" --depth deep

# With multiple optional params
/design-eval:audit-accessibility --imageSource ./form.png --userPrompt "WCAG compliance" --level AA --wcag-version 3.0
```

### Autonomous Agents

Claude can automatically spawn specialized subagents for deep analysis:

| Agent | Specialization | Triggered By |
|-------|---------------|--------------|
| `design-auditor` | Full audit orchestrator (heuristics, accessibility, visual, governance) | `audit-design` |
| `accessibility-tester` | WCAG 2.1/3.0 compliance expert with remediation guidance | `audit-accessibility` |
| `visual-consistency-tester` | Design token validator and visual regression detector | `audit-visual-consistency` |
| `design-system-maturity-tester` | Design system governance and maturity assessor | `audit-components`, `audit-design-debt` |

Agents automatically orchestrate in parallel and aggregate findings into unified reports.

## Skills & Reference Materials

### Design Audit Framework
- **Scope:** Nielsen's 10 usability heuristics, WCAG 2.1/3.0 principles, design system maturity models
- **Location:** `skills/design-audit-framework/`
- **References:**
  - `wcag-checklist.md` — WCAG 2.1/3.0 compliance criteria and testing methods
  - `heuristics-guide.md` — Nielsen's 10 heuristics with detailed guidance
  - `design-system-metrics.md` — Maturity levels 1-4 and adoption metrics
  - `accessibility-patterns.md` — Common a11y patterns and remediation code

### Visual Consistency Validation
- **Scope:** Design token compliance, violation detection, severity categorization, remediation patterns
- **Location:** `skills/visual-consistency-validation/`
- **Core Principle:** Every violation must be (1) mapped to a specific token, (2) quantified, (3) severity-categorized, and (4) provided with remediation
- **Red Flags:** Explicit counters against rationalizations ("close enough", "desktop is primary", etc.)
- **Validation Checklist:** Properties, breakpoints, modes, states, accessibility

### Design System Governance
- **Scope:** Design system maturity models, adoption metrics, governance processes, design debt assessment
- **Location:** `skills/design-system-governance/`
- **References:**
  - `maturity-model.md` — Levels 1-4 with characteristics and transition paths
  - `governance-process.md` — Component request workflows and approval processes

## Output Formats

Results are returned as structured JSON with:

- **Summary** - Overview metrics (total findings, severity distribution, consistency scores)
- **Findings** - Issues organized by category with:
  - Title and severity (critical, high, medium, low, info)
  - Description of the issue
  - Affected elements and evidence
  - Remediation guidance with code examples
  - Impact assessment and priority
- **Recommendations** - Prioritized action items with effort estimation
- **Metrics** - Quantified data (adoption rates, consistency scores, maturity levels)

### Example: Accessibility Check Output
```json
{
  "summary": {
    "totalFindings": 8,
    "bySeverity": {
      "critical": 2,
      "high": 3,
      "medium": 2,
      "low": 1
    },
    "wcagLevel": "AA",
    "wcagVersion": "3.0",
    "complianceStatus": "partial"
  },
  "findings": [
    {
      "id": "color-contrast-001",
      "title": "Insufficient color contrast on primary button",
      "severity": "critical",
      "criterion": "WCAG 2.1 1.4.3 Contrast (Minimum)",
      "description": "Button text has 3.2:1 contrast ratio; AA requires 4.5:1",
      "affectedElements": [".btn-primary", ".btn-primary:hover"],
      "remediation": {
        "cssCode": ".btn-primary { color: #000000; }",
        "effort": "low"
      },
      "testingApproach": "Use browser contrast checker or axe DevTools"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "recommendation": "Fix critical contrast violations",
      "effort": "low",
      "impact": "high"
    }
  ]
}
```

### Example: Visual Consistency Output
```json
{
  "summary": {
    "totalFindings": 5,
    "consistencyScore": 92,
    "breakpointsAnalyzed": ["mobile", "tablet", "desktop"],
    "statesAnalyzed": ["light", "dark", "high-contrast"]
  },
  "findings": [
    {
      "title": "Primary color mismatch in button component",
      "severity": "high",
      "tokenName": "color-primary",
      "expectedValue": "#0066CC",
      "actualValue": "#0077DD",
      "affectedElements": [".btn-primary"],
      "remediation": {
        "cssCode": ".btn-primary { color: #0066CC; }",
        "effort": "low"
      }
    }
  ],
  "regressions": []
}
```

### Example: Design System Maturity Output
```json
{
  "summary": {
    "maturityLevel": 2,
    "maturityLevelDescription": "Inconsistent",
    "adoptionRate": 45,
    "customComponentRatio": 55,
    "totalComponents": 127,
    "systemComponents": 57,
    "customComponents": 70,
    "debtScore": 7.2
  },
  "maturityAssessment": {
    "level": 2,
    "justification": "Design system exists with documented components, but adoption is inconsistent across teams. Governance process is informal.",
    "characteristics": [
      "Design system exists with 57 documented components",
      "Adoption rate of 45% indicates spotty usage",
      "55% custom components suggest governance gaps",
      "Informal component request process"
    ]
  },
  "adoptionMetrics": {
    "byTeam": [
      {
        "team": "Frontend Platform",
        "adoptionRate": 78,
        "customComponents": 12,
        "systemComponents": 42
      }
    ],
    "trend": "improving"
  },
  "recommendations": [
    {
      "priority": 1,
      "recommendation": "Establish formal component request process",
      "effort": "medium",
      "impact": "high"
    }
  ],
  "roadmap": {
    "currentLevel": 2,
    "targetLevel": 3,
    "phases": [
      {
        "phase": "Phase 1: Governance Foundation",
        "duration": "4 weeks",
        "goals": ["Establish component request process", "Document governance guidelines"]
      }
    ]
  }
}
```

## Best Practices

1. **Be specific with prompts** - "audit accessibility for login form" > "check design"
2. **Use appropriate depth levels** - quick for overview, standard for typical review, deep for comprehensive analysis
3. **Set clear scope** - Focus analysis with `--scope`, `--design-system`, or `--threshold` parameters
4. **Review findings in context** - Severity indicates importance; prioritize critical and high findings first
5. **Use with design system** - Provide design token definitions via `--design-system` for more accurate validation
6. **Iterate and retest** - Run audit again after fixes to verify improvements and measure progress

## Architecture

```
User Command (/design-eval:audit-design)
    ↓
Command Spec (commands/audit-design.md)
    ↓
Subagent (design-eval:design-auditor)
    ↓
Gemini Vision Analysis (via ai-vision-mcp)
    ↓
Structured Report (JSON)
```

### Orchestration Pattern

The `design-auditor` agent automatically orchestrates parallel analysis:

```
design-auditor
    ├─→ accessibility-tester (WCAG compliance)
    ├─→ visual-consistency-tester (design tokens)
    └─→ design-system-maturity-tester (governance)
         ↓
    Aggregate & Deduplicate Findings
         ↓
    Unified Multi-Dimensional Report
```

## Plugin Structure

```
design-eval/
├── .claude-plugin/
│   └── plugin.json                 # Plugin manifest
├── commands/                        # Slash command specs (5 commands)
│   ├── audit-design.md
│   ├── audit-accessibility.md
│   ├── audit-visual-consistency.md
│   ├── audit-components.md
│   └── audit-design-debt.md
├── agents/                          # Subagent definitions (4 agents)
│   ├── design-auditor.md
│   ├── accessibility-tester.md
│   ├── visual-consistency-tester.md
│   └── design-system-maturity-tester.md
├── skills/                          # Domain knowledge & guidance (3 skills)
│   ├── design-audit-framework/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── wcag-checklist.md
│   │       ├── heuristics-guide.md
│   │       ├── design-system-metrics.md
│   │       └── accessibility-patterns.md
│   ├── visual-consistency-validation/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── execution-guide.md
│   │       └── implementation-patterns.md
│   └── design-system-governance/
│       ├── SKILL.md
│       └── references/
│           ├── maturity-model.md
│           └── governance-process.md
├── README.md                        # This file
├── TESTING.md                       # Testing and verification guide
└── .gitignore
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Command not found | Verify plugin is installed: `/plugin list` |
| Authentication error | Check API credentials are set in environment variables |
| Rate limiting | Wait and retry; consider batching requests |
| Token limit exceeded | Narrow scope with `--scope` or use smaller images |
| Invalid output | Verify `--imageSource` is accessible/valid |
| Timeout | Simplify prompt or reduce context size |

## Configuration

### Environment Variables

```bash
# Gemini/Vision Provider
IMAGE_PROVIDER="google"                    # or "vertex_ai"
GEMINI_API_KEY="your-api-key"             # For Google AI Studio
VERTEX_CLIENT_EMAIL="..."                  # For Vertex AI
VERTEX_PRIVATE_KEY="..."                   # For Vertex AI
VERTEX_PROJECT_ID="your-project-id"        # For Vertex AI
GCS_BUCKET_NAME="your-bucket"              # For Vertex AI video storage
```

## Version History

- **1.0.0** (2026-04-06)
  - Initial release with 5 commands
  - 4 specialized subagents
  - 3 skill domains with comprehensive reference materials
  - Support for WCAG 2.1/3.0 accessibility analysis
  - Design token validation with severity categorization
  - Design system maturity assessment (levels 1-4)

## License

Apache-2.0
