# Image Format Handling: Comprehensive Edge Case Analysis

**Date:** 2026-04-05  
**Scope:** audit_design tool + pixel analysis + provider image handling  
**Status:** Analysis for future implementation

---

## Executive Summary

Current implementation uses **FFmpeg-based conversion** for unsupported formats (AVIF, HEIC, HEIF, WebP). While functional, this approach has significant edge cases and environmental dependencies. The project has `@jsquash/avif` in dependencies but doesn't use it. This analysis identifies gaps and proposes solutions.

---

## Current Implementation State

### What Works
- ✅ PNG, JPEG, BMP, GIF, TIFF via imagescript
- ✅ WebP detection + FFmpeg conversion
- ✅ AVIF/HEIC/HEIF detection via ISO-BMFF magic bytes
- ✅ FFmpeg conversion to JPEG fallback
- ✅ Graceful degradation (skips pixel analysis if format unsupported)

### What's Missing
- ❌ No sharp library integration (already in many Node projects)
- ❌ FFmpeg availability not validated at startup
- ❌ Temporary file cleanup issues on Windows (rmdir vs rm -rf)
- ❌ MIME type detection incomplete (missing modern formats)
- ❌ No format validation before conversion attempt
- ❌ @jsquash/avif unused despite being in dependencies

---

## Edge Cases & Failure Scenarios

### 1. **FFmpeg Not Installed**
**Scenario:** User runs on system without FFmpeg  
**Current Behavior:** `execSync` throws error, caught and logged  
**Impact:** audit_design falls back to Gemini vision-only (acceptable but silent)  
**Risk:** User doesn't know why pixel analysis failed  

**Test Case:**
```bash
# Simulate missing FFmpeg
export PATH=""
# Try to audit AVIF image → should gracefully degrade
```

---

### 2. **Temporary File Cleanup Failures**
**Scenario:** Windows file locking or permission issues  
**Current Code:** `execSync('rmdir "${tempDir}"', { stdio: 'pipe' })`  
**Problem:** 
- `rmdir` only removes empty directories
- On Windows, file handles may still be open
- Silently fails (caught in try-catch)
- Temp files accumulate over time

**Test Case:**
```typescript
// Run 100 AVIF conversions → check temp directory
// Expected: temp files cleaned up
// Actual: temp files may persist
```

**Better Approach:**
```typescript
// Use fs.rmSync with recursive flag
import { rmSync } from 'fs';
rmSync(tempDir, { recursive: true, force: true });
```

---

### 3. **MIME Type Detection Gaps**
**Current Detection:**
```typescript
const signatures: Record<string, string> = {
  'image/png': '\x89PNG\r\n\x1a\n',
  'image/jpeg': '\xff\xd8\xff',
  'image/gif': 'GIF87a',
  'image/webp': 'RIFF',
};
```

**Missing Formats:**
- AVIF (detected via ISO-BMFF, but not in signatures)
- HEIC/HEIF (detected via ISO-BMFF, but not in signatures)
- TIFF (big-endian: `MM\x00*`, little-endian: `II*\x00`)
- ICO (magic: `\x00\x00\x01\x00`)
- SVG (text-based, starts with `<svg`)
- APNG (PNG variant, needs frame detection)

**Test Case:**
```typescript
// Test TIFF detection
const tiffBE = Buffer.from([0x4d, 0x4d, 0x00, 0x2a]); // MM\x00*
const tiffLE = Buffer.from([0x49, 0x49, 0x2a, 0x00]); // II*\x00
getImageMimeType('test.tiff', tiffBE); // Returns 'image/jpeg' (WRONG)
```

---

### 4. **ISO-BMFF Brand Code Incomplete**
**Current Brands:**
```typescript
const brandMap: Record<string, string> = {
  avif: 'AVIF',
  mif1: 'HEIF',
  heic: 'HEIC',
  heix: 'HEIC',
  hevc: 'HEIC',
};
```

**Missing Variants:**
- `av01` - AVIF (primary brand)
- `avis` - AVIF sequence
- `mif1` - HEIF (modern)
- `heix` - HEIC extended
- `hevc` - HEVC video
- `mj2s` - Motion JPEG 2000

**Test Case:**
```typescript
// Real AVIF file uses 'av01' brand, not 'avif'
const realAvif = Buffer.from([
  0x00, 0x00, 0x00, 0x20, // size
  0x66, 0x74, 0x79, 0x70, // 'ftyp'
  0x61, 0x76, 0x30, 0x31, // 'av01' ← This is the real brand
  // ...
]);
detectISOBMFFFormat(realAvif); // Returns null (WRONG)
```

---

### 5. **FFmpeg Conversion Quality Loss**
**Current Setting:** `-q:v 2` (high quality)  
**Issues:**
- JPEG quality loss on every conversion
- No metadata preservation
- No color space handling
- Slow for large images

