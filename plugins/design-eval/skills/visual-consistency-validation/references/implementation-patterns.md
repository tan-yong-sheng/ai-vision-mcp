---
name: Implementation Patterns for Visual Consistency Validation
description: Concrete patterns and templates for implementing systematic token mapping, violation detection, and remediation guidance
type: reference
---

# Implementation Patterns

## Pattern 1: Systematic Token Mapping

**Template for mapping violations to tokens:**

```javascript
// Violation detection and token mapping
const violation = {
  property: 'padding',
  currentValue: '12px',
  tokenName: 'spacing-medium',
  expectedValue: '16px',
  difference: {
    pixels: 4,
    percentage: 25,
    direction: 'smaller'
  },
  severity: 'HIGH',
  element: '.button-primary',
  remediation: {
    current: '.button { padding: 12px; }',
    fixed: '.button { padding: var(--spacing-medium); /* 16px */ }'
  }
};
```

**Implementation checklist:**
1. Extract property from component
2. Compare to design system token
3. Calculate quantified difference
4. Determine severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)
5. Provide CSS remediation
6. Suggest testing approach

---

## Pattern 2: Comprehensive Violation Detection

**Systematic property validation:**

```javascript
const propertiesToValidate = {
  colors: ['color', 'background-color', 'border-color', 'box-shadow'],
  spacing: ['padding', 'margin', 'gap', 'position'],
  typography: ['font-size', 'font-weight', 'line-height', 'letter-spacing'],
  shapes: ['border-radius', 'border-width', 'box-shadow'],
  animations: ['transition-duration', 'animation-duration', 'animation-timing-function']
};

// For each component, validate ALL properties
function validateComponent(component, designSystem) {
  const violations = [];
  
  for (const [category, properties] of Object.entries(propertiesToValidate)) {
    for (const property of properties) {
      const computed = getComputedStyle(component, property);
      const token = findMatchingToken(designSystem, property, computed);
      
      if (!token || computed !== token.value) {
        violations.push({
          category,
          property,
          currentValue: computed,
          token: token?.name || 'UNMAPPED',
          expectedValue: token?.value || 'N/A',
          severity: calculateSeverity(category, property, computed, token)
        });
      }
    }
  }
  
  return violations;
}
```

---

## Pattern 3: Breakpoint-Specific Analysis

**Mobile-first validation approach:**

```javascript
const breakpoints = {
  mobile: { min: 0, max: 767, name: 'mobile' },
  tablet: { min: 768, max: 1023, name: 'tablet' },
  desktop: { min: 1024, max: Infinity, name: 'desktop' }
};

async function validateResponsiveDesign(component, designSystem) {
  const results = {};
  
  for (const [key, breakpoint] of Object.entries(breakpoints)) {
    // Resize viewport to breakpoint
    await page.setViewportSize({
      width: breakpoint.min + 100,
      height: 800
    });
    
    // Capture screenshot
    const screenshot = await page.screenshot();
    
    // Analyze at this breakpoint
    const violations = await analyzeComponent(component, designSystem);
    
    results[key] = {
      breakpoint: breakpoint.name,
      violations,
      screenshot,
      layoutShifts: detectLayoutShifts(screenshot, results[Object.keys(results)[Object.keys(results).length - 2]]?.screenshot)
    };
  }
  
  return results;
}
```

---

## Pattern 4: Dark Mode and Alternative State Validation

**Mode-specific analysis:**

```javascript
const modes = ['light', 'dark', 'high-contrast'];

async function validateAllModes(component, designSystem) {
  const results = {};
  
  for (const mode of modes) {
    // Set color scheme
    await page.emulateMedia({ colorScheme: mode });
    
    // Analyze component in this mode
    const violations = await analyzeComponent(component, designSystem);
    
    // Validate contrast in this mode
    const contrastIssues = await validateContrast(component, mode);
    
    results[mode] = {
      violations,
      contrastIssues,
      screenshot: await page.screenshot()
    };
  }
  
  return results;
}
```

---

## Pattern 5: Severity Categorization

**Automated severity determination:**

```javascript
function calculateSeverity(category, property, currentValue, token) {
  // CRITICAL: Accessibility failures
  if (category === 'colors' && property === 'color') {
    const contrast = calculateContrast(currentValue, getBackground());
    if (contrast < 4.5) return 'CRITICAL'; // WCAG AA failure
  }
  
  // CRITICAL: Layout-breaking changes
  if (category === 'spacing' && ['padding', 'margin'].includes(property)) {
    const diff = Math.abs(parseFloat(currentValue) - parseFloat(token.value));
    if (diff > 20) return 'CRITICAL'; // Major layout impact
  }
  
  // HIGH: Token violations
  if (currentValue !== token.value) {
    return 'HIGH';
  }
  
  // MEDIUM: Minor deviations (< 10%)
  const percentDiff = Math.abs((parseFloat(currentValue) - parseFloat(token.value)) / parseFloat(token.value)) * 100;
  if (percentDiff < 10) return 'MEDIUM';
  
  // LOW: Very minor deviations (< 5%)
  if (percentDiff < 5) return 'LOW';
  
  return 'INFO';
}
```

