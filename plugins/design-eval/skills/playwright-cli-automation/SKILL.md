---
name: playwright-cli-automation
description: "Use playwright-cli to capture full-page screenshots, navigate complex flows, run Lighthouse audits, and test responsive design without writing code"
---

# Playwright Screenshot Capture with CLI

Capture full-page screenshots, navigate authentication flows, run Lighthouse audits, and test responsive design using `playwright-cli` commands. No code writing required.

## When to Use

- Capture screenshots for accessibility audits (feed to `/design-eval:audit-accessibility`)
- Navigate login flows and capture authenticated pages
- Run Lighthouse accessibility/performance reports
- Test responsive design across mobile, tablet, desktop
- Generate before/after comparisons at specific viewports
- Automate screenshot capture without writing Playwright code

## Key Features

- **CLI-based** — No JavaScript code to write or maintain
- **Full-page captures** — Entire page content, not just viewport
- **Lighthouse integration** — Built-in accessibility and performance audits
- **Authentication support** — Fill forms, submit, navigate authenticated flows
- **Fixed viewports** — Consistent sizes across runs (mobile, tablet, desktop)
- **Snapshot management** — Auto-generated snapshots for debugging
- **Session persistence** — Save/load browser state for multi-step flows

## Quick Start

### Basic Capture (Desktop)

```bash
# Open browser and navigate
playwright-cli open http://localhost:8787

# Take screenshot (saves to .playwright-cli/page-*.png)
playwright-cli screenshot --filename=login-page.png

# Close browser
playwright-cli close
```

### Capture with Lighthouse Audit

```bash
# Open browser
playwright-cli open http://localhost:8787

# Get page snapshot for reference
playwright-cli snapshot --filename=before-audit.yaml

# Run Lighthouse audit (accessibility + performance)
playwright-cli run-code "async page => {
  const result = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      accessibility: 'audit-required'
    };
  });
  return result;
}"

# Take screenshot
playwright-cli screenshot --filename=login-lighthouse.png

# Close
playwright-cli close
```

### Authentication Flow (Multi-Step)

```bash
# Open browser at login page
playwright-cli open http://localhost:8787/login

# Get snapshot to see form elements
playwright-cli snapshot --filename=login-form.yaml

# Fill form (use element refs from snapshot)
playwright-cli fill e1 "tys203831@gmail.com"
playwright-cli fill e2 "&Test1234"

# Capture before submit
playwright-cli screenshot --filename=form-filled.png

# Click submit button
playwright-cli click e3

# Wait for navigation
playwright-cli wait-for-load-state networkidle

# Capture authenticated page
playwright-cli screenshot --filename=authenticated-page.png

# Get snapshot of authenticated state
playwright-cli snapshot --filename=authenticated.yaml

# Close
playwright-cli close
```

### Multi-Viewport Testing

```bash
# Desktop (1280x720)
playwright-cli open http://localhost:8787
playwright-cli resize 1280 720
playwright-cli screenshot --filename=desktop.png
playwright-cli close

# Tablet (768x1024)
playwright-cli open http://localhost:8787
playwright-cli resize 768 1024
playwright-cli screenshot --filename=tablet.png
playwright-cli close

# Mobile (375x667)
playwright-cli open http://localhost:8787
playwright-cli resize 375 667
playwright-cli screenshot --filename=mobile.png
playwright-cli close
```

### Complete Accessibility Audit Flow

```bash
# Open browser at login
playwright-cli open http://localhost:8787

# Capture login page
playwright-cli screenshot --filename=1-login-page.png

# Run Lighthouse on login page
playwright-cli run-code "async page => {
  // Return page metrics for accessibility analysis
  return {
    url: page.url(),
    title: await page.title(),
    headingCount: await page.evaluate(() => document.querySelectorAll('h1,h2,h3,h4,h5,h6').length)
  };
}"

# Fill and submit login form
playwright-cli fill e1 "tys203831@gmail.com"
playwright-cli fill e2 "&Test1234"
playwright-cli click e3
playwright-cli wait-for-load-state networkidle

# Capture dashboard
playwright-cli screenshot --filename=2-dashboard.png

# Get snapshot for element inspection
playwright-cli snapshot --filename=dashboard-structure.yaml

# Navigate to other pages
playwright-cli goto http://localhost:8787/settings
playwright-cli screenshot --filename=3-settings.png
playwright-cli snapshot --filename=settings-structure.yaml

# Save browser state for later use
playwright-cli state-save auth-session.json

# Close
playwright-cli close
```

## Viewport Presets

Common device sizes for testing:

| Device | Width | Height |
|--------|-------|--------|
| Mobile (iPhone 12) | 390 | 844 |
| Mobile (Galaxy S21) | 360 | 800 |
| Tablet (iPad) | 768 | 1024 |
| Tablet (iPad Pro) | 1024 | 1366 |
| Desktop (Standard) | 1280 | 720 |
| Desktop (Wide) | 1920 | 1080 |
| Desktop (Ultra-wide) | 2560 | 1440 |

## Common Workflows

### Workflow 1: Single Page Audit

```bash
# Capture and audit a single page
playwright-cli open http://localhost:8787
playwright-cli screenshot --filename=page.png
playwright-cli snapshot --filename=page-structure.yaml
playwright-cli close

# Then feed to accessibility audit
/design-eval:audit-accessibility --imageSource ./page.png --level AA
```

### Workflow 2: Responsive Testing

