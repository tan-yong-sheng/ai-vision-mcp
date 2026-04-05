---
name: design-system-governance
description: "Use this skill when assessing design system maturity, evaluating adoption health, analyzing component duplication, or calculating design debt ratios"
user-invocable: false
---

# Design System Governance

Deep guidance for assessing design system maturity, adoption health, and governance effectiveness.

## When to Use

Use this skill when:
- Evaluating design system adoption and governance health
- Assessing design system maturity level (1-4 scale)
- Analyzing component duplication and consolidation opportunities
- Calculating custom vs system component ratios
- Identifying adoption barriers and governance gaps
- Tracking design debt trends and metrics
- Making strategic governance recommendations

## Design System Maturity Model

### Level 1: Ad-hoc (No System)

**Characteristics:**
- No formal design system exists
- 100% custom components created per project
- No governance process or standards
- High maintenance burden and inconsistency
- Designers/developers work independently

**Metrics:**
- Design system adoption: 0%
- Component reuse rate: <10%
- Unique component count: Very high (100+)
- Custom component ratio: 100%
- Documentation coverage: <20%

**Transition To Level 2:**
- Define core design principles
- Create baseline component library
- Document existing patterns
- Establish governance committee
- Communicate vision to teams

---

### Level 2: Inconsistent (Emerging System)

**Characteristics:**
- Design system exists but adoption is spotty (30-60%)
- Mix of system components and custom variations
- Informal governance process
- Growing maintenance burden
- Teams aware of system but don't consistently use it

**Metrics:**
- Design system adoption: 30-60%
- Component reuse rate: 20-40%
- Unique component count: High (50-80)
- Custom component ratio: 50-70%
- Documentation coverage: 40-60%

**Adoption Barriers (Typical):**
- System doesn't cover all use cases
- Inconvenient process for requesting new components
- Lack of clear governance process
- Poor documentation or discoverability
- Team doesn't see value in consistency

**Transition To Level 3:**
- Expand component coverage (close gaps)
- Establish component request process
- Create clear governance guidelines
- Improve documentation and discoverability
- Enforce token usage in CI/CD
- Provide team training and support

---

### Level 3: Consistent (Mature System)

**Characteristics:**
- Design system widely adopted (60-90%)
- Most new work uses system components
- Formal governance process in place
- Manageable maintenance burden
- Teams understand and value consistency

**Metrics:**
- Design system adoption: 60-90%
- Component reuse rate: 60-75%
- Unique component count: Moderate (20-40)
- Custom component ratio: 20-40%
- Documentation coverage: 80-95%

**Governance Practices:**
- Design review process for new components
- Component request workflow with approval
- Design token enforcement in linters
- Regular audits of consistency
- Clear naming conventions
- Component versioning strategy

**Transition To Level 4:**
- Implement CI/CD enforcement
- Require design review for all deviations
- Automate consistency checks
- Track adoption metrics and debt trends
- Establish SLOs for system health
- Create specialized governance roles

---

### Level 4: Governed (Enforced System)

**Characteristics:**
- Design system enforced (>90% adoption)
- Custom components are rare and justified
- Strong governance process enforced
- Low maintenance burden
- Clear accountability for system health

**Metrics:**
- Design system adoption: >90%
- Component reuse rate: 80-95%
- Unique component count: Low (<20)
- Custom component ratio: <10%
- Documentation coverage: 95%+

**Governance Practices:**
- CI/CD enforcement of token usage
- Automated design compliance checks
- Required design review for deviations
- Component consolidation process
- Metrics dashboards tracking adoption
- Quarterly design system reviews
- Clear escalation process for exceptions

**Maintenance:**
- Low effort (high reuse, few custom components)
- Clear ownership and accountability
- Proactive improvements
- Regular metrics tracking

---

## Adoption Metrics Calculation

### Overall Adoption Score

```
Adoption Score = (System Components Used / Total Components) × 100

Example:
- System components used: 45
- Total components: 60
- Adoption Score: 45/60 = 75%
```

### Component Reuse Rate

```
Reuse Rate = (Total Component Instances / Unique Components) 

Example:
- Button component used in: homepage, product page, checkout, admin panel = 4 instances
- Modal component used in: help, confirmation, settings = 3 instances
- Total instances: 45
- Unique components: 8
- Reuse Rate: 45/8 = 5.6× average usage per component
```

### Design Debt Ratio

```
Design Debt = (Custom Components / Total Components) × 100

Example:
- Custom components: 15
- Total components: 60
- Design Debt: 15/60 = 25%

Interpretation:
- <10%: Level 4 (Excellent)
- 10-20%: Level 3 (Good)
- 20-40%: Level 2 (Concerning)
- >40%: Level 1 (Critical)
```

### Component Health Score

For each component category (buttons, modals, forms, etc.):

```
Category Health = (Components matching system / Total in category) × 100

Example - Buttons:
- System button variants: 6 (primary, secondary, tertiary, loading, disabled, outlined)
- Found implementations: 8 (system variants + 2 custom)
- Health Score: 6/8 = 75%
- Assessment: 75% of button implementations match system
```

