# Capture Patterns

Common workflows for capturing screenshots with Playwright.

## Pattern 1: Single Viewport Capture

Capture a single page at one viewport size.

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewportSize({ width: 1280, height: 720 });
  
  // Navigate
  await page.goto('https://example.com');
  
  // Wait for content
  await page.waitForLoadState('networkidle');
  
  // Capture
  const timestamp = Date.now();
  const screenshotPath = path.join(
    os.tmpdir(),
    `design-eval-${timestamp}-desktop.jpg`
  );
  
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true 
  });
  
  console.log(`Screenshot: ${screenshotPath}`);
  
  await browser.close();
})();
```

**Use case:** Quick screenshot for accessibility audit, visual consistency check, or design review.

---

## Pattern 2: Multi-Viewport Responsive Testing

Test the same page at multiple breakpoints.

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
  const timestamp = Date.now();
  
  for (const [name, size] of Object.entries(viewports)) {
    const page = await browser.newPage();
    
    await page.setViewportSize(size);
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');
    
    const screenshotPath = path.join(
      os.tmpdir(),
      `design-eval-${timestamp}-${name}.jpg`
    );
    
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    
    console.log(`${name}: ${screenshotPath}`);
    
    await page.close();
  }
  
  await browser.close();
})();
```

**Use case:** Test responsive design across breakpoints, validate layout at mobile/tablet/desktop.

---

## Pattern 3: Navigation + Capture (Complex Flow)

Navigate through a user flow, capturing at key steps.

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const timestamp = Date.now();
  
  await page.setViewportSize({ width: 375, height: 667 });
  
  // Step 1: Login page
  await page.goto('https://example.com/login');
  await page.waitForLoadState('networkidle');
  
  let screenshotPath = path.join(
    os.tmpdir(),
    `design-eval-${timestamp}-01-login.jpg`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Step 1 - Login: ${screenshotPath}`);
  
  // Step 2: Fill form
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  
  screenshotPath = path.join(
    os.tmpdir(),
    `design-eval-${timestamp}-02-form-filled.jpg`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Step 2 - Form filled: ${screenshotPath}`);
  
  // Step 3: Submit
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  screenshotPath = path.join(
    os.tmpdir(),
    `design-eval-${timestamp}-03-dashboard.jpg`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Step 3 - Dashboard: ${screenshotPath}`);
  
  await browser.close();
})();
```

**Use case:** Capture user flows (login, checkout, form submission) for accessibility testing at each step.

---

## Pattern 4: Before/After Comparison

Capture the same page before and after an interaction.

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const timestamp = Date.now();
  
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://example.com/modal-demo');
  await page.waitForLoadState('networkidle');
  
  // Before: Closed modal
  let screenshotPath = path.join(
    os.tmpdir(),
    `design-eval-${timestamp}-before-modal.jpg`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Before: ${screenshotPath}`);
  
  // Interact: Open modal
  await page.click('button[aria-label="Open modal"]');
  await page.waitForSelector('[role="dialog"]');
  
  // After: Open modal
  screenshotPath = path.join(
    os.tmpdir(),
    `design-eval-${timestamp}-after-modal.jpg`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`After: ${screenshotPath}`);
  
  await browser.close();
})();
```

**Use case:** Compare UI states (modal open/closed, menu expanded/collapsed, form valid/invalid).

---

## Pattern 5: Element-Specific Capture

Capture a specific element instead of full page.

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://example.com');
  await page.waitForLoadState('networkidle');
  
  // Capture specific element
  const element = await page.$('.component-card');
  
  const timestamp = Date.now();
  const screenshotPath = path.join(
    os.tmpdir(),
    `design-eval-${timestamp}-component.jpg`
  );
  
  await element.screenshot({ path: screenshotPath });
  console.log(`Component: ${screenshotPath}`);
  
  await browser.close();
})();
```

**Use case:** Audit individual components (buttons, cards, forms) in isolation.

---

## Pattern 6: Disable Animations

Capture consistent screenshots by disabling animations.

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 720 });
  
  // Disable animations before navigation
  await page.addStyleTag({
    content: `
      * {
        animation: none !important;
        transition: none !important;
      }
    `
  });
  
  await page.goto('https://example.com');
  await page.waitForLoadState('networkidle');
  
  const timestamp = Date.now();
  const screenshotPath = path.join(
    os.tmpdir(),
    `design-eval-${timestamp}-no-animations.jpg`
  );
  
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot: ${screenshotPath}`);
  
  await browser.close();
})();
```

**Use case:** Consistent screenshots for comparison (animations can vary between runs).

---

## Pattern 7: Wait for Specific Content

Wait for dynamic content before capturing.

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://example.com/data-table');
  
  // Wait for table to load
  await page.waitForSelector('table tbody tr');
  
  // Wait for specific number of rows
  await page.waitForFunction(() => {
    return document.querySelectorAll('table tbody tr').length >= 10;
  });
  
  const timestamp = Date.now();
  const screenshotPath = path.join(
    os.tmpdir(),
    `design-eval-${timestamp}-table-loaded.jpg`
  );
  
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot: ${screenshotPath}`);
  
  await browser.close();
})();
```

**Use case:** Capture pages with dynamic content (data tables, infinite scroll, lazy-loaded images).

---

## Pattern 8: Custom Output Directory

Save screenshots to project directory instead of temp.

```javascript
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Create output directory
  const outputDir = './screenshots';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://example.com');
  await page.waitForLoadState('networkidle');
  
  const screenshotPath = path.join(
    outputDir,
    `design-eval-${Date.now()}-desktop.jpg`
  );
  
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot: ${screenshotPath}`);
  
  await browser.close();
})();
```

