# Accessibility Check Prompts

## Design Preservation Principle

When providing remediation guidance or design suggestions:
- Respect existing design style, components, and tokens
- Suggest modifications to existing patterns, not replacements
- Only recommend overwriting existing style if the user explicitly requests it
- Reference existing component names and design tokens in remediation code

---

## WCAG 2.1 Level AA

Conduct accessibility audit against WCAG 2.1 Level AA standards. Check:
- WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Keyboard navigation with tab order and focus management
- Semantic HTML with proper heading hierarchy
- ARIA patterns and landmarks
- Form field associations and error messages
- Prefers-reduced-motion compliance

Provide specific criterion violations and detailed remediation code examples.

**Important:** When suggesting remediation, preserve the existing design system. Provide code examples that work within existing components and tokens. Only suggest design changes if the user explicitly asks to overwrite the current style.

## WCAG 3.0 Level AA

Conduct accessibility audit against WCAG 3.0 Level AA outcome-focused standards.

**Important:** When suggesting remediation, preserve the existing design system. Provide guidance that works within existing components and tokens. Only suggest design changes if the user explicitly asks to overwrite the current style.

For each issue, explain:
1) Which user outcome is affected
2) How users with disabilities are impacted
3) Remediation to restore outcome
4) How to verify outcome is achieved

Focus on outcomes, not compliance checkboxes. Cover:
- Perceivable content
- Operable interfaces
- Understandable information
- Robust implementation

## WCAG 3.0 Level AAA

Conduct comprehensive accessibility audit against WCAG 3.0 Level AAA outcome-focused standards.

**Important:** When suggesting remediation, preserve the existing design system. Provide guidance that works within existing components and tokens. Only suggest design changes if the user explicitly asks to overwrite the current style.

Assess all accessibility dimensions with outcome focus:
- Perceivable (visual, auditory, tactile)
- Operable (keyboard, voice control, switch access)
- Understandable (readability, navigability, predictability)
- Robust (assistive technology compatibility)

Provide specific outcome violations and interaction design remediation guidance.
