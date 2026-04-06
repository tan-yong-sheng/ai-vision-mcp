---
name: wcag-compliance
description: "Use this skill when verifying WCAG 2.1/3.0 compliance, mapping accessibility violations to specific criteria, or providing remediation guidance with code examples"
user-invocable: false
---

# WCAG Compliance

Deep accessibility compliance guidance for WCAG 2.1 (compliance-focused) and WCAG 3.0 (outcome-focused) standards.

## When to Use

Use this skill when:
- Auditing for WCAG 2.1 or WCAG 3.0 compliance
- Mapping findings to specific WCAG criteria
- Providing remediation guidance with code examples
- Testing accessibility fixes
- Explaining user impact and accommodation needs

## Reference Materials

This skill includes comprehensive reference documentation:

- **[wcag-2.2-complete-criteria.md](references/wcag-2.2-complete-criteria.md)** — All 78 WCAG 2.2 success criteria organized by level (A, AA, AAA) with common issues and remediation guidance
- **[wcag-3.0-outcomes-framework.md](references/wcag-3.0-outcomes-framework.md)** — Outcome-focused accessibility framework, paradigm shift from WCAG 2.1, audit workflow, and remediation patterns
- **[aria-patterns-reference.md](references/aria-patterns-reference.md)** — 13 essential ARIA patterns with code examples, keyboard support, and screen reader behavior
- **[A11Y-PATTERNS.md](references/A11Y-PATTERNS.md)** — Copy-paste-ready accessibility code patterns (modal focus trap, skip link, error handling, form labels, dragging movements, tabs, live regions, screen reader commands)

## WCAG 2.1 vs WCAG 3.0: Paradigm Shift

**WCAG 2.1 (Compliance-Focused)**: Binary pass/fail against specific technical criteria. Levels: A (minimum), AA (standard), AAA (enhanced).

**WCAG 3.0 (Outcome-Focused)**: Outcome-centered goals focusing on user ability. Four dimensions: Perceivable, Operable, Understandable, Robust.

**See** → [wcag-3.0-outcomes-framework.md](references/wcag-3.0-outcomes-framework.md) for detailed comparison, paradigm differences, and outcome-focused audit workflow.

---

## Quick Start: 3-Phase Accessibility Workflow

### Phase 1: Scan & Analyze
1. Run automated tools (axe, WAVE, Lighthouse, Pa11y)
2. Conduct keyboard navigation and screen reader testing
3. Map findings to WCAG criteria
4. Prioritize: Critical (blocks) > High > Medium > Low

### Phase 2: Remediate
For each finding:
1. Map to WCAG criterion (e.g., "1.4.3 Contrast Level AA")
2. Provide code fix with before/after
3. Explain user impact (which disabilities affected)
4. Suggest testing steps

### Phase 3: Verify
1. Test keyboard navigation (Tab, Shift+Tab, Enter, Space)
2. Test with screen readers (NVDA, JAWS, VoiceOver)
3. Verify contrast ratios (4.5:1 normal, 3:1 large, 3:1 UI elements)
4. Test at 200% zoom
5. Validate semantic HTML and ARIA patterns

**See** → [wcag-2.2-complete-criteria.md](references/wcag-2.2-complete-criteria.md) for all 78 WCAG 2.2 criteria with common issues and severity mapping.

---

## Code Patterns & ARIA

For accessible code implementations, refer to:
- **[aria-patterns-reference.md](references/aria-patterns-reference.md)** — 13 patterns: buttons, forms, tabs, modals, menus, live regions with full code and keyboard support
- **[A11Y-PATTERNS.md](references/A11Y-PATTERNS.md)** — Copy-paste patterns: modal focus trap, skip links, error handling, form labels, ARIA tabs

---

## Testing Tools & Assistive Technologies

### Automated Testing
- axe DevTools (browser extension, good for CI)
- WAVE (visual feedback on page)
- Lighthouse (Chrome DevTools)
- Pa11y (CLI, scriptable)

### Manual Testing & Screen Readers
- **Keyboard**: Tab, Shift+Tab, Enter, Space, Arrow keys
- **NVDA** (Windows): Insert+Down (read), Tab (navigate), Insert+H (help)
- **JAWS** (Windows): Insert+Down (read), Insert+Z (browse/forms mode)
- **VoiceOver** (Mac): Cmd+F5 (start), VO+Right/Left (navigate)
- **Voice Control**: "Click [element]", "Press [button]", "Show numbers"
- **Contrast**: WebAIM Contrast Checker, Color Oracle (color blindness)

---

## Best Practices

### Prioritization Matrix
- **Critical**: Blocks task completion (form won't submit, can't navigate)
- **High**: Significantly impacts UX (button not keyboard accessible, no focus indicator)
- **Medium**: Noticeable but workaround exists (low contrast on secondary text, missing alt on decorative image)
- **Low**: Polish/refinement (improved ARIA labeling, consistency improvements)

### WCAG Levels
- **Level A**: Minimum (rarely sufficient for public products)
- **Level AA**: Industry standard (target for most products) — 4.5:1 contrast, keyboard accessible, semantic HTML
- **Level AAA**: Enhanced (specialized/high-stakes) — 7:1 contrast, extensive testing with AT and real users

### Common Pitfalls
- Relying only on automated tools (~30% of issues missed)
- Fixing only critical issues (medium issues compound)
- Testing with one screen reader only (behavior varies)
- Forgetting keyboard-only users (not all AT uses screen readers)
- Assuming contrast is sufficient (also need semantic meaning)
- Not testing with real users with disabilities

---

## Assessment Framework

For WCAG 3.0 outcome-focused approach:

1. **User Outcome at Risk**: What can the user NOT do?
2. **Disability Impact**: How are specific disabilities affected?
3. **Remediation**: What change restores the outcome?
4. **Verification**: How do we verify outcome is achieved?

**See** → [wcag-3.0-outcomes-framework.md](references/wcag-3.0-outcomes-framework.md) for assessment template and outcome-focused remediation patterns.

---

## External Resources

- [WCAG 2.2 W3C Spec](https://www.w3.org/TR/WCAG22/)
- [WCAG 3.0 Draft](https://www.w3.org/TR/wcag-3.0/)
- [WebAIM Tools](https://webaim.org/)
- [W3C ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)