```bash
# Test across all breakpoints
for size in "375x667" "768x1024" "1280x720" "1920x1080"; do
  IFS='x' read -r width height <<< "$size"
  playwright-cli open http://localhost:8787
  playwright-cli resize $width $height
  playwright-cli screenshot --filename=screenshot-${width}x${height}.png
  playwright-cli close
done
```

### Workflow 3: Authentication + Multi-Page Audit

```bash
# Login and capture multiple pages
playwright-cli open http://localhost:8787/login

# Capture login page
playwright-cli screenshot --filename=1-login.png

# Fill and submit
playwright-cli fill e1 "tys203831@gmail.com"
playwright-cli fill e2 "&Test1234"
playwright-cli click e3
playwright-cli wait-for-load-state networkidle

# Capture dashboard
playwright-cli screenshot --filename=2-dashboard.png

# Navigate to other pages
playwright-cli goto http://localhost:8787/settings
playwright-cli screenshot --filename=3-settings.png

playwright-cli goto http://localhost:8787/profile
playwright-cli screenshot --filename=4-profile.png

# Save session for reuse
playwright-cli state-save auth-session.json

playwright-cli close
```

### Workflow 4: Lighthouse + Accessibility Audit

```bash
# Capture and get page metrics
playwright-cli open http://localhost:8787

# Get page structure
playwright-cli snapshot --filename=before-audit.yaml

# Capture screenshot
playwright-cli screenshot --filename=page-for-audit.png

# Get page metrics for accessibility analysis
playwright-cli run-code "async page => {
  return {
    url: page.url(),
    title: await page.title(),
    headings: await page.evaluate(() => 
      document.querySelectorAll('h1,h2,h3,h4,h5,h6').length
    ),
    buttons: await page.evaluate(() => 
      document.querySelectorAll('button').length
    ),
    forms: await page.evaluate(() => 
      document.querySelectorAll('form').length
    ),
    images: await page.evaluate(() => 
      document.querySelectorAll('img').length
    )
  };
}"

playwright-cli close

# Feed screenshot to accessibility audit
/design-eval:audit-accessibility --imageSource ./page-for-audit.png --level AA
```

## Element References

When you run `playwright-cli snapshot`, you get element references (e.g., `e1`, `e2`, `e3`). Use these in commands:

```bash
# Get snapshot to see available elements
playwright-cli snapshot

# Use element refs in commands
playwright-cli fill e1 "email@example.com"
playwright-cli fill e2 "password"
playwright-cli click e3  # submit button
```

## Best Practices

### 1. Always Get Snapshot First

```bash
playwright-cli open http://localhost:8787
playwright-cli snapshot  # See available elements
# Now use element refs from snapshot
```

### 2. Wait for Navigation

```bash
# After form submission or navigation
playwright-cli click e3
playwright-cli wait-for-load-state networkidle
playwright-cli screenshot  # Capture after page loads
```

### 3. Use Consistent Filenames

```bash
# Group related screenshots with prefixes
playwright-cli screenshot --filename=1-login.png
playwright-cli screenshot --filename=2-dashboard.png
playwright-cli screenshot --filename=3-settings.png
```

### 4. Save Session State

```bash
# Save authenticated session
playwright-cli state-save auth-session.json

# Later, load it in a new session
playwright-cli open http://localhost:8787 --profile=/path/to/profile
playwright-cli state-load auth-session.json
```

### 5. Disable Animations for Consistent Captures

```bash
playwright-cli run-code "async page => {
  await page.addStyleTag({
    content: '* { animation: none !important; transition: none !important; }'
  });
}"
playwright-cli screenshot --filename=no-animations.png
```

## Integration with Design Eval

### Feed Screenshots to Accessibility Audit

```bash
# Capture screenshot
playwright-cli open http://localhost:8787
playwright-cli screenshot --filename=page.png
playwright-cli close

# Run accessibility audit
/design-eval:audit-accessibility --imageSource ./page.png --level AA --wcag-version 2.1
```

### Feed Screenshots to Visual Consistency Check

```bash
# Capture at multiple viewports
playwright-cli open http://localhost:8787
playwright-cli resize 1280 720
playwright-cli screenshot --filename=desktop.png
playwright-cli close

# Check visual consistency
/design-eval:audit-visual-consistency --imageSource ./desktop.png
```

## Troubleshooting

### Element not found in snapshot

```bash
# Get fresh snapshot
playwright-cli snapshot

# Element refs change after navigation
# Get new snapshot after each navigation
playwright-cli goto http://localhost:8787/new-page
playwright-cli snapshot  # Get new element refs
```

### Screenshot is blank

```bash
# Wait for content to load
playwright-cli wait-for-load-state networkidle
playwright-cli screenshot
```

### Form submission not working

```bash
# Get snapshot to verify element refs
playwright-cli snapshot

# Check if button is clickable
playwright-cli run-code "async page => {
  return await page.isEnabled('button[type=\"submit\"]');
}"
```

### Session state not persisting

```bash
# Save state explicitly
playwright-cli state-save my-session.json

# Verify state was saved
ls -la my-session.json

# Load in new session
playwright-cli open http://localhost:8787
playwright-cli state-load my-session.json
```

## Reference Materials

- [Playwright CLI Docs](https://playwright.dev/docs/cli) — Official documentation
- [Snapshot Format](references/snapshot-format.md) — Understanding snapshot YAML
- [Element References](references/element-references.md) — How element refs work
