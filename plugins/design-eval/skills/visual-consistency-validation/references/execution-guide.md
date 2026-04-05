---
name: Visual Consistency Tester - Execution Guide
description: How the visual-consistency-tester subagent implements the visual-consistency-validation skill using Playwright, Gemini, and design token analysis
type: reference
---

# Visual Consistency Tester - Execution Guide

## Overview

The visual-consistency-tester subagent implements the visual-consistency-validation skill through a multi-stage process:

1. **Parse arguments** - Extract design system, component source, and options
2. **Load design system** - Read token definitions from JSON/YAML
3. **Capture design properties** - Use Playwright to extract visual properties
4. **Analyze violations** - Compare actual vs expected token values
5. **Validate all aspects** - Breakpoints, modes, states, accessibility
6. **Generate report** - Structured JSON with violations and remediation

---

## Stage 1: Parse Arguments

**Input from command:**
```bash
/design-eval:visual-consistency --imageSource <url> --design-system <path> [--userPrompt <text>]
```

**Parse and validate:**
```javascript
const args = {
  imageSource: process.env.IMAGE_SOURCE,      // URL or local path
  designSystem: process.env.DESIGN_SYSTEM,    // Path to design tokens
  userPrompt: process.env.USER_PROMPT || '',  // Optional custom guidance
  
  // Derived
  breakpoints: ['mobile', 'tablet', 'desktop'],
  modes: ['light', 'dark'],
  states: ['default', 'hover', 'focus', 'active', 'disabled']
};
```

---

## Stage 2: Load Design System

**Read design tokens:**
```javascript
async function loadDesignSystem(path) {
  // Support JSON and YAML
  const tokens = await loadFile(path);
  
  // Normalize structure
  return {
    colors: parseColorTokens(tokens),
    spacing: parseSpacingTokens(tokens),
    typography: parseTypographyTokens(tokens),
    shapes: parseShapeTokens(tokens),
    motion: parseMotionTokens(tokens)
  };
}

// Example structure
{
  "colors": {
    "primary": { "name": "primary-color", "value": "#0066FF" },
    "text-dark-mode": { "name": "text-color-dark-mode", "value": "#FFFFFF" }
  },
  "spacing": {
    "medium": { "name": "spacing-medium", "value": "16px" }
  }
}
```

---

## Stage 3: Capture Design Properties

**Use Playwright to extract visual properties:**

```javascript
async function captureDesignProperties(component, designSystem) {
  const properties = {
    colors: {},
    spacing: {},
    typography: {},
    shapes: {},
    motion: {}
  };
  
  // Colors
  properties.colors = {
    color: await component.evaluate(el => getComputedStyle(el).color),
    backgroundColor: await component.evaluate(el => getComputedStyle(el).backgroundColor),
    borderColor: await component.evaluate(el => getComputedStyle(el).borderColor),
    boxShadow: await component.evaluate(el => getComputedStyle(el).boxShadow)
  };
  
  // Spacing
  properties.spacing = {
    padding: await component.evaluate(el => getComputedStyle(el).padding),
    margin: await component.evaluate(el => getComputedStyle(el).margin),
    gap: await component.evaluate(el => getComputedStyle(el).gap)
  };
  
  // Typography
  properties.typography = {
    fontSize: await component.evaluate(el => getComputedStyle(el).fontSize),
    fontWeight: await component.evaluate(el => getComputedStyle(el).fontWeight),
    lineHeight: await component.evaluate(el => getComputedStyle(el).lineHeight),
    letterSpacing: await component.evaluate(el => getComputedStyle(el).letterSpacing)
  };
  
  // Shapes
  properties.shapes = {
    borderRadius: await component.evaluate(el => getComputedStyle(el).borderRadius),
    borderWidth: await component.evaluate(el => getComputedStyle(el).borderWidth)
  };
  
  return properties;
}
```

---

## Stage 4: Analyze Violations

**Systematic token mapping:**

```javascript
function analyzeViolations(captured, designSystem) {
  const violations = [];
  
  // For each property category
  for (const [category, properties] of Object.entries(captured)) {
    for (const [property, value] of Object.entries(properties)) {
      // Find matching token
      const token = findToken(designSystem, category, property, value);
      
      if (!token || value !== token.value) {
        // Calculate difference
        const diff = calculateDifference(value, token?.value);
        
        // Determine severity
        const severity = determineSeverity(category, property, value, token);
        
        violations.push({
          category,
          property,
          currentValue: value,
          tokenName: token?.name || 'UNMAPPED',
          expectedValue: token?.value || 'N/A',
          difference: diff,
          severity,
          remediation: generateRemediation(property, value, token)
        });
      }
    }
  }
  
  return violations.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}
```

---

## Stage 5: Validate All Aspects

### 5A: Breakpoint Analysis

```javascript
async function validateBreakpoints(page, designSystem) {
  const breakpoints = {
    mobile: 375,
    tablet: 768,
    desktop: 1440
  };
  
  const results = {};
  
  for (const [name, width] of Object.entries(breakpoints)) {
    await page.setViewportSize({ width, height: 800 });
    const violations = await analyzeViolations(
      await captureDesignProperties(component, designSystem),
      designSystem
    );
    results[name] = violations;
  }
  
  return results;
}
```

### 5B: Dark Mode Analysis

