---
name: playwright-testing
description: "Use this skill to capture full-page screenshots at fixed viewports using Playwright, with automatic temp file management and optional custom output directories"
---

# Playwright Testing

Capture full-page screenshots at fixed device viewports using Playwright. Perfect for testing responsive design, feeding screenshots into accessibility audits, and comparing designs across breakpoints.

## When to Use

- Capture screenshots for accessibility audits (feed to `/design-eval:audit-accessibility`)
- Test responsive design across mobile, tablet, desktop
- Generate consistent screenshots for design system validation
- Create before/after comparisons at specific viewports
- Automate screenshot capture in CI/CD pipelines

## Key Features

- **Full-page captures** — Entire page content, not just viewport
- **Fixed viewports** — Consistent sizes across runs (no monitor-size variation)
- **Temp file management** — Auto-saves to `/tmp/` with unique timestamps
- **Optional output override** — Users can save to project directory if needed
- **Responsive testing** — Test multiple breakpoints in one script
- **Navigation support** — Navigate complex flows before capturing

## Quick Start

### Basic Capture (Mobile)

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  
  // Navigate to page
  await page.goto('https://example.com/login');
  
  // Generate temp filename
  const timestamp = Date.now();
  const screenshotPath = path.join(
    os.tmpdir(),
    `design-eval-${timestamp}-mobile.jpg`
  );
  
  // Capture full page
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true 
  });
  
  console.log(`Screenshot saved to: ${screenshotPath}`);
  
  await browser.close();
})();
```

### Multi-Viewport Testing

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 }
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const timestamp = Date.now();
  
  for (const [name, size] of Object.entries(viewports)) {
    await page.setViewportSize(size);
    await page.goto('https://example.com');
    
    const screenshotPath = path.join(
      os.tmpdir(),
      `design-eval-${timestamp}-${name}.jpg`
    );
    
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    
    console.log(`${name}: ${screenshotPath}`);
  }
  
  await browser.close();
})();
```

### With Navigation (Complex Flow)

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 375, height: 667 });
  
  // Navigate to login
  await page.goto('https://example.com/login');
  
  // Fill form
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  
  // Capture before submit
  const beforePath = path.join(os.tmpdir(), `design-eval-${Date.now()}-before-submit.jpg`);
  await page.screenshot({ path: beforePath, fullPage: true });
  console.log(`Before: ${beforePath}`);
  
  // Submit form
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  // Capture after submit
  const afterPath = path.join(os.tmpdir(), `design-eval-${Date.now()}-after-submit.jpg`);
  await page.screenshot({ path: afterPath, fullPage: true });
  console.log(`After: ${afterPath}`);
  
  await browser.close();
})();
```

### Custom Output Directory

```javascript
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Use custom output directory
  const outputDir = './screenshots';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://example.com');
  
  const screenshotPath = path.join(
    outputDir,
    `design-eval-${Date.now()}-desktop.jpg`
  );
  
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true 
  });
  
  console.log(`Screenshot saved to: ${screenshotPath}`);
  
  await browser.close();
})();
```

## Viewport Presets

See [viewport-presets.md](references/viewport-presets.md) for common device sizes:
- Mobile (iPhone 12, Galaxy S21, generic)
- Tablet (iPad, iPad Pro)
- Desktop (1280px, 1920px, 2560px)

## Capture Patterns

See [capture-patterns.md](references/capture-patterns.md) for common workflows:
- Single viewport capture
- Multi-viewport responsive testing
- Navigation + capture flows
- Element-specific captures
- Comparison captures (before/after)

## Integration with Design Eval

### Feed to Accessibility Audit

```bash
# Capture screenshot
node capture.js  # outputs: /tmp/design-eval-123456-mobile.jpg

# Run accessibility audit
/design-eval:audit-accessibility --imageSource /tmp/design-eval-123456-mobile.jpg --level AA
```

### Feed to Visual Consistency Check

```bash
# Capture at desktop
node capture.js  # outputs: /tmp/design-eval-123456-desktop.jpg

# Check visual consistency
/design-eval:audit-visual-consistency --imageSource /tmp/design-eval-123456-desktop.jpg
```

## Best Practices

### 1. Use Consistent Timestamps

```javascript
const timestamp = Date.now();
// All screenshots from same run share timestamp
const mobile = `design-eval-${timestamp}-mobile.jpg`;
const desktop = `design-eval-${timestamp}-desktop.jpg`;
```

This makes it easy to group related screenshots.

### 2. Wait for Content

```javascript
// Wait for specific element
await page.waitForSelector('.main-content');

// Wait for network idle
await page.goto(url, { waitUntil: 'networkidle' });

// Wait for custom condition
await page.waitForFunction(() => {
  return document.querySelectorAll('.loaded').length > 0;
});
```

### 3. Handle Dynamic Content

```javascript
// Wait for animations to complete
await page.waitForTimeout(500);

// Disable animations for consistent captures
await page.addStyleTag({
  content: `* { animation: none !important; transition: none !important; }`
});
```

### 4. Test Responsive Behavior

```javascript
// Test at multiple breakpoints
const breakpoints = [375, 768, 1024, 1280, 1920];

for (const width of breakpoints) {
  await page.setViewportSize({ width, height: 720 });
  await page.goto(url);
  // Capture...
}
```

### 5. Capture Before Cleanup

```javascript
// Capture BEFORE closing browser
await page.screenshot({ path: screenshotPath, fullPage: true });

// Then cleanup
await browser.close();
```

## Troubleshooting

### Screenshots are blank

```javascript
// Wait for content to load
await page.waitForLoadState('networkidle');
await page.waitForSelector('body > *');
```

### Viewport size not applied

```javascript
// Set viewport BEFORE navigation
await page.setViewportSize({ width: 375, height: 667 });
await page.goto(url);  // Navigate after viewport is set
```

### File path issues on Windows

```javascript
// Use path.join() for cross-platform compatibility
const screenshotPath = path.join(os.tmpdir(), 'screenshot.jpg');
// NOT: `${os.tmpdir()}\screenshot.jpg`
```

### Temp files not cleaning up

```javascript
// /tmp/ is auto-cleaned by OS periodically
// To manually clean:
// Windows: %TEMP% folder
// macOS/Linux: /tmp/ folder

// Or save to project directory instead:
const outputDir = './screenshots';
```

## Reference Materials

- [Viewport Presets](references/viewport-presets.md) — Common device sizes
- [Capture Patterns](references/capture-patterns.md) — Common workflows
- [Playwright Docs](https://playwright.dev/docs/intro) — Official documentation
