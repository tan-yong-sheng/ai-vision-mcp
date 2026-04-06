# Visual Consistency Prompts

## Design Preservation Principle

When providing remediation guidance or design suggestions:
- Respect existing design style, components, and tokens
- Suggest modifications to existing patterns, not replacements
- Only recommend overwriting existing style if the user explicitly requests it
- Reference existing component names and design tokens in remediation code

---

## Inferred (Auto-Discovery)

Analyze visual consistency and design tokens. Extract and catalog:
- Color palette (primary, secondary, neutral, semantic colors)
- Typography (font families, sizes, weights, line heights)
- Spacing (margin, padding, gap values)
- Shape (border radius, shadows, strokes)
- Motion (transition durations, easing)

Identify inconsistencies and deviations from inferred patterns.

**Important:** When suggesting improvements, preserve the existing design system. Only recommend design changes if the user explicitly asks to overwrite the current style.

## Validated (Against Design System)

Validate visual consistency against design system tokens. Compare actual usage to expected values for:
- Color palette tokens
- Typography tokens
- Spacing tokens
- Shape tokens
- Motion tokens

For each violation, provide:
- Token name
- Expected value
- Actual value
- Affected elements
- Remediation guidance

Calculate overall consistency score.

**Important:** When suggesting remediation, preserve the existing design system. Provide guidance that works within existing tokens and components. Only recommend design changes if the user explicitly asks to overwrite the current style.

---

## Regression (Baseline vs Current)

Compare baseline and current screenshots to identify visual regressions and unintended changes.

Analyze:
1. Layout changes - elements shifted, resized, or repositioned
2. Color changes - colors differ from baseline or design tokens
3. Typography changes - font sizes, weights, line heights changed
4. Spacing changes - padding, margins, gaps modified
5. Visual state changes - hover/focus/active states differ
6. Component changes - components added, removed, or modified
7. Responsive behavior - layout reflow differs at breakpoints

For each change:
- Identify what changed (element, property, value)
- Assess severity (critical breaks layout, high impacts UX, medium cosmetic, low informational)
- Determine if it's intentional or a regression
- If DESIGN.md provided: check if change aligns with design tokens

Provide:
- Summary of changes detected
- Severity assessment
- Recommendations for fixes
- Design system alignment (if applicable)

Output format:
- Changes organized by severity (critical, high, medium, low)
- For each change: element/component, property, before value, after value
- Visual evidence: affected regions or CSS selectors
- Severity justification
- Remediation guidance
- Design token references (if DESIGN.md provided)
- JSON format with structured fields

**Important:** If DESIGN.md is provided, assess whether changes align with existing design tokens. For example:
- If color changed, check if it matches a design token or is a regression
- If spacing changed, verify it uses existing spacing tokens
- If typography changed, confirm it uses design system font scales