---

## Design Debt Analysis

### Debt Drivers (Why Custom Components Exist)

**Legitimate Reasons:**
1. **Feature gap**: System doesn't support needed functionality
2. **Performance requirement**: Custom optimization for specific use case
3. **Brand evolution**: System hasn't been updated yet
4. **Experimental feature**: Temporary, pending system integration
5. **Third-party integration**: External component that can't be modified

**Warning Signs:**
1. **Misunderstanding**: Developer didn't know system component existed
2. **Convenience**: Faster to build custom than learn system
3. **Process gap**: No clear way to request new system component
4. **Visibility**: System component exists but hard to discover
5. **Governance gap**: No enforcement preventing custom creation

### Root Cause Analysis Process

For each custom component found:

1. **Categorize the driver**
   - Feature gap, performance, brand, experimental, third-party, or warning sign?

2. **Estimate impact**
   - Used in how many places?
   - How similar is it to system components?
   - How much maintenance burden does it create?

3. **Prioritize remediation**
   - Can system be extended to cover this use case?
   - Should custom component be deprecated and migrated?
   - Is this a pattern that appears elsewhere?

### Remediation Priority

**Critical (Week 1-2):**
- Custom components that duplicate system functionality
- Components used in 5+ places that could be consolidated
- Violations of established governance process

**High (Week 3-4):**
- Components with slight variations that could be system tokens
- Popular custom patterns that should be systemized
- Documentation gaps that lead to custom creation

**Medium (Week 5-6):**
- Single-use custom components that could be system variants
- Performance optimizations that could be built into system
- Experimental components ready for system integration

**Low (Ongoing):**
- Orphaned custom components with no usage
- Outdated custom implementations
- Documentation improvements

---

## Governance Health Assessment

### Assessment Dimensions

**1. Process Maturity**
- Do teams know how to request new components?
- Is there a design review process?
- Are decisions documented?
- Is there an escalation path for exceptions?

Scoring:
- Informal (no documented process): 25%
- Documented but unenforced: 50%
- Enforced in design tools: 75%
- Enforced in CI/CD: 100%

**2. Adoption Culture**
- Do teams value consistency?
- Is system adoption incentivized?
- Are there training resources?
- Is governance burden low for developers?

Scoring:
- No awareness: 25%
- Awareness but no motivation: 50%
- Teams see value: 75%
- System is default choice: 100%

**3. System Completeness**
- Does system cover common use cases?
- Are there documented gaps?
- Is system regularly updated?
- Can teams extend system safely?

Scoring:
- <50% coverage: 25%
- 50-75% coverage: 50%
- 75-90% coverage: 75%
- >90% coverage: 100%

**4. Documentation Quality**
- Are components documented with usage examples?
- Are design tokens documented?
- Is there a glossary/taxonomy?
- Is documentation discoverable?

Scoring:
- Minimal/outdated: 25%
- Basic documentation: 50%
- Comprehensive with examples: 75%
- Interactive with code playgrounds: 100%

**5. Enforcement Mechanism**
- Are there automated checks?
- Is deviation blocked in CI/CD?
- Are metrics tracked?
- Are there compliance reports?

Scoring:
- No enforcement: 25%
- Manual reviews only: 50%
- Linter/accessibility checks: 75%
- Full CI/CD enforcement: 100%

### Overall Governance Health Score

```
Health Score = (Process + Adoption + Completeness + Documentation + Enforcement) / 5

Example:
- Process Maturity: 75%
- Adoption Culture: 60%
- System Completeness: 80%
- Documentation Quality: 70%
- Enforcement Mechanism: 50%
- Health Score: (75+60+80+70+50)/5 = 67%

Interpretation:
- >80%: Healthy governance
- 60-80%: Room for improvement
- 40-60%: Significant gaps
- <40%: Critical issues
```

---

## Consolidation Opportunity Analysis

### Duplication Detection

**Exact duplicates:**
- Same component implemented multiple times
- Action: Deprecate all but canonical, migrate usage
- Effort: High (migration work)
- Impact: Highest (reduce maintenance by 80%+)

**Near-duplicates (>80% similar):**
- Same component with minor style variations
- Action: Create system variants (props/tokens) to cover use cases
- Effort: Medium (extend system component)
- Impact: High (reduce variants from 3→1)

**Partial duplicates (50-80% similar):**
- Components that solve similar problems differently
- Action: Consolidate to single approach, possibly with configuration
- Effort: Medium-High (code migration)
- Impact: Medium (reduce complexity, improve consistency)

**Similar patterns (<50% code, >80% visual):**
- Different implementations of visually similar components
- Action: Extract common patterns to system
- Effort: Medium (establish new system component)
- Impact: Medium (improve discoverability, future reuse)

### Consolidation Priority Matrix

```
         High Impact   Medium Impact   Low Impact
High Effort   Phase 3      Phase 4       Defer
Med Effort    Phase 2      Phase 3       Phase 4
Low Effort    Phase 1      Phase 2       Phase 3
```

**Phase 1 (Quick Wins):**
- Exact duplicates with low migration effort
- Estimate: 20-30% reduction in custom components
- Timeline: 1-2 weeks