**Use case:** Save screenshots to project for version control, CI/CD pipelines, or design reviews.

---

## Pattern 9: Batch Capture (Multiple URLs)

Capture multiple pages in one script.

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const urls = [
  'https://example.com/',
  'https://example.com/about',
  'https://example.com/contact'
];

(async () => {
  const browser = await chromium.launch();
  const timestamp = Date.now();
  
  for (let i = 0; i < urls.length; i++) {
    const page = await browser.newPage();
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(urls[i]);
    await page.waitForLoadState('networkidle');
    
    const pageName = urls[i].split('/').pop() || 'home';
    const screenshotPath = path.join(
      os.tmpdir(),
      `design-eval-${timestamp}-${i.toString().padStart(2, '0')}-${pageName}.jpg`
    );
    
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`${pageName}: ${screenshotPath}`);
    
    await page.close();
  }
  
  await browser.close();
})();
```

**Use case:** Audit entire site or multiple pages at once.

---

## Pattern 10: Error State Capture

Capture pages with validation errors or error messages.

```javascript
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const timestamp = Date.now();
  
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('https://example.com/form');
  await page.waitForLoadState('networkidle');
  
  // Submit empty form to trigger validation
  await page.click('button[type="submit"]');
  
  // Wait for error messages
  await page.waitForSelector('[role="alert"]');
  
  const screenshotPath = path.join(
    os.tmpdir(),
    `design-eval-${timestamp}-form-errors.jpg`
  );
  
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Error state: ${screenshotPath}`);
  
  await browser.close();
})();
```

**Use case:** Test accessibility of error messages, validation feedback, and error states.

---

## Tips

- **Use consistent timestamps** — Group related screenshots with same timestamp
- **Number steps** — Use `01-`, `02-`, `03-` prefixes for multi-step flows
- **Wait for content** — Always use `waitForLoadState()` or `waitForSelector()` before capturing
- **Disable animations** — For consistent comparisons, disable CSS animations
- **Use full-page** — Always use `fullPage: true` to capture entire page, not just viewport
- **Close pages** — Call `page.close()` after each capture to free memory
- **Error handling** — Wrap in try/catch for production scripts