```javascript
async function validateModes(page, designSystem) {
  const modes = ['light', 'dark', 'high-contrast'];
  const results = {};
  
  for (const mode of modes) {
    await page.emulateMedia({ colorScheme: mode });
    const violations = await analyzeViolations(...);
    
    // Validate contrast in this mode
    const contrastIssues = await validateContrast(component, mode);
    
    results[mode] = {
      violations,
      contrastIssues
    };
  }
  
  return results;
}
```

### 5C: Interactive State Analysis

```javascript
async function validateStates(page, component, designSystem) {
  const states = ['default', 'hover', 'focus', 'active', 'disabled'];
  const results = {};
  
  for (const state of states) {
    // Trigger state
    await triggerState(component, state);
    
    // Analyze
    const violations = await analyzeViolations(...);
    results[state] = violations;
  }
  
  return results;
}
```

---

## Stage 6: Generate Report

**Structured JSON output with remediation:**

```javascript
function generateReport(violations, metadata) {
  return {
    analysis: {
      component: metadata.component,
      timestamp: new Date().toISOString(),
      designSystem: metadata.designSystem
    },
    summary: {
      totalViolations: violations.length,
      critical: violations.filter(v => v.severity === 'CRITICAL').length,
      high: violations.filter(v => v.severity === 'HIGH').length,
      medium: violations.filter(v => v.severity === 'MEDIUM').length,
      low: violations.filter(v => v.severity === 'LOW').length
    },
    violations: violations.map(v => ({
      id: generateId(),
      severity: v.severity,
      category: v.category,
      property: v.property,
      currentValue: v.currentValue,
      tokenName: v.tokenName,
      expectedValue: v.expectedValue,
      difference: v.difference,
      remediation: v.remediation,
      testingApproach: generateTestingApproach(v)
    })),
    recommendations: generateRecommendations(violations)
  };
}
```

---

## Implementation Checklist

**Before invoking visual-consistency-tester:**

- [ ] Design system tokens loaded and validated
- [ ] Component source accessible (URL or local path)
- [ ] Playwright ready with page loaded
- [ ] All property categories covered (colors, spacing, typography, shapes, motion)
- [ ] All breakpoints to test specified (mobile, tablet, desktop)
- [ ] All modes to test specified (light, dark, high-contrast)
- [ ] All states to test specified (default, hover, focus, active, disabled)

**During analysis:**

- [ ] No violations skipped or rationalized
- [ ] All violations mapped to specific tokens
- [ ] All differences quantified (pixels, percentages, hex deltas)
- [ ] All violations categorized by severity
- [ ] All WCAG failures escalated to CRITICAL
- [ ] All violations include remediation guidance
- [ ] All violations include testing approach

**After analysis:**

- [ ] Report validated for completeness
- [ ] No severity miscategorization
- [ ] All remediation code syntactically correct
- [ ] All testing approaches specific and actionable

---

## Gemini Integration

**If using Gemini to enhance findings:**

```bash
gemini "
<context>
Design System Tokens: ${JSON.stringify(designSystem)}
Captured Properties: ${JSON.stringify(properties)}
Initial Violations: ${JSON.stringify(violations)}
Component: ${component}
</context>

<task>
Enhance visual consistency findings with detailed remediation guidance.

For each violation:
1. Verify token mapping is correct
2. Confirm severity categorization
3. Provide CSS remediation code
4. Suggest testing approach

Map ALL violations to tokens. Do not skip any.
</task>

<output_requirements>
JSON array of violations with:
- Severity: CRITICAL, HIGH, MEDIUM, LOW, INFO
- Complete remediation with CSS code
- Testing approach for each violation
</output_requirements>
" --output-format json
```

---

## Error Handling

**Critical errors to catch:**

```javascript
// Design system not found
if (!designSystem) {
  throw new Error('Design system tokens not found. Use --design-system <path>');
}

// Component not accessible
if (!component) {
  throw new Error('Component not accessible. Verify --imageSource is valid');
}

// Token mapping failed
if (violation.tokenName === 'UNMAPPED') {
  console.warn(`Warning: Property ${violation.property} could not be mapped to token`);
  violation.severity = 'MEDIUM'; // Unmapped violations are at least MEDIUM
}

// No violations found
if (violations.length === 0) {
  console.warn('No violations found. Component may be fully compliant.');
}
```

---

## Testing the Skill

**Verify the subagent implements the skill correctly:**

```bash
# Test Scenario 1: Token mapping
/design-eval:visual-consistency --imageSource component.png --design-system design-tokens.json
# Verify: All 3 violations mapped to specific tokens

# Test Scenario 2: Responsive design
# (Same command with multiple breakpoint analysis)
# Verify: All breakpoints analyzed, no deprioritization of mobile/tablet

# Test Scenario 3: Dark mode
# (Same command with mode analysis)
# Verify: Both light and dark modes analyzed

# Test Scenario 4: No rationalization
# (Component with 7 violations)
# Verify: All 7 violations reported, none rationalized away as "acceptable"

# Test Scenario 5: Complete remediation
# Verify: Every violation has CSS fix and testing approach
```

---

## References

- Implementation Patterns: `implementation-patterns.md`
- Skill Guidance: `../SKILL.md`
- RED Phase Results: `../RED_PHASE_RESULTS.md`
