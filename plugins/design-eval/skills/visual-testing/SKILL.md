---
name: visual-testing
description: Playwright visual testing and visual regression patterns
user-invocable: false
---

# Visual Testing Skill

Comprehensive guidance for conducting visual regression testing, design token validation, and visual consistency analysis using Playwright and visual comparison techniques.

## When to Use

Use this skill when:
- Setting up visual regression testing for design systems
- Validating design token usage across components
- Detecting visual inconsistencies and layout shifts
- Comparing designs against baseline screenshots
- Testing responsive design across breakpoints
- Measuring visual consistency metrics

## Visual Testing Fundamentals

### Screenshot Capture

**Playwright Screenshot API:**
```javascript
// Capture full page
await page.screenshot({ path: 'screenshot.png' });

// Capture specific element
await page.locator('.component').screenshot({ path: 'component.png' });

// Capture with specific viewport
await page.setViewportSize({ width: 1280, height: 720 });
await page.screenshot({ path: 'desktop.png' });

// Capture multiple breakpoints
const breakpoints = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 }
];

for (const bp of breakpoints) {
  await page.setViewportSize({ width: bp.width, height: bp.height });
  await page.screenshot({ path: `screenshot-${bp.name}.png` });
}
```

### Baseline Establishment

**First-time setup:**
1. Capture screenshots of current design
2. Store as baseline in version control
3. Document viewport sizes and conditions
4. Include metadata (date, browser, OS)

**Baseline file structure:**
```
baselines/
├── component-button/
│   ├── default-mobile.png
│   ├── default-tablet.png
│   ├── default-desktop.png
│   ├── hover-desktop.png
│   └── metadata.json
├── component-card/
│   └── ...
└── metadata.json
```

### Visual Regression Detection

**Pixel-by-pixel comparison:**
```javascript
// Using pixelmatch or similar
const diff = pixelmatch(
  img1.data,
  img2.data,
  diffOutput.data,
  img1.width,
  img1.height,
  { threshold: 0.1 }
);

const percentDifferent = (diff / (img1.width * img1.height)) * 100;
```

**Acceptable thresholds:**
- **0-0.1%**: No visible change (acceptable)
- **0.1-1%**: Minor anti-aliasing or rendering differences (acceptable)
- **1-5%**: Noticeable change, investigate (flag for review)
- **5%+**: Significant change, requires approval (flag as regression)

## Design Token Validation

### Token Extraction

**Extract computed styles:**
```javascript
// Get all computed styles for element
const element = await page.locator('.component');
const styles = await element.evaluate(el => {
  const computed = window.getComputedStyle(el);
  return {
    color: computed.color,
    backgroundColor: computed.backgroundColor,
    fontSize: computed.fontSize,
    fontFamily: computed.fontFamily,
    padding: computed.padding,
    margin: computed.margin,
    borderRadius: computed.borderRadius,
    boxShadow: computed.boxShadow
  };
});
```

### Token Mapping

**Map CSS values to design tokens:**
```javascript
const tokenMap = {
  colors: {
    '#1a1a1a': 'color.text.primary',
    '#424242': 'color.text.secondary',
    '#0066FF': 'color.primary.500'
  },
  typography: {
    '16px': 'typography.body.regular',
    '14px': 'typography.body.small',
    '24px': 'typography.heading.lg'
  },
  spacing: {
    '8px': 'spacing.xs',
    '16px': 'spacing.md',
    '24px': 'spacing.lg'
  }
};

// Check if value matches token
function validateToken(cssValue, category) {
  return tokenMap[category][cssValue] || null;
}
```

### Consistency Scoring

**Calculate consistency percentage:**
```javascript
function calculateConsistency(elements, tokenMap) {
  let totalTokens = 0;
  let validTokens = 0;

  for (const element of elements) {
    const styles = extractStyles(element);
    for (const [category, value] of Object.entries(styles)) {
      totalTokens++;
      if (tokenMap[category][value]) {
        validTokens++;
      }
    }
  }

  return (validTokens / totalTokens) * 100;
}
```

## Responsive Design Testing

### Breakpoint Testing

**Test across standard breakpoints:**
```javascript
const breakpoints = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  desktop: { width: 1280, height: 720, name: 'Desktop' },
  wide: { width: 1920, height: 1080, name: 'Wide Desktop' }
};

for (const [key, bp] of Object.entries(breakpoints)) {
  await page.setViewportSize({ width: bp.width, height: bp.height });
  
  // Check for layout shifts
  const layout = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-test]');
    return Array.from(elements).map(el => ({
      id: el.dataset.test,
      rect: el.getBoundingClientRect()
    }));
  });
  
  // Compare to baseline
  const baseline = loadBaseline(key);
  const shifts = detectLayoutShifts(layout, baseline);
  
  if (shifts.length > 0) {
    console.warn(`Layout shifts at ${bp.name}:`, shifts);
  }
}
```

### Responsive Validation

**Check responsive behavior:**
- Elements reflow correctly at breakpoints
- No horizontal scrolling at any breakpoint
- Text remains readable at all sizes
- Images scale appropriately
- Touch targets are adequate (44x44px minimum)

## Motion and Animation Testing

### Animation Capture

**Capture animation frames:**
```javascript
// Capture animation sequence
const frames = [];
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(16); // ~60fps
  const frame = await page.screenshot();
  frames.push(frame);
}

// Create animated GIF or video for review
```

### Prefers-Reduced-Motion Testing

**Test with motion preferences:**
```javascript
// Enable reduced motion
await page.emulateMedia({ reducedMotion: 'reduce' });

// Verify animations are disabled or reduced
const hasAnimation = await page.locator('.animated').evaluate(el => {
  const computed = window.getComputedStyle(el);
  return computed.animationDuration !== '0s';
});

if (hasAnimation) {
  console.warn('Animation not disabled with prefers-reduced-motion');
}
```

## Color and Contrast Testing

### Color Extraction

**Extract all colors from page:**
```javascript
const colors = await page.evaluate(() => {
  const elements = document.querySelectorAll('*');
  const colorSet = new Set();
  
  for (const el of elements) {
    const computed = window.getComputedStyle(el);
    colorSet.add(computed.color);
    colorSet.add(computed.backgroundColor);
  }
  
  return Array.from(colorSet);
});
```

### Contrast Validation

**Check color contrast:**
```javascript
function getContrast(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Validate against WCAG standards
const contrast = getContrast(textColor, backgroundColor);
if (contrast < 4.5) {
  console.warn(`Insufficient contrast: ${contrast}:1 (need 4.5:1)`);
}
```

## Reference Materials

See the following reference files for detailed guidance:
- `references/playwright-guide.md` - Playwright screenshot API usage and patterns
- `references/visual-regression-patterns.md` - Visual regression testing workflows and best practices
