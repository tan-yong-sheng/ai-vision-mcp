---
name: design-system-governance
description: Design system governance, maturity models, and best practices
user-invocable: false
---

# Design System Governance Skill

Comprehensive guidance for establishing design system governance, assessing maturity levels, and building sustainable design system practices across organizations.

## When to Use

Use this skill when:
- Building or scaling a design system
- Assessing design system maturity
- Establishing governance processes
- Measuring design system health
- Planning design system evolution
- Building design system adoption strategies

## Core Governance Concepts

### What is Design System Governance?

Design system governance is the set of processes, standards, and organizational structures that ensure consistent use of design system components and patterns across a product or organization.

**Key components:**
- **Standards** - Defined patterns and components
- **Processes** - How components are requested, reviewed, created
- **Roles** - Who makes decisions
- **Metrics** - How adoption is measured
- **Enforcement** - How compliance is ensured

### Governance Maturity Spectrum

```
Level 1 (Ad-hoc)
  ↓ [Create design system]
Level 2 (Inconsistent)
  ↓ [Establish processes]
Level 3 (Consistent)
  ↓ [Enforce standards]
Level 4 (Governed)
```

## Level 1: Ad-hoc Design (No Governance)

**Characteristics:**
- No design system
- All components custom-built
- Each team solves problems independently
- High duplication and inconsistency
- No governance structure

**Component Creation Process:**
```
Team needs component
  ↓
Team builds custom component
  ↓
Component added to codebase
  ↓
No review, no reuse
```

**Metrics:**
- Adoption ratio: 0%
- Custom components: 100%
- Design review: None
- Documentation: Minimal

**Transition to Level 2:**
- Audit existing components
- Document common patterns
- Create design system foundation
- Define component request process

## Level 2: Inconsistent Adoption (Emerging Governance)

**Characteristics:**
- Design system exists
- Some teams use it, others don't
- Informal processes
- Mixed governance
- Growing maintenance burden

**Component Creation Process:**
```
Team needs component
  ↓
Check if system has it?
  │
  ├─ Yes → Use system component
  │
  └─ No → Custom or request new?
         ↓
         Custom: Build and use
         Request: Submit to design team
```

**Governance Process:**
- Component request submitted (email, form, issue)
- Design team reviews when bandwidth available
- If approved: added to system
- Documentation: inconsistent

**Metrics:**
- Adoption ratio: 30-60%
- Custom components: 40-70%
- Design review: <50% compliance
- Documentation: 30-60%

**Transition to Level 3:**
- Formalize component request process
- Require design review for all new components
- Migrate high-impact custom components
- Improve documentation
- Establish metrics tracking

## Level 3: Consistent Adoption (Formal Governance)

**Characteristics:**
- Design system widely adopted
- Formal governance process
- Most new work uses system
- Regular maintenance
- Clear component request workflow

**Component Creation Process:**
```
Team needs component
  ↓
Search design system
  ├─ Found component → Use it
  ├─ Similar component → Request variation
  └─ Not found → Submit request
         ↓
         Design review (1 week)
         ├─ Approved → Built by design team (2-3 weeks)
         ├─ Rejected → Suggested alternative
         └─ Needs refinement → Iterate
```

**Governance Structure:**
- **Design System Owner** - Owns overall strategy
- **Component Stewards** - Own specific components
- **Design Review Board** - Reviews new component requests
- **Design System Team** - Builds and maintains components

**Component Request Template:**
```markdown
# Component Request: [Component Name]

## Use Case
Describe why this component is needed

## Use Cases
List 2-3 specific places this would be used

## Sketch/Design
Link to design artifact

## Considerations
- Accessibility requirements
- Responsive behavior
- Browser support
```

**Metrics:**
- Adoption ratio: 60-90%
- Custom components: 10-40%
- Design review: 70-90% compliance
- Documentation: 80-95%
- Component request turnaround: <4 weeks

**Transition to Level 4:**
- Strengthen design review rigor
- Build CI/CD enforcement
- Increase token usage compliance
- Establish SLAs for component requests
- Automate metric tracking

## Level 4: Governed (Enforced Governance)

**Characteristics:**
- Design system enforced organization-wide
- Strong governance processes
- CI/CD checks for compliance
- Custom components rare and justified
- Metrics tracked automatically

**Component Creation Process:**
```
Developer starts coding
  ↓
IDE suggests system component
  ↓
Component selected from autocomplete
  ↓
Build system validates component usage
  ├─ Valid → Success
  └─ Invalid → Error with suggestion
```

**Governance Structure:**
- **Design System Executive** - Strategic decisions
- **Design System Board** - Quarterly reviews
- **Component Stewards** - Maintain components
- **Design System Team** - Build tools and infrastructure
- **Automation** - CI/CD checks, linting rules

**Enforcement Mechanisms:**
- **Pre-commit hooks** - Check component usage
- **CI/CD pipeline** - Enforce token usage
- **Linting rules** - Prevent custom styling
- **Build time checks** - Catch violations
- **Design token imports** - Only allow system tokens

```javascript
// ESLint rule example: only allow system components
{
  "rules": {
    "design-system/no-custom-components": "error",
    "design-system/use-design-tokens": "error"
  }
}
```

**Metrics:**
- Adoption ratio: 90%+
- Custom components: <10%
- Design review: 95%+ compliance
- Documentation: 95%+
- Token usage: 95%+
- Component request turnaround: <1 week

## Governance Roles and Responsibilities

### Design System Owner
- Overall strategy and vision
- Resource allocation
- Organizational communication
- Quarterly business reviews

### Component Stewards
- Own specific component family
- Manage requests and issues
- Maintain component documentation
- Lead design reviews for component area

### Design System Team
- Build and maintain components
- Create tools and infrastructure
- Support adoption and training
- Track metrics and health

### Design Review Board
- Reviews component requests
- Decides on new components
- Evaluates scope and complexity
- Prioritizes work

## Reference Materials

See the following reference files for detailed guidance:
- `references/maturity-model.md` - Detailed maturity level characteristics and assessment
- `references/governance-process.md` - Step-by-step governance process workflows

## Quick Governance Assessment

**Questions to ask:**

1. **Do we have a design system?**
   - Yes → Move to question 2
   - No → Level 1 (Ad-hoc)

2. **Is it widely used across teams?**
   - Inconsistently (30-60%) → Level 2
   - Widely (60-90%) → Level 3
   - Almost always (90%+) → Level 4

3. **Is there a formal component request process?**
   - No → Level 1-2
   - Informal → Level 2
   - Formal → Level 3-4

4. **Are design reviews required for new components?**
   - No → Level 1-2
   - Sometimes → Level 2-3
   - Always → Level 3-4

5. **Is there CI/CD enforcement?**
   - No → Level 1-3
   - Yes → Level 4

**Scoring:**
- Mostly Level 1 answers → Level 1
- Mostly Level 2 answers → Level 2
- Mostly Level 3 answers → Level 3
- Mostly Level 4 answers → Level 4