**Test Case:**
```bash
# Convert AVIF → JPEG → Compare quality
# Original: 2MB AVIF
# After conversion: 5MB JPEG (larger, lower quality)
```

---

### 6. **Large Image Handling**
**Scenario:** 50MB+ AVIF image  
**Current Behavior:**
- Loads entire buffer into memory
- Writes to temp file
- Runs FFmpeg (spawns subprocess)
- Reads converted JPEG back into memory
- Cleanup

**Memory Impact:** 3x file size in memory (original + temp + converted)  
**Risk:** OOM on systems with limited RAM

**Test Case:**
```typescript
// Create 100MB AVIF
// Try to audit → should handle gracefully or fail with clear error
```

---

### 7. **Concurrent Conversion Races**
**Scenario:** Multiple audit_design calls with same AVIF simultaneously  
**Current Behavior:**
```typescript
const tempDir = mkdtempSync(join(tmpdir(), 'img-convert-'));
// Two processes might create same temp dir
```

**Risk:** File conflicts, cleanup issues  
**Test Case:**
```typescript
// Run 10 concurrent audit_design calls with same AVIF
// Expected: All succeed
// Actual: May have race conditions
```

---

### 8. **Unsupported Format Fallback Silent Failure**
**Current Code:**
```typescript
try {
  metrics = await computeDesignMetrics(imageBuffer);
} catch (metricsError) {
  if (metricsError instanceof Error) {
    const message = metricsError.message.toLowerCase();
    if (message.includes('format detected') || message.includes('unsupported')) {
      console.error(`[audit_design] ${metricsError.message}`);
      metrics = null; // Silent fallback
    }
  }
}
```

**Issue:** User doesn't know pixel analysis was skipped  
**Better:** Include in response that pixel analysis was unavailable

---

### 9. **Data URI Format Handling**
**Current Code:**
```typescript
if (processedImageSource.startsWith('data:image/')) {
  const base64Data = processedImageSource.split(',')[1];
  imageBuffer = Buffer.from(base64Data, 'base64');
}
```

**Edge Cases:**
- Malformed data URI (missing comma)
- Invalid base64 encoding
- Unsupported MIME type in data URI
- Very large data URIs (>100MB)

**Test Case:**
```typescript
// Malformed data URI
const malformed = 'data:image/avif;base64,INVALID!!!';
// Should fail gracefully, not crash
```

---

### 10. **Provider-Specific Format Handling Parity**
**GeminiProvider vs VertexAIProvider:**
- GeminiProvider: Uploads HTTP images to Files API
- VertexAIProvider: Uses inline data for HTTP images
- Both: Different handling of unsupported formats

**Risk:** Inconsistent behavior between providers  
**Test Case:**
```typescript
// Same AVIF image
// Analyze with Gemini provider → works
// Analyze with VertexAI provider → different result?
```

---

## Recommended Solutions

### Solution 1: Add Sharp Library (Recommended)
**Why:** Sharp is battle-tested, widely used, handles all formats  
**Cost:** +2.5MB dependency  
**Benefit:** Replaces FFmpeg dependency, faster, more reliable

```typescript
import sharp from 'sharp';

async function convertToJpegViaSharp(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();
  } catch (error) {
    throw new Error(`Sharp conversion failed: ${error.message}`);
  }
}
```

**Implementation:**
1. Add `sharp` to dependencies
2. Replace FFmpeg conversion with sharp
3. Remove FFmpeg dependency
4. Update error messages

---

### Solution 2: Use @jsquash/avif (Already Installed)
**Why:** Already in dependencies, WASM-based, no native deps  
**Limitation:** Only handles AVIF, not HEIC/HEIF  
**Benefit:** Lightweight, works in browser too

```typescript
import { decode } from '@jsquash/avif';

async function decodeAvif(buffer: Buffer): Promise<ImageData> {
  const decoded = await decode(buffer);
  return decoded;
}
```

---

### Solution 3: Improve Format Detection
**Add comprehensive magic byte detection:**

```typescript
function detectImageFormat(buffer: Buffer): string | null {
  const signatures = [
    { sig: [0x89, 0x50, 0x4e, 0x47], type: 'image/png' },
    { sig: [0xff, 0xd8, 0xff], type: 'image/jpeg' },
    { sig: [0x47, 0x49, 0x46], type: 'image/gif' },
    { sig: [0x52, 0x49, 0x46, 0x46], type: 'image/webp', offset: 8, check: [0x57, 0x45, 0x42, 0x50] },
    { sig: [0x4d, 0x4d, 0x00, 0x2a], type: 'image/tiff' }, // Big-endian
    { sig: [0x49, 0x49, 0x2a, 0x00], type: 'image/tiff' }, // Little-endian
    { sig: [0x00, 0x00, 0x01, 0x00], type: 'image/x-icon' },
  ];

  for (const { sig, type, offset = 0, check } of signatures) {
    if (buffer.length < offset + sig.length) continue;
    
    const match = sig.every((byte, i) => buffer[offset + i] === byte);
    if (match) {
      if (check) {
        const checkMatch = check.every((byte, i) => buffer[offset + sig.length + i] === byte);
        if (checkMatch) return type;
      } else {
        return type;
      }
    }
  }

  return null;
}
```

