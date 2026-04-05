# Visual Regression Testing Patterns

## Baseline Establishment Workflow

### Initial Baseline Creation

```javascript
// 1. Create baseline directory structure
const baselineDir = 'baselines/';
const components = ['button', 'card', 'modal', 'form'];

// 2. Capture baseline screenshots
for (const component of components) {
  await page.goto(`/components/${component}`);
  
  // Capture at multiple breakpoints
  for (const [name, viewport] of Object.entries(viewports)) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: `${baselineDir}/${component}-${name}.png`
    });
  }
}

// 3. Commit baselines to version control
// git add baselines/
// git commit -m "chore: add visual regression baselines"
```

### Baseline Metadata

Store metadata alongside baselines:

```json
{
  "baselines/metadata.json": {
    "created": "2026-04-06T12:00:00Z",
    "browser": "chromium",
    "os": "linux",
    "viewports": {
      "mobile": { "width": 375, "height": 667 },
      "tablet": { "width": 768, "height": 1024 },
      "desktop": { "width": 1280, "height": 720 }
    },
    "components": ["button", "card", "modal", "form"],
    "notes": "Initial baseline for design system v1.0"
  }
}
```

## Regression Detection Workflow

### Automated Comparison

```javascript
const fs = require('fs');
const pixelmatch = require('pixelmatch');
const PNG = require('pngjs').PNG;

async function detectRegressions() {
  const baselineDir = 'baselines/';
  const currentDir = 'screenshots/';
  const regressions = [];
  
  // Get all baseline files
  const baselines = fs.readdirSync(baselineDir)
    .filter(f => f.endsWith('.png'));
  
  for (const baseline of baselines) {
    const baselinePath = `${baselineDir}/${baseline}`;
    const currentPath = `${currentDir}/${baseline}`;
    
    if (!fs.existsSync(currentPath)) {
      regressions.push({
        file: baseline,
        type: 'missing',
        severity: 'high'
      });
      continue;
    }
    
    // Compare images
    const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
    const img2 = PNG.sync.read(fs.readFileSync(currentPath));
    
    if (img1.width !== img2.width || img1.height !== img2.height) {
      regressions.push({
        file: baseline,
        type: 'size-mismatch',
        baseline: { width: img1.width, height: img1.height },
        current: { width: img2.width, height: img2.height },
        severity: 'high'
      });
      continue;
    }
    
    // Pixel-by-pixel comparison
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
    
    if (percentDifferent > 1) {
      regressions.push({
        file: baseline,
        type: 'visual-change',
        percentDifferent,
        diffPixels: numDiffPixels,
        severity: percentDifferent > 5 ? 'high' : 'medium'
      });
      
      // Save diff image for review
      fs.writeFileSync(
        `diffs/${baseline}`,
        PNG.sync.write(diff)
      );
    }
  }
  
  return regressions;
}
```

### Threshold Configuration

```javascript
// Define acceptable thresholds
const thresholds = {
  antialiasing: 0.1,      // Allow minor rendering differences
  minor: 1,               // Minor visual changes
  moderate: 5,            // Moderate changes, needs review
  major: 10               // Major changes, likely regression
};

function assessSeverity(percentDifferent) {
  if (percentDifferent < thresholds.antialiasing) return 'none';
  if (percentDifferent < thresholds.minor) return 'low';
  if (percentDifferent < thresholds.moderate) return 'medium';
  if (percentDifferent < thresholds.major) return 'high';
  return 'critical';
}
```

## Handling False Positives

### Anti-aliasing Differences

**Problem:** Different rendering engines produce slightly different anti-aliasing

**Solution:**
```javascript
// Use threshold to ignore minor pixel differences
const diff = pixelmatch(img1.data, img2.data, diffOutput.data, width, height, {
  threshold: 0.1  // Allow 10% color difference per pixel
});
```

### Font Rendering

**Problem:** Different OS/browser combinations render fonts differently

**Solution:**
```javascript
// Capture on consistent environment (Docker container)
// Use specific font versions
// Allow slightly higher threshold for text
```

### Timing Issues

**Problem:** Animations or async content cause inconsistent screenshots

