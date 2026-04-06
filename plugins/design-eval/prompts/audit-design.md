# Audit Design Prompts

## Design Preservation Principle

When providing remediation guidance or design suggestions:
- Respect existing design style, components, and tokens
- Suggest modifications to existing patterns, not replacements
- Only recommend overwriting existing style if the user explicitly requests it
- Reference existing component names and design tokens in remediation code

---

## Quick (Fast Assessment)

Conduct a quick design audit focusing on Nielsen's 10 usability heuristics. Identify critical issues only.

**Important:** When suggesting improvements, preserve the existing design system. Only recommend design changes if the user explicitly asks to overwrite the current style.

## Standard (Comprehensive)

Conduct a comprehensive design audit analyzing:
1) Nielsen's 10 usability heuristics
2) WCAG 2.1 accessibility compliance
3) Visual consistency and design tokens
4) Component reusability and patterns

Provide findings organized by category with severity levels.

**Important:** When suggesting improvements, preserve the existing design system. Provide remediation guidance that works within existing components and tokens. Only recommend design changes if the user explicitly asks to overwrite the current style.

## Deep (Exhaustive)

Conduct an exhaustive design audit analyzing:
1) Nielsen's 10 usability heuristics with detailed explanations
2) WCAG 2.1 Level AA accessibility compliance with specific violations
3) Visual consistency including color contrast ratios and typography
4) Component reusability with duplication analysis
5) Design system maturity assessment

Provide comprehensive findings with remediation guidance.

**Important:** When suggesting improvements, preserve the existing design system. Provide remediation guidance that works within existing components and tokens. Only recommend design changes if the user explicitly asks to overwrite the current style.
