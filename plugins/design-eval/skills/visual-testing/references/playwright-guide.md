# Playwright Visual Testing Guide

## Screenshot Capture Patterns

### Basic Screenshot

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
```

### Full Page Screenshot

```javascript
// Capture entire page including below-the-fold content
await page.screenshot({
  path: 'full-page.png',
  fullPage: true
});
```

### Element-Specific Screenshot

```javascript
// Screenshot single component
const button = page.locator('button');
await button.screenshot({ path: 'button.png' });

// Screenshot multiple elements
const cards = await page.locator('[role="article"]').all();
for (let i = 0; i < cards.length; i++) {
  await cards[i].screenshot({ path: `card-${i}.png` });
}
```

### Viewport Management

```javascript
// Set viewport size
await page.setViewportSize({ width: 1280, height: 720 });

// Test multiple viewports
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 }
];

for (const viewport of viewports) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.screenshot({ path: `${viewport.name}.png` });
}
```

### Device Emulation

```javascript
// Emulate specific device
const iPhone = {
  userAgent: 'Mozilla/5.0...',
  viewport: { width: 375, height: 667 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true
};

await page.setViewportSize({ width: 375, height: 667 });
await page.screenshot({ path: 'iphone.png' });
```

## Visual Regression Testing

### Baseline Comparison

```javascript
const { test, expect } = require('@playwright/test');

test('button visual regression', async ({ page }) => {
  await page.goto('/components/button');
  
  // Compare to baseline
  await expect(page).toHaveScreenshot('button.png');
});
```

### Custom Comparison

```javascript
const pixelmatch = require('pixelmatch');
const PNG = require('pngjs').PNG;
const fs = require('fs');

async function compareScreenshots(actual, baseline) {
  const img1 = PNG.sync.read(fs.readFileSync(baseline));
  const img2 = PNG.sync.read(fs.readFileSync(actual));
  
  const diff = new PNG({ width: img1.width, height: img1.height });
  
  const numDiffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    img1.width,
    img1.height,
    { threshold: 0.1 }
  );
  
  const percentDifferent = (numDiffPixels / (img1.width * img1.height)) * 100;
  
  return {
    diff: numDiffPixels,
    percentage: percentDifferent,
    passed: percentDifferent < 1
  };
}

// Usage
const result = await compareScreenshots('new.png', 'baseline.png');
if (!result.passed) {
  console.log(`Visual regression detected: ${result.percentage}% different`);
}
```

### Threshold Configuration

```javascript
// Allow small rendering differences
await expect(page).toHaveScreenshot('button.png', {
  maxDiffPixels: 100,  // Allow up to 100 different pixels
  threshold: 0.2       // Allow 20% color difference per pixel
});
```

## State Testing

### Interactive States

```javascript
// Capture hover state
await page.locator('button').hover();
await page.screenshot({ path: 'button-hover.png' });

// Capture focus state
await page.locator('button').focus();
await page.screenshot({ path: 'button-focus.png' });

// Capture active state
await page.locator('button').press('Space');
await page.screenshot({ path: 'button-active.png' });
await page.locator('button').press('Space');
```

### Form States

```javascript
// Filled form
await page.fill('input[name="email"]', 'test@example.com');
await page.screenshot({ path: 'form-filled.png' });

// Form with errors
await page.fill('input[name="email"]', 'invalid');
await page.locator('button[type="submit"]').click();
await page.screenshot({ path: 'form-error.png' });
```

### Modal/Dialog States

```javascript
// Closed state
await page.screenshot({ path: 'modal-closed.png' });

// Open state
await page.locator('[aria-label="Open dialog"]').click();
await page.screenshot({ path: 'modal-open.png' });

// With content
await page.fill('[role="dialog"] input', 'Some text');
await page.screenshot({ path: 'modal-filled.png' });
```

## Animation Testing

### Animation Snapshots

```javascript
// Disable animations for consistent screenshots
await page.addInitScript(() => {
  document.documentElement.style.setProperty('--motion-safe', 'prefers-reduced-motion');
});

// Alternative: use CSS to disable animations
await page.addStyleTag({
  content: `
    * {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `
});

await page.screenshot({ path: 'no-animation.png' });
```

### Frame Capture

```javascript
// Capture animation frames
const frames = [];
const duration = 1000; // 1 second
const interval = 50; // 50ms between frames
const numFrames = duration / interval;

for (let i = 0; i < numFrames; i++) {
  const screenshot = await page.screenshot();
  frames.push(screenshot);
  await page.waitForTimeout(interval);
}

// Save as video or GIF
```

## Dark Mode Testing

```javascript
// Test light mode
await page.emulateMedia({ colorScheme: 'light' });
await page.screenshot({ path: 'light.png' });

// Test dark mode
await page.emulateMedia({ colorScheme: 'dark' });
await page.screenshot({ path: 'dark.png' });
```

## Accessibility Testing

### Reduced Motion

```javascript
// Capture with reduced motion preference
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.screenshot({ path: 'reduced-motion.png' });
```

### High Contrast

```javascript
// Some browsers support forced colors mode
await page.emulateMedia({ forcedColors: 'active' });
await page.screenshot({ path: 'forced-colors.png' });
```

## Batch Processing

```javascript
// Test all components
const components = [
  'button',
  'card',
  'modal',
  'form',
  'menu'
];

for (const component of components) {
  await page.goto(`/components/${component}`);
  
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: `baselines/${component}-${viewport.name}.png`
    });
  }
}
```

## Performance Considerations

### Memory Management

```javascript
// Close page between screenshots if processing many
for (const component of components) {
  const page = await browser.newPage();
  await page.goto(`/components/${component}`);
  await page.screenshot();
  await page.close(); // Free memory
}
```

### Parallel Processing

```javascript
const Promise = require('bluebird');

// Process multiple pages in parallel
await Promise.map(
  components,
  async (component) => {
    const page = await browser.newPage();
    await page.goto(`/components/${component}`);
    await page.screenshot({ path: `${component}.png` });
    await page.close();
  },
  { concurrency: 4 } // 4 pages in parallel
);
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Visual Regression Tests
  run: |
    npx playwright test --grep @visual
    
- name: Upload Diff Images
  if: failure()
  uses: actions/upload-artifact@v2
  with:
    name: visual-diffs
    path: test-results/
```

### Test Script

```javascript
const fs = require('fs');

async function visualRegressionTest() {
  const baseline = 'baselines/';
  const current = 'screenshots/';
  
  const components = fs.readdirSync(baseline);
  const failures = [];
  
  for (const component of components) {
    const baselinePath = `${baseline}/${component}`;
    const currentPath = `${current}/${component}`;
    
    const result = await compareScreenshots(currentPath, baselinePath);
    
    if (!result.passed) {
      failures.push({
        component,
        difference: result.percentage
      });
    }
  }
  
  if (failures.length > 0) {
    console.error('Visual regression detected in:', failures);
    process.exit(1);
  }
}
```