**Solution:**
```javascript
// Wait for animations to complete
await page.waitForLoadState('networkidle');

// Disable animations for consistent screenshots
await page.addStyleTag({
  content: `
    * {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `
});

// Wait for specific elements
await page.locator('.component').waitFor({ state: 'visible' });
```

## Approval Workflow

### Manual Review Process

```javascript
// 1. Generate diff images for review
// 2. Create PR with diffs
// 3. Reviewer examines diffs
// 4. If approved: update baselines
// 5. If rejected: fix code and re-run

async function approveRegressions(regressions) {
  const approved = [];
  
  for (const regression of regressions) {
    // Show diff to reviewer
    console.log(`Review: ${regression.file}`);
    console.log(`Change: ${regression.percentDifferent}%`);
    
    // In CI: require manual approval
    // In local: prompt user
    const approved = await promptUser(`Approve ${regression.file}?`);
    
    if (approved) {
      // Copy current to baseline
      fs.copyFileSync(
        `screenshots/${regression.file}`,
        `baselines/${regression.file}`
      );
    }
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/visual-regression.yml
name: Visual Regression Tests

on: [pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: npm install
      
      - name: Capture screenshots
        run: npm run test:visual:capture
      
      - name: Compare to baselines
        run: npm run test:visual:compare
      
      - name: Upload diffs
        if: failure()
        uses: actions/upload-artifact@v2
        with:
          name: visual-diffs
          path: diffs/
      
      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ Visual regression detected. Review diffs in artifacts.'
            })
```

## Maintenance Patterns

### Updating Baselines

```javascript
// When intentional design changes are made:
// 1. Review the visual changes
// 2. Verify they match design intent
// 3. Update baselines

async function updateBaselines(components) {
  for (const component of components) {
    await page.goto(`/components/${component}`);
    
    for (const [name, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);
      await page.screenshot({
        path: `baselines/${component}-${name}.png`
      });
    }
  }
  
  // Commit updated baselines
  // git add baselines/
  // git commit -m "chore: update visual baselines for design changes"
}
```

### Baseline Cleanup

```javascript
// Remove baselines for deleted components
const existingComponents = fs.readdirSync('src/components');
const baselineFiles = fs.readdirSync('baselines/');

for (const file of baselineFiles) {
  const component = file.split('-')[0];
  if (!existingComponents.includes(component)) {
    fs.unlinkSync(`baselines/${file}`);
  }
}
```

## Performance Optimization

### Parallel Screenshot Capture

```javascript
const Promise = require('bluebird');

async function captureScreenshotsParallel(components) {
  await Promise.map(
    components,
    async (component) => {
      const page = await browser.newPage();
      await page.goto(`/components/${component}`);
      
      for (const [name, viewport] of Object.entries(viewports)) {
        await page.setViewportSize(viewport);
        await page.screenshot({
          path: `screenshots/${component}-${name}.png`
        });
      }
      
      await page.close();
    },
    { concurrency: 4 }  // 4 pages in parallel
  );
}
```

### Incremental Testing

```javascript
// Only test changed components
const changedFiles = await getChangedFiles();
const changedComponents = extractComponents(changedFiles);

for (const component of changedComponents) {
  await captureScreenshot(component);
  await compareToBaseline(component);
}
```

## Troubleshooting

### Size Mismatches

**Problem:** Screenshot dimensions don't match baseline

**Cause:** Viewport size changed, content reflow

**Solution:**
```javascript
// Verify viewport is set correctly
console.log(await page.viewportSize());

// Ensure content is fully loaded
await page.waitForLoadState('networkidle');
```

### Flaky Tests

**Problem:** Same component produces different screenshots

**Cause:** Timing issues, animations, random content

**Solution:**
```javascript
// Disable animations
await page.addStyleTag({
  content: `* { animation: none !important; transition: none !important; }`
});

// Wait for specific elements
await page.locator('[data-test="component"]').waitFor();

// Use fixed seeds for random content
Math.seedrandom('fixed-seed');
```

### Memory Issues

**Problem:** Running out of memory with many screenshots

**Solution:**
```javascript
// Close pages between captures
for (const component of components) {
  const page = await browser.newPage();
  // ... capture ...
  await page.close();  // Free memory
}

// Use streaming for large diffs
const stream = fs.createWriteStream('diff.png');
PNG.sync.write(diff).pipe(stream);
```
