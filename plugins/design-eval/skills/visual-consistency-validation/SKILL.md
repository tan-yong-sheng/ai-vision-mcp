---
name: visual-consistency-validation
description: "Use this skill when validating design system token usage, detecting visual consistency violations, analyzing visual regressions, or identifying responsive design issues"
user-invocable: false
---

# Visual Consistency Validation

Guidance for analyzing visual consistency, validating design tokens, and detecting visual regressions.

## When to Use

Use this skill when:
- Validating visual consistency against design system tokens
- Extracting and cataloging design tokens from designs
- Comparing inferred patterns vs validated design system
- Calculating visual consistency metrics
- Detecting visual regressions and layout shifts
- Analyzing responsive design issues

## Two Analysis Approaches

### Approach 1: Inferred (Auto-Discovery)

**When to use**: No design system available, or discovering what tokens are actually in use

**Process**:
1. Extract all visual properties from design
2. Catalog colors, typography, spacing, shapes, motion
3. Identify patterns and deviations
4. Infer design system from actual usage

**Output**: Discovered token catalog with consistency analysis

**Example**:
```
Inferred Color Palette:
- Primary: #0066cc (used in 12 places)
- Secondary: #00cc66 (used in 8 places)
- Neutral: #f5f5f5 (used in 24 places)
- Deviation: #ff6600 (used in 2 places - not in pattern)

Consistency Score: 87% (26/30 colors match inferred palette)
```

### Approach 2: Validated (Against Design System)

**When to use**: Design system tokens are defined and available

**Process**:
1. Load design system token definitions
2. Analyze actual usage in design
3. Compare actual vs expected values
4. Identify violations and deviations
5. Calculate compliance score

**Output**: Compliance report with violations and remediation

**Example**:
```
Token Validation Results:
- Primary Color: Expected #0066cc, Found #0066cc ✓
- Secondary Color: Expected #00cc66, Found #00cc99 ✗ (deviation)
- Spacing-sm: Expected 8px, Found 8px ✓
- Spacing-md: Expected 16px, Found 12px ✗ (deviation)

Compliance Score: 92% (23/25 tokens correct)
```

## Design Token Categories

### 1. Color Tokens

**Extraction**:
- Primary colors (main brand color)
- Secondary colors (accent, supporting)
- Neutral colors (grays, backgrounds)
- Semantic colors (success, error, warning, info)
- State colors (hover, active, disabled, focus)

**Validation**:
- Exact hex/RGB match
- Contrast ratios (for accessibility)
- Usage consistency across components

**Metrics**:
```
Color Consistency:
- Total colors used: 24
- Unique colors: 18
- Colors matching palette: 16
- Deviations: 2
- Compliance: 89%
```

### 2. Typography Tokens

**Extraction**:
- Font families (Roboto, Inter, etc.)
- Font sizes (12px, 14px, 16px, etc.)
- Font weights (400, 500, 700, etc.)
- Line heights (1.2, 1.5, 1.8, etc.)
- Letter spacing (normal, -0.02em, etc.)

**Validation**:
- Font family matches system
- Size matches defined scale
- Weight matches defined scale
- Line height matches defined scale

**Metrics**:
```
Typography Consistency:
- Font families: 2 (Roboto, Inter)
- Font sizes: 8 unique (12px, 14px, 16px, 18px, 20px, 24px, 28px, 32px)
- Font weights: 3 (400, 500, 700)
- Compliance: 94%
```

### 3. Spacing Tokens

**Extraction**:
- Margin values (4px, 8px, 16px, 24px, etc.)
- Padding values
- Gap values (flexbox, grid)
- Border radius values

**Validation**:
- Values match defined spacing scale
- Consistent application across components
- Responsive adjustments follow pattern

**Metrics**:
```
Spacing Consistency:
- Spacing scale: 8px base (8, 16, 24, 32, 40, 48px)
- Values matching scale: 34/36
- Deviations: 2 (12px, 20px)
- Compliance: 94%
```

### 4. Shape Tokens

**Extraction**:
- Border radius values (0px, 4px, 8px, 12px, etc.)
- Border widths (1px, 2px, etc.)
- Shadow definitions (elevation levels)
- Stroke styles

**Validation**:
- Border radius matches defined scale
- Shadows match elevation system
- Consistent application

**Metrics**:
```
Shape Consistency:
- Border radius scale: 0, 4px, 8px, 12px, 16px
- Values matching scale: 28/30
- Deviations: 2
- Compliance: 93%
```

### 5. Motion Tokens

**Extraction**:
- Transition durations (100ms, 200ms, 300ms, etc.)
- Easing functions (ease-in, ease-out, ease-in-out, etc.)
- Animation properties

**Validation**:
- Duration matches defined scale
- Easing matches defined set
- Consistent application

**Metrics**:
```
Motion Consistency:
- Transition durations: 3 (100ms, 200ms, 300ms)
- Easing functions: 2 (ease-out, ease-in-out)
- Compliance: 100%
```

## Consistency Metrics

### Overall Consistency Score