---

### Solution 4: Validate FFmpeg at Startup
**Add health check:**

```typescript
function validateFFmpegAvailable(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// In ConfigService or startup
if (!validateFFmpegAvailable()) {
  console.warn('[pixelAnalysis] FFmpeg not found. AVIF/HEIC conversion will be unavailable.');
}
```

---

### Solution 5: Improve Temporary File Cleanup
**Use proper cleanup:**

```typescript
import { rmSync } from 'fs';

function convertToJpegViaFFmpeg(buffer: Buffer): Buffer {
  const tempDir = mkdtempSync(join(tmpdir(), 'img-convert-'));
  const inputPath = join(tempDir, 'input');
  const outputPath = join(tempDir, 'output.jpg');

  try {
    writeFileSync(inputPath, buffer);
    execSync(`ffmpeg -y -i "${inputPath}" -q:v 2 "${outputPath}"`, {
      stdio: 'pipe',
      encoding: 'buffer',
    });
    return readFileSync(outputPath);
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`[pixelAnalysis] Failed to cleanup temp dir: ${tempDir}`);
    }
  }
}
```

---

### Solution 6: Add Format Support Matrix
**Document what works where:**

```typescript
const FORMAT_SUPPORT = {
  'image/png': { imagescript: true, sharp: true, ffmpeg: true },
  'image/jpeg': { imagescript: true, sharp: true, ffmpeg: true },
  'image/webp': { imagescript: false, sharp: true, ffmpeg: true },
  'image/avif': { imagescript: false, sharp: true, ffmpeg: true, jsquash: true },
  'image/heic': { imagescript: false, sharp: true, ffmpeg: true },
  'image/heif': { imagescript: false, sharp: true, ffmpeg: true },
  'image/tiff': { imagescript: true, sharp: true, ffmpeg: true },
};
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('Image Format Detection', () => {
  it('detects AVIF with av01 brand', () => {
    const avif = createAVIFBuffer('av01');
    expect(detectISOBMFFFormat(avif)).toBe('AVIF');
  });

  it('detects TIFF big-endian', () => {
    const tiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a]);
    expect(detectImageFormat(tiff)).toBe('image/tiff');
  });

  it('handles malformed data URI', () => {
    expect(() => parseDataUri('data:image/avif;base64,INVALID')).toThrow();
  });
});
```

### Integration Tests
```typescript
describe('audit_design with unsupported formats', () => {
  it('gracefully degrades AVIF without FFmpeg', async () => {
    // Mock FFmpeg unavailable
    const result = await audit_design(avifImage, config, provider, fileService);
    expect(result.metrics).toBeNull();
    expect(result.critique).toBeDefined(); // Gemini analysis still works
  });

  it('handles concurrent AVIF conversions', async () => {
    const promises = Array(10).fill(null).map(() => 
      audit_design(avifImage, config, provider, fileService)
    );
    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);
    expect(results.every(r => r.critique)).toBe(true);
  });
});
```

### E2E Tests
```bash
# Test with real AVIF files
npm run test:e2e -- --grep "avif"

# Test with missing FFmpeg
PATH="" npm run test:e2e -- --grep "format-conversion"

# Test temp file cleanup
npm run test:e2e -- --grep "cleanup"
```

---

## Implementation Priority

| Priority | Issue | Solution | Effort | Impact |
|----------|-------|----------|--------|--------|
| P0 | FFmpeg not validated | Add startup check | 1h | High |
| P0 | Temp file cleanup fails | Use rmSync | 30m | High |
| P1 | MIME detection incomplete | Add comprehensive detection | 2h | Medium |
| P1 | ISO-BMFF brands incomplete | Update brand map | 30m | Medium |
| P2 | FFmpeg dependency | Add sharp library | 4h | High (long-term) |
| P2 | Silent fallback | Include in response | 1h | Low |
| P3 | Concurrent race conditions | Add unique temp dirs | 1h | Low |

---

## Recommended Next Steps

1. **Immediate (this sprint):**
   - Fix temp file cleanup (rmSync)
   - Add FFmpeg validation at startup
   - Update ISO-BMFF brand detection

2. **Short-term (next sprint):**
   - Add comprehensive format detection
   - Improve error messaging
   - Add format support matrix

3. **Long-term (future):**
   - Evaluate sharp library integration
   - Consider @jsquash/avif for AVIF-only path
   - Add format support documentation

---

## References

- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [ISO-BMFF Format Spec](https://en.wikipedia.org/wiki/ISO/IEC_base_media_file_format)
- [Image Format Magic Bytes](https://en.wikipedia.org/wiki/List_of_file_signatures)
- [@jsquash/avif](https://github.com/jamsinclair/jSquash)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