---

## Pattern 6: Complete Remediation Template

**Structured remediation output:**

```javascript
const remediation = {
  violation: {
    property: 'padding',
    currentValue: '12px',
    tokenName: 'spacing-medium',
    expectedValue: '16px'
  },
  problem: 'Button padding is 12px but should be 16px per spacing-medium token. This creates inconsistent spacing across the design system.',
  currentCode: '.button { padding: 12px; }',
  fixedCode: '.button { padding: var(--spacing-medium); /* 16px */ }',
  validationSteps: [
    'Inspect button element in DevTools',
    'Verify computed padding is 16px',
    'Compare to other buttons using spacing-medium token',
    'Verify spacing is consistent across all button variants'
  ],
  testingApproach: [
    'Test at mobile, tablet, desktop breakpoints',
    'Test in light and dark modes',
    'Test all button states (default, hover, focus, active, disabled)',
    'Verify no layout shifts at breakpoint transitions'
  ]
};
```

---

## Pattern 7: Interactive State Validation

**State-specific token mapping:**

```javascript
const interactiveStates = ['default', 'hover', 'focus', 'active', 'disabled'];

async function validateInteractiveStates(component, designSystem) {
  const results = {};
  
  for (const state of interactiveStates) {
    // Trigger state
    switch (state) {
      case 'hover':
        await component.hover();
        break;
      case 'focus':
        await component.focus();
        break;
      case 'active':
        await component.click();
        break;
      case 'disabled':
        await component.evaluate(el => el.disabled = true);
        break;
    }
    
    // Analyze in this state
    const violations = await analyzeComponent(component, designSystem);
    
    results[state] = {
      violations,
      screenshot: await page.screenshot()
    };
  }
  
  return results;
}
```

---

## Pattern 8: Impact Assessment

**Measure and report visual impact:**

```javascript
function assessImpact(violation) {
  const pixelDiff = Math.abs(parseFloat(violation.currentValue) - parseFloat(violation.expectedValue));
  const percentDiff = (pixelDiff / parseFloat(violation.expectedValue)) * 100;
  
  return {
    pixelDifference: pixelDiff,
    percentageChange: percentDiff,
    userVisibility: percentDiff > 10 ? 'HIGH' : percentDiff > 5 ? 'MEDIUM' : 'LOW',
    layoutImpact: pixelDiff > 20 ? 'CRITICAL' : pixelDiff > 10 ? 'HIGH' : 'MEDIUM',
    overallImpact: calculateOverallImpact(pixelDiff, percentDiff)
  };
}
```

---

## Pattern 9: Violation Report Structure

**Structured JSON output:**

```json
{
  "analysis": {
    "component": "button-primary",
    "timestamp": "2026-04-06T03:48:22Z",
    "designSystem": "design-tokens.json"
  },
  "summary": {
    "totalViolations": 7,
    "critical": 1,
    "high": 2,
    "medium": 2,
    "low": 2,
    "info": 0
  },
  "violations": [
    {
      "id": "v001",
      "severity": "CRITICAL",
      "category": "colors",
      "property": "color",
      "currentValue": "#E0E0E0",
      "tokenName": "text-color-dark-mode",
      "expectedValue": "#FFFFFF",
      "difference": {
        "hex": "#1F1F1F",
        "contrast": "3.2:1 (WCAG AA requires 4.5:1)"
      },
      "element": ".button-primary",
      "mode": "dark",
      "breakpoint": "desktop",
      "impact": "HIGH",
      "remediation": {
        "current": ".button-primary { color: #E0E0E0; }",
        "fixed": ".button-primary { color: var(--text-color-dark-mode); /* #FFFFFF */ }"
      }
    }
  ],
  "recommendations": [
    "Fix CRITICAL contrast issue in dark mode",
    "Validate all color tokens across light and dark modes",
    "Test responsive design at all breakpoints"
  ]
}
```

---

## Pattern 10: No Rationalization Enforcement

**Prevent violations from being dismissed:**

```javascript
function validateNoRationalization(violations) {
  const rationalizations = [
    'close enough',
    'acceptable variance',
    'minor difference',
    'within acceptable range',
    'typical for design systems',
    'focus on critical issues',
    'not evaluating hover states',
    'desktop is primary'
  ];
  
  for (const violation of violations) {
    // Ensure violation is not rationalized away
    if (violation.severity === 'CRITICAL' || violation.severity === 'HIGH') {
      // Must have remediation
      if (!violation.remediation) {
        throw new Error(`Violation ${violation.id} missing remediation`);
      }
      
      // Must have testing approach
      if (!violation.testingApproach) {
        throw new Error(`Violation ${violation.id} missing testing approach`);
      }
    }
  }
  
  return true;
}
```