**Phase 2 (Strategic):**
- Near-duplicates that establish patterns
- System variants that unlock consolidation
- Estimate: 40-60% reduction in custom components
- Timeline: 3-6 weeks

**Phase 3 (Long-term):**
- Partial duplicates requiring significant refactoring
- New system components from successful patterns
- Estimate: 70-80% reduction in custom components
- Timeline: 2-3 months

**Phase 4 (Maintenance):**
- Ongoing consolidation and optimization
- Proactive system improvements
- Continuous adoption monitoring

---

## Metrics Dashboard

### Key Metrics to Track

**Adoption:**
- Design system adoption % (system vs custom components)
- Component reuse rate (usage intensity)
- Team adoption % (teams using system)
- Quarterly trend (adoption improving or declining?)

**Debt:**
- Design debt ratio (custom component %)
- Unique component count (proliferation metric)
- Duplication ratio (near-duplicates %)
- Consolidation opportunities identified

**Health:**
- Governance health score (process, culture, completeness, docs, enforcement)
- Documentation coverage %
- Component coverage (use cases covered by system)
- Adoption barrier analysis

**Productivity:**
- Average time to add new component (request to implementation)
- Time saved through reuse (estimated)
- Team satisfaction with system
- Support burden (questions, issues)

### Trend Analysis

**Healthy Trends (Improving):**
- Adoption % increasing quarter-over-quarter
- Design debt % decreasing
- Unique component count decreasing
- Duplication opportunities declining
- Governance health score increasing

**Warning Trends (Declining):**
- Adoption % plateauing or declining
- Design debt % increasing
- Unique component count growing
- Duplication opportunities accumulating
- Governance health score decreasing

---

## Output Structure

```json
{
  "analysis_type": "component-audit | design-debt-report",
  "maturity_level": 2,
  "maturity_assessment": {
    "current_level": "Inconsistent (Emerging System)",
    "adoption_score": 52,
    "design_debt_ratio": 45,
    "characteristics": ["System exists but spotty adoption", "Informal governance", "Growing maintenance burden"],
    "transition_readiness": "Ready for Level 3 transition"
  },
  "adoption_metrics": {
    "overall_adoption": 52,
    "component_reuse_rate": 3.2,
    "team_adoption": "45% of teams",
    "trend": "stable"
  },
  "governance_health": {
    "overall_health_score": 58,
    "process_maturity": 50,
    "adoption_culture": 60,
    "system_completeness": 65,
    "documentation_quality": 55,
    "enforcement_mechanism": 50,
    "gaps": [
      "No documented component request process",
      "Limited CI/CD enforcement",
      "Inconsistent documentation"
    ]
  },
  "duplication_analysis": {
    "exact_duplicates": 3,
    "near_duplicates": 8,
    "partial_duplicates": 12,
    "consolidation_opportunities": 15,
    "estimated_debt_reduction": "35% (15 components → 10)"
  },
  "debt_drivers": [
    {
      "category": "Feature gap",
      "count": 8,
      "examples": ["Advanced table features", "Custom form validation"],
      "remediation": "Extend system components"
    },
    {
      "category": "System gap - Visibility",
      "count": 4,
      "examples": ["Modal used for alerts", "Button for navigation"],
      "remediation": "Improve documentation and discoverability"
    }
  ],
  "consolidation_roadmap": [
    {
      "phase": 1,
      "priority": "quick-wins",
      "items": [
        {
          "opportunity": "Button component exact duplicates",
          "current_implementations": 3,
          "target_implementation": 1,
          "effort_hours": 4,
          "debt_reduction": "3 components",
          "impact": "High"
        }
      ]
    }
  ],
  "recommendations": [
    "Establish formal component request process",
    "Create system variants for common use cases",
    "Migrate 3 exact duplicate button implementations",
    "Improve system documentation with code examples",
    "Implement linter for design token usage"
  ],
  "next_steps": [
    "Phase 1: Quick wins (1-2 weeks)",
    "Phase 2: Strategic consolidation (3-6 weeks)",
    "Transition to Level 3 governance"
  ]
}
```

## Testing Checklist

### Automated Analysis
- [ ] Extract all components from codebase
- [ ] Classify as system vs custom
- [ ] Detect near-duplicates (similarity >80%)
- [ ] Calculate adoption metrics
- [ ] Assess governance maturity
- [ ] Generate consolidation roadmap

### Manual Assessment
- [ ] Review component classification accuracy
- [ ] Validate near-duplicate groupings
- [ ] Interview teams about adoption barriers
- [ ] Assess governance process effectiveness
- [ ] Verify maturity level assessment
- [ ] Prioritize consolidation opportunities

### Reporting
- [ ] Generate metrics dashboard
- [ ] Create executive summary
- [ ] Provide actionable roadmap
- [ ] Include code examples for consolidation
- [ ] Document maturity transition path

## Reference Materials

- Design System Maturity Models: Research from Design Systems Coalition
- Adoption Metrics Frameworks: Component-driven development patterns
- Governance Health Assessment: Design system scaling best practices