```
Score = (Tokens Matching / Total Tokens) × 100

Example:
- Color tokens matching: 16/18 = 89%
- Typography tokens matching: 15/16 = 94%
- Spacing tokens matching: 34/36 = 94%
- Shape tokens matching: 28/30 = 93%
- Motion tokens matching: 3/3 = 100%

Overall = (16+15+34+28+3) / (18+16+36+30+3) × 100 = 96/103 = 93%
```

### Deviation Analysis

**Types of deviations**:
1. **Off-scale**: Value not in defined scale (e.g., 12px when scale is 8, 16, 24)
2. **Wrong token**: Using different token than intended (e.g., primary color instead of secondary)
3. **Missing token**: No token defined for this value
4. **Unused token**: Token defined but not used

**Remediation priority**:
1. **Critical**: Off-scale values (indicates missing token or error)
2. **High**: Wrong token usage (indicates confusion or inconsistency)
3. **Medium**: Unused tokens (cleanup opportunity)
4. **Low**: Missing documentation

## Visual Regression Detection

### Baseline Comparison

**Capture baseline**:
```
1. Screenshot component at standard breakpoints
2. Extract visual properties (colors, sizes, positions)
3. Store as baseline for future comparison
```

**Compare to baseline**:
```
1. Screenshot updated component
2. Extract visual properties
3. Pixel-by-pixel comparison
4. Identify changes and regressions
```

### Regression Types

**Layout shifts**:
- Element moved (x/y position changed)
- Element resized (width/height changed)
- Spacing changed (margin/padding)

**Visual changes**:
- Color changed
- Font changed
- Border/shadow changed
- Opacity changed

**Responsive issues**:
- Breakpoint behavior changed
- Mobile layout broken
- Tablet layout broken

### Regression Report

```json
{
  "regressions": [
    {
      "element": ".button-primary",
      "type": "color_change",
      "baseline": "#0066cc",
      "current": "#0066dd",
      "severity": "low",
      "impact": "Barely perceptible color shift"
    },
    {
      "element": ".card",
      "type": "layout_shift",
      "baseline": { "x": 0, "y": 0, "width": 320, "height": 400 },
      "current": { "x": 0, "y": 0, "width": 320, "height": 420 },
      "severity": "medium",
      "impact": "Card height increased by 20px"
    }
  ],
  "total_regressions": 2,
  "severity_distribution": {
    "critical": 0,
    "high": 0,
    "medium": 1,
    "low": 1
  }
}
```

## Responsive Design Validation

### Breakpoint Analysis

**Standard breakpoints**:
- Mobile: 320px, 375px, 414px
- Tablet: 768px, 1024px
- Desktop: 1280px, 1440px, 1920px

**Validation checklist**:
- [ ] Layout adapts at each breakpoint
- [ ] Text remains readable at all sizes
- [ ] Touch targets ≥ 44x44px on mobile
- [ ] Images scale appropriately
- [ ] Spacing adjusts for screen size
- [ ] No horizontal scroll at any breakpoint

### Responsive Metrics

```
Responsive Compliance:
- Breakpoints tested: 7
- Breakpoints passing: 7/7 = 100%
- Layout shifts: 0
- Text readability issues: 0
- Touch target issues: 0
- Horizontal scroll issues: 0
```

## Output Structure

```json
{
  "analysis_type": "inferred|validated",
  "consistency_score": 93,
  "token_summary": {
    "colors": {
      "total": 18,
      "matching": 16,
      "deviations": 2,
      "compliance": 89
    },
    "typography": {
      "total": 16,
      "matching": 15,
      "deviations": 1,
      "compliance": 94
    },
    "spacing": {
      "total": 36,
      "matching": 34,
      "deviations": 2,
      "compliance": 94
    },
    "shape": {
      "total": 30,
      "matching": 28,
      "deviations": 2,
      "compliance": 93
    },
    "motion": {
      "total": 3,
      "matching": 3,
      "deviations": 0,
      "compliance": 100
    }
  },
  "deviations": [
    {
      "category": "color",
      "token": "accent-color",
      "expected": "#ff6600",
      "actual": "#ff6633",
      "elements": [".button-secondary", ".link"],
      "severity": "low",
      "remediation": "Update color to match token"
    }
  ],
  "recommendations": [
    "Extract missing spacing token for 12px",
    "Consolidate 2 similar button colors",
    "Document motion token usage"
  ]
}
```

## Testing Checklist

### Automated Testing
- [ ] Extract colors from design
- [ ] Extract typography from design
- [ ] Extract spacing from design
- [ ] Compare to design system tokens
- [ ] Calculate consistency score
- [ ] Generate deviation report

### Manual Testing
- [ ] Visual inspection at multiple breakpoints
- [ ] Color contrast verification
- [ ] Typography readability check
- [ ] Spacing consistency review
- [ ] Motion smoothness check
- [ ] Responsive behavior validation

### User Testing
- [ ] Test on multiple devices
- [ ] Test on multiple browsers
- [ ] Test with different zoom levels
- [ ] Test with different color modes (light/dark)
- [ ] Test with reduced motion preference

## Reference Materials

- Design System Metrics: `design-audit-framework/references/design-system-metrics.md`
- Visual Regression Patterns: `visual-testing/references/visual-regression-patterns.md`
- Playwright Guide: `visual-testing/references/playwright-guide.md`
