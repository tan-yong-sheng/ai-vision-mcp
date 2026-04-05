---
name: design-audit-orchestration
description: "Use this skill when aggregating design audit findings across multiple dimensions, deduplicating related issues, or synthesizing results into executive summaries with remediation roadmaps"
user-invocable: false
---

# Design Audit Orchestration

Guidance for orchestrating comprehensive design audits across multiple dimensions and synthesizing findings into actionable reports.

## When to Use

Use this skill when:
- Aggregating findings from multiple analysis dimensions (heuristics, accessibility, visual, components)
- Deduplicating and cross-referencing related findings
- Prioritizing findings by severity and impact
- Creating executive summaries and remediation roadmaps
- Synthesizing insights that span multiple dimensions

## Multi-Dimensional Analysis Framework

Design audits analyze 4 independent dimensions:

### 1. Usability Heuristics (Nielsen's 10)
- Visibility of system status
- Match between system and real world
- User control and freedom
- Error prevention and recovery
- Recognition vs recall
- Flexibility and efficiency
- Aesthetic and minimalist design
- Help and documentation
- Error messages
- Emergency exits

### 2. Accessibility Compliance (WCAG)
- Color contrast and visual perception
- Keyboard navigation and focus management
- Semantic HTML and heading hierarchy
- ARIA patterns and landmarks
- Form accessibility and error handling
- Motion and animation preferences
- Text alternatives and captions

### 3. Visual Consistency (Design Tokens)
- Color palette usage and deviations
- Typography consistency (fonts, sizes, weights)
- Spacing patterns (margins, padding, gaps)
- Shape and border radius consistency
- Shadow and elevation patterns
- Motion and transition properties

### 4. Component Reusability (Design System)
- Component duplication and near-duplicates
- Composition patterns and nesting depth
- API/prop consistency across similar components
- Naming conventions and clarity
- Documentation completeness

## Finding Aggregation Patterns

### Deduplication Strategy

Same issue found by multiple dimensions:
- **Heuristic + Accessibility**: "Error message not visible" (heuristic: error prevention) + "error message lacks color contrast" (accessibility: WCAG 1.4.3)
- **Visual + Component**: "Button color inconsistent" (visual: color token) + "button component has multiple implementations" (component: duplication)

**Action**: Merge into single finding with cross-dimensional impact

### Cross-Referencing Strategy

Finding in one dimension affects another:
- **Accessibility finding**: "Form labels not associated" → impacts **Heuristic**: "Recognition vs recall" (users can't remember what field is what)
- **Component finding**: "Button component duplicated" → impacts **Visual**: "Inconsistent button colors" (each implementation uses different color)

**Action**: Link findings and explain cascading impact

### Severity Calculation

Combine severity from multiple dimensions:
- **Critical**: Blocks user task completion (accessibility + heuristic)
- **High**: Significantly impacts user experience (visual + component)
- **Medium**: Noticeable but workaround exists (single dimension)
- **Low**: Polish/refinement (minor inconsistency)

## Synthesis Patterns

### Executive Summary Structure

1. **Overall Health Score** (0-100)
   - Weighted average across dimensions
   - Heuristics: 30% (user experience)
   - Accessibility: 40% (compliance + inclusion)
   - Visual: 15% (consistency)
   - Components: 15% (maintainability)

2. **Critical Issues** (top 3-5)
   - Issues blocking user tasks
   - Compliance violations
   - High-impact duplications

3. **Dimension Breakdown**
   - Summary for each dimension
   - Key findings per dimension
   - Dimension-specific recommendations

4. **Remediation Roadmap**
   - Phase 1: Critical (accessibility, blocking issues)
   - Phase 2: High (visual consistency, component consolidation)
   - Phase 3: Medium (heuristics refinement)
   - Phase 4: Low (polish)

### Remediation Roadmap Template

```
Phase 1: Critical (Week 1-2)
- [Finding 1]: [Remediation] - Effort: [hours]
- [Finding 2]: [Remediation] - Effort: [hours]

Phase 2: High (Week 3-4)
- [Finding 3]: [Remediation] - Effort: [hours]

Phase 3: Medium (Week 5-6)
- [Finding 4]: [Remediation] - Effort: [hours]

Phase 4: Low (Ongoing)
- [Finding 5]: [Remediation] - Effort: [hours]
```

## Output Structure

```json
{
  "audit_summary": {
    "overall_health_score": 72,
    "total_findings": 24,
    "critical_count": 3,
    "high_count": 8,
    "medium_count": 10,
    "low_count": 3
  },
  "dimension_summaries": {
    "heuristics": {
      "score": 68,
      "key_findings": [...],
      "recommendations": [...]
    },
    "accessibility": {
      "score": 65,
      "key_findings": [...],
      "recommendations": [...]
    },
    "visual_consistency": {
      "score": 82,
      "key_findings": [...],
      "recommendations": [...]
    },
    "components": {
      "score": 75,
      "key_findings": [...],
      "recommendations": [...]
    }
  },
  "cross_dimensional_insights": [
    {
      "title": "Error handling affects both heuristics and accessibility",
      "findings": ["heuristic-5", "accessibility-3"],
      "impact": "Users cannot recover from errors effectively"
    }
  ],
  "remediation_roadmap": [
    {
      "phase": 1,
      "priority": "critical",
      "items": [...]
    }
  ]
}
```

## Reference Materials

- Nielsen's 10 Usability Heuristics: `design-audit-framework/references/heuristics-guide.md`
- WCAG Compliance Checklist: `design-audit-framework/references/wcag-checklist.md`
- Design System Metrics: `design-audit-framework/references/design-system-metrics.md`
