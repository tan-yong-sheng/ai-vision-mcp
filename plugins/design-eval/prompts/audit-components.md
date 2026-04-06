# Component Audit Prompt

## Design Preservation Principle

When providing remediation guidance or design suggestions:
- Respect existing design style, components, and tokens
- Suggest modifications to existing patterns, not replacements
- Only recommend overwriting existing style if the user explicitly requests it
- Reference existing component names and design tokens in remediation code

---

Analyze component reusability and patterns. Identify:
1) Duplicate or near-identical components
2) Component nesting and composition patterns
3) Prop/API consistency across similar components
4) Naming conventions and clarity
5) Component documentation completeness

For each finding provide:
- Component names/selectors
- Issue description
- Reusability impact
- Consolidation opportunity

Calculate reusability metrics.
