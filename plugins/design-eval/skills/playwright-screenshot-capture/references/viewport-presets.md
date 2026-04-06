# Viewport Presets

Fixed viewport sizes for consistent screenshot capture across devices.

## Mobile Devices

### iPhone 12
- Resolution: 390×844 (physical)
- Viewport: 390×844
- Use case: Standard modern iPhone

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```

### iPhone 14 Pro Max
- Resolution: 430×932 (physical)
- Viewport: 430×932
- Use case: Large iPhone (max size)

```javascript
await page.setViewportSize({ width: 430, height: 932 });
```

### Samsung Galaxy S21
- Resolution: 360×800 (physical)
- Viewport: 360×800
- Use case: Android flagship (smaller aspect ratio)

```javascript
await page.setViewportSize({ width: 360, height: 800 });
```

### Generic Mobile
- Resolution: 375×667
- Viewport: 375×667
- Use case: Standard mobile (iPhone 6/7/8 compatible)

```javascript
await page.setViewportSize({ width: 375, height: 667 });
```

## Tablet Devices

### iPad (10.2-inch)
- Resolution: 768×1024
- Viewport: 768×1024
- Use case: Standard tablet (portrait)

```javascript
await page.setViewportSize({ width: 768, height: 1024 });
```

### iPad Landscape
- Resolution: 1024×768
- Viewport: 1024×768
- Use case: Tablet landscape orientation

```javascript
await page.setViewportSize({ width: 1024, height: 768 });
```

### iPad Pro (12.9-inch)
- Resolution: 1024×1366
- Viewport: 1024×1366
- Use case: Large tablet (portrait)

```javascript
await page.setViewportSize({ width: 1024, height: 1366 });
```

### iPad Pro Landscape
- Resolution: 1366×1024
- Viewport: 1366×1024
- Use case: Large tablet (landscape)

```javascript
await page.setViewportSize({ width: 1366, height: 1024 });
```

## Desktop Devices

### HD (1280×720)
- Resolution: 1280×720
- Viewport: 1280×720
- Use case: Small desktop / laptop
- Note: Common breakpoint in responsive design

```javascript
await page.setViewportSize({ width: 1280, height: 720 });
```

### Full HD (1920×1080)
- Resolution: 1920×1080
- Viewport: 1920×1080
- Use case: Standard desktop monitor
- Note: Most common desktop size

```javascript
await page.setViewportSize({ width: 1920, height: 1080 });
```

### Ultra HD (2560×1440)
- Resolution: 2560×1440
- Viewport: 2560×1440
- Use case: 2K/QHD monitors, modern laptops
- Note: Testing high-resolution displays

```javascript
await page.setViewportSize({ width: 2560, height: 1440 });
```

### 4K (3840×2160)
- Resolution: 3840×2160
- Viewport: 3840×2160
- Use case: 4K monitors (rare for web)
- Note: Usually unnecessary for most projects

```javascript
await page.setViewportSize({ width: 3840, height: 2160 });
```

## Recommended Testing Matrix

### Minimal (3 breakpoints)
- Mobile: 375×667
- Tablet: 768×1024
- Desktop: 1280×720

### Standard (5 breakpoints)
- Mobile: 375×667
- Large Mobile: 430×932
- Tablet: 768×1024
- Desktop: 1280×720
- Wide: 1920×1080

### Comprehensive (8+ breakpoints)
- Mobile: 360×800, 375×667, 390×844, 430×932
- Tablet: 768×1024, 1024×768, 1024×1366, 1366×1024
- Desktop: 1280×720, 1920×1080, 2560×1440

## Preset Map

Use this in scripts:

```javascript
const viewportPresets = {
  // Mobile
  'iphone-12': { width: 390, height: 844 },
  'iphone-14-pro-max': { width: 430, height: 932 },
  'galaxy-s21': { width: 360, height: 800 },
  'mobile': { width: 375, height: 667 },
  
  // Tablet
  'ipad': { width: 768, height: 1024 },
  'ipad-landscape': { width: 1024, height: 768 },
  'ipad-pro': { width: 1024, height: 1366 },
  'ipad-pro-landscape': { width: 1366, height: 1024 },
  
  // Desktop
  'hd': { width: 1280, height: 720 },
  'fhd': { width: 1920, height: 1080 },
  'uhd': { width: 2560, height: 1440 },
  '4k': { width: 3840, height: 2160 }
};

// Usage
const viewport = viewportPresets['iphone-12'];
await page.setViewportSize(viewport);
```

## Notes

- Heights are approximate (varies with browser UI)
- Use full page screenshots to capture beyond viewport
- For responsive testing, vary width; height less critical
- Device pixel ratio not simulated (use Playwright deviceDescriptors for that)
- Test at actual content breakpoints, not just device sizes
