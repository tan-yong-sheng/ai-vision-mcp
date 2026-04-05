---
name: visual-consistency-validation
description: Use when validating design system token compliance, detecting visual regressions, or analyzing responsive design consistency across breakpoints and modes
---

# Visual Consistency Validation Skill

Systematic approach to validating design system compliance across all breakpoints, modes, and interactive states.

## Core Principle

**Every violation must be: (1) mapped to a specific token, (2) quantified, (3) severity-categorized, and (4) provided with remediation. No rationalization allowed.**

## When to Use

- Validating component compliance against design system tokens
- Detecting visual regressions between baseline and updated designs
- Analyzing responsive design consistency (mobile, tablet, desktop)
- Validating dark mode and alternative state compliance

## The Three Disciplines

### 1. Systematic Token Mapping

Every violation follows this template:
```
Property: [CSS property]
Current: [actual value]
Token: [token name from design system]
Expected: [token value]
Difference: [quantified: pixels, %, hex delta]
```

### 2. Comprehensive Coverage

Validate everything:
- [ ] All color properties (text, background, border, shadow, icon)
- [ ] All spacing (padding, margin, gap, position)
- [ ] All typography (size, weight, line-height, letter-spacing)
- [ ] All shapes (radius, borders, shadows)
- [ ] All animations (duration, easing)
- [ ] All breakpoints (mobile, tablet, desktop)
- [ ] All modes (light, dark, high-contrast)
- [ ] All interactive states (default, hover, focus, active, disabled)

### 3. Severity Categorization

| Level | When |
|-------|------|
| **CRITICAL** | Accessibility/layout failures (WCAG contrast, broken states, layout shifts) |
| **HIGH** | Token violations with user impact (colors, spacing, typography) |
| **MEDIUM** | Minor deviations (< 10% difference) |
| **LOW** | Very minor (< 5% difference) |

**Rule:** All WCAG failures → CRITICAL (regardless of context).

---

## Red Flags - STOP and Reanalyze

| Red Flag | What to Do |
|----------|-----------|
| "Close enough" | Measure it. Report every difference. |
| "Desktop is primary" | Analyze all breakpoints equally. |
| "Light mode is primary" | Analyze all modes equally. |
| "Minor refinement" | Categorize by severity and report. |
| "Typical for design systems" | Escalate accessibility failures to CRITICAL. |
| "Not evaluating hover states" | Validate all interactive states. |
| "Acceptable variance" | Quantify and report every deviation. |

---

## Validation Checklist

Before completing analysis:

- [ ] All visible properties analyzed
- [ ] All violations mapped to specific tokens
- [ ] All differences quantified (pixels, percentages, hex deltas)
- [ ] All breakpoints analyzed (mobile, tablet, desktop)
- [ ] All modes analyzed (light, dark, high-contrast)
- [ ] All interactive states validated
- [ ] Severity categorized for each violation
- [ ] Accessibility violations escalated to CRITICAL
- [ ] Complete remediation (CSS + testing approach) for each violation
- [ ] No violations rationalized away

---

## Reference Materials

Detailed implementation guidance:

- **[Execution Guide](references/execution-guide.md)** — How visual-consistency-tester implements this skill using Playwright and design tokens
- **[Implementation Patterns](references/implementation-patterns.md)** — Code patterns for token mapping, violation detection, severity calculation, remediation generation
