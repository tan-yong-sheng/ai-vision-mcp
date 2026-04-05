---
name: design-audit-framework
description: Guidance on conducting design audits using Nielsen heuristics and WCAG standards
user-invocable: false
---

# Design Audit Framework Skill

Comprehensive guidance for conducting professional design audits that combine usability heuristics, accessibility compliance, visual consistency, and design system governance assessment.

## When to Use

Use this skill when:
- Conducting comprehensive design audits with multiple dimensions
- Evaluating usability and accessibility together
- Assessing design system maturity and governance
- Training teams on design evaluation methodologies
- Building design evaluation tools and processes

## Core Frameworks

### Nielsen's 10 Usability Heuristics

1. **Visibility of System Status**
   - Users should always know what's happening
   - Real-time feedback within reasonable time
   - Example: Loading indicators, progress bars, status messages

2. **Match Between System and Real World**
   - Speak user's language, not technical jargon
   - Follow real-world conventions and user expectations
   - Example: File menu items similar to physical file concepts

3. **User Control and Freedom**
   - Users need emergency exits (undo, cancel, back)
   - Support frequently used shortcuts
   - Example: Clear navigation, breadcrumbs, exit strategies

4. **Error Prevention and Recovery**
   - Prevent problems proactively (constraints, confirmations)
   - When errors occur, explain clearly and suggest solutions
   - Example: Validation messages, confirmation dialogs, error recovery

5. **Recognition vs Recall**
   - Make objects, actions, options visible
   - Minimize memory load
   - Example: Visible navigation, clear labeling, history/recent lists

6. **Flexibility and Efficiency**
   - Accelerators for experts (shortcuts, macros)
   - Allow customization and personalization
   - Example: Keyboard shortcuts, advanced search, saved preferences

7. **Aesthetic and Minimalist Design**
   - Remove unnecessary elements
   - Focus on essential information
   - Example: Clean layouts, progressive disclosure, information hierarchy

8. **Help and Documentation**
   - Provide searchable help
   - Task-focused assistance
   - Concrete steps for users to follow
   - Example: Contextual help, tooltips, FAQs, tutorials

9. **Error Clarity and Prevention**
   - Use plain language to describe problems
   - Suggest solutions
   - Use conventional error conventions
   - Example: Highlight affected fields, suggest corrections

10. **System Flexibility**
    - Support multiple workflows and user types
    - Allow users to accomplish tasks their way
    - Example: Multiple navigation patterns, customizable layouts

### WCAG 2.1 Principles (Compliance-Focused)

**PERCEIVABLE**: Information and components must be perceivable to users
- Text alternatives for images
- Adaptable content (not dependent on layout or presentation)
- Distinguishable content (sufficient contrast, readable fonts)

**OPERABLE**: Components and navigation must be operable
- Keyboard accessible
- Users have time to read and use content
- Content doesn't cause seizures or physical reactions
- Users can navigate and find content

**UNDERSTANDABLE**: Information and user interface must be understandable
- Readable text (language identification, abbreviation definitions)
- Predictable behavior (consistent navigation, predictable functionality)
- Input assistance (errors identified and suggested fixes provided)

**ROBUST**: Content must be robust enough for interpretation by assistive technologies
- Valid markup
- Compatible with current and future assistive technologies

### WCAG 3.0 Outcomes (Result-Focused)

WCAG 3.0 shifts from compliance checklists to user outcomes:

**Perceivable Information**
- Users can perceive all content (not dependent on color alone)
- Users can adjust text size and color contrast
- Users can perceive visual relationships

**Operable Interface**
- Users can navigate using their input method
- Users can operate all interactive elements
- Users don't get lost during navigation

**Understandable Content**
- Users understand the purpose of content
- Users understand how to use components
- Users understand what happened after their action

**Supportive Technology**
- Content works with assistive technology
- Users can understand the structure and relationships

## Design System Maturity Model

### Level 1: Ad-hoc
**Characteristics:**
- No design system
- All components custom-built
- No governance or standards
- High maintenance burden

**Indicators:**
- >90% custom components
- No design tokens
- Inconsistent styling across product
- No design review process

**Transition path:** Create design system, document existing patterns

### Level 2: Inconsistent (Emerging)
**Characteristics:**
- Design system exists but adoption is spotty
- Some teams use system, others build custom
- Informal governance process
- Growing maintenance burden

**Indicators:**
- 30-60% custom components
- Design tokens exist but not enforced
- Some design review, not consistent
- Documentation incomplete

**Transition path:** Establish governance process, increase adoption

### Level 3: Consistent
**Characteristics:**
- Design system widely adopted
- Most new work uses system components
- Formal governance process
- Manageable maintenance

**Indicators:**
- 60-90% system component usage
- Tokens enforced in CI/CD
- Design review required for new components
- Comprehensive documentation

**Transition path:** Enforce governance, increase consistency

### Level 4: Governed
**Characteristics:**
- Design system enforced across organization
- Custom components rare and highly justified
- Strong governance and process discipline
- Low maintenance burden

**Indicators:**
- >90% system component usage
- All styling uses design tokens
- CI/CD enforces token usage
- Custom component requests must be approved
- Metrics tracked and monitored

## Governance Process Components

### Component Request Workflow
1. Request submitted with justification
2. Design review evaluates if existing component can be extended
3. If new component needed: design and build
4. Component added to design system
5. Teams migrated from custom to system component

### Design Review Checklist
- [ ] Is there an existing component that solves this?
- [ ] Can an existing component be extended/parameterized?
- [ ] Does this follow design system patterns?
- [ ] Is the API consistent with similar components?
- [ ] Is it accessible?
- [ ] Is it documented?
- [ ] Can other teams reuse this?

### Adoption Strategies
- Start with most-used components
- Migrate incrementally, don't force all at once
- Provide migration guides and codemods
- Train teams on how to use system components
- Monitor adoption metrics and celebrate wins

## Reference Materials

See the following reference files for detailed guidance:
- `references/wcag-checklist.md` - Detailed WCAG 2.1/3.0 compliance checklist
- `references/heuristics-guide.md` - Nielsen heuristics with examples and evaluation questions
- `references/design-system-metrics.md` - Metrics for measuring maturity and governance health
- `references/accessibility-patterns.md` - Common accessibility patterns and fixes

## Quick Assessment Checklist

**Heuristics Assessment**
- [ ] Is it clear what the system is doing?
- [ ] Does the interface match user expectations?
- [ ] Can users easily undo mistakes?
- [ ] Are error messages helpful?
- [ ] Can users find what they need?
- [ ] Can experts use shortcuts?
- [ ] Is the interface clean and focused?
- [ ] Is help available when needed?

**Accessibility Assessment**
- [ ] All images have descriptive alt text
- [ ] All interactive elements are keyboard accessible
- [ ] Color contrast is sufficient (4.5:1 for normal text)
- [ ] Headings are properly hierarchical
- [ ] Forms have associated labels
- [ ] ARIA is used correctly
- [ ] Motion can be reduced/disabled

**Design System Assessment**
- [ ] Are colors from the design system?
- [ ] Is typography consistent?
- [ ] Is spacing following a scale?
- [ ] Are components from the system?
- [ ] Are custom components justified?
- [ ] Is documentation up-to-date?
- [ ] Is governance process defined?
