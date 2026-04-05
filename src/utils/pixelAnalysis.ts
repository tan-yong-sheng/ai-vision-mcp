/**
 * Pure TypeScript pixel analysis utilities for design auditing
 * Zero native binaries — uses imagescript for decoding and inline math for analysis
 *
 * Inspired by: "Automating UX/UI Design Analysis with Python, Machine Learning, and LLMs"
 * by Jade Graham
 * https://medium.com/@jadeygraham96/automating-ux-ui-design-analysis-with-python-machine-learning-and-llms-1fa1440b719b
 *
 * Implements the following analyses:
 * - K-means color clustering (dominant colors)
 * - Sobel edge detection (visual complexity)
 * - Luminance statistics (brightness analysis)
 * - WCAG 2.1 contrast validation
 */

import { Image } from 'imagescript';
import { kmeans } from 'ml-kmeans';
import type {
  RGB,
  ColorCluster,
  EdgeAnalysis,
  LuminanceStats,
  WCAGResult,
} from '../types/DesignAudit.js';

/**
 * Step 1: Load image via imagescript
 * imagescript uses WASM for PNG/JPEG decoding (bundled, no native deps)
 */
export async function loadImagePixels(imageBuffer: Buffer): Promise<{
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}> {
  const img = await Image.decode(imageBuffer);

  return {
    width: img.width,
    height: img.height,
    rgba: img.bitmap, // raw RGBA, 4 bytes per pixel
  };
}

/**
 * Step 2: Extract dominant colors via ml-kmeans (pure TypeScript)
 * Sample every Nth pixel to keep it fast on large images
 */
export function extractDominantColors(
  rgba: Uint8ClampedArray,
  totalPixels: number,
  nColors = 5,
  sampleStep = 8 // sample 1 in every 8 pixels
): ColorCluster[] {
  // Build [r,g,b][] matrix from sampled pixels
  const points: number[][] = [];
  for (let i = 0; i < rgba.length; i += 4 * sampleStep) {
    points.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
  }

  const result = kmeans(points, nColors, { initialization: 'kmeans++' });

  // Count how many sampled pixels landed in each cluster
  const counts = new Array<number>(nColors).fill(0);
  result.clusters.forEach((c: number) => counts[c]++);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');

  return result.centroids
    .map((c: any, i: number) => {
      const [r, g, b] = (c.centroid as number[]).map(Math.round);
      return {
        hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
        rgb: { r, g, b },
        percentage: (counts[i] / points.length) * 100,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
}

/**
 * Step 3: Edge detection — inline Sobel operator
 * Pure arithmetic, no library needed — equivalent to cv2.Canny() for structural analysis
 */
export function analyzeEdges(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 80
): EdgeAnalysis {
  // Convert RGBA → grayscale using ITU-R BT.601 luminance weights
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const o = i * 4;
    gray[i] = (0.299 * rgba[o] +
      0.587 * rgba[o + 1] +
      0.114 * rgba[o + 2]) |
      0;
  }

  // Apply Sobel kernels:
  //   Gx = [[-1,0,1],[-2,0,2],[-1,0,1]]
  //   Gy = [[-1,-2,-1],[0,0,0],[1,2,1]]
  let edgePixels = 0;
  const px = (row: number, col: number) => gray[row * width + col];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx =
        -px(y - 1, x - 1) +
        px(y - 1, x + 1) +
        -2 * px(y, x - 1) +
        2 * px(y, x + 1) +
        -px(y + 1, x - 1) +
        px(y + 1, x + 1);

      const gy =
        -px(y - 1, x - 1) -
        2 * px(y - 1, x) -
        px(y - 1, x + 1) +
        px(y + 1, x - 1) +
        2 * px(y + 1, x) +
        px(y + 1, x + 1);

      if (Math.sqrt(gx * gx + gy * gy) > threshold) edgePixels++;
    }
  }

  const density = edgePixels / (width * height);

  // Scale thresholds relative to image size
  // (Python article's 50k/20k raw counts assumed ~640×480 = 307k pixels)
  const complexThreshold = 0.14;
  const moderateThreshold = 0.06;

  const complexity: EdgeAnalysis['complexity'] =
    density > complexThreshold
      ? 'complex'
      : density > moderateThreshold
        ? 'moderate'
        : 'simple';

  const description: Record<EdgeAnalysis['complexity'], string> = {
    complex:
      'Dense edge structure — high visual complexity, risk of cognitive overload.',
    moderate:
      'Balanced edge structure — good visual richness without overwhelming.',
    simple: 'Minimal edges — clean, breathable layout.',
  };

  return { edgePixels, density, complexity, description: description[complexity] };
}

/**
 * Step 4: Luminance stats — inline, zero deps
 * Mean brightness and std dev (contrast proxy). Pure arithmetic.
 */
export function computeLuminance(
  rgba: Uint8ClampedArray,
  sampleStep = 4
): LuminanceStats {
  const lums: number[] = [];
  for (let i = 0; i < rgba.length; i += 4 * sampleStep) {
    lums.push(
      0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]
    );
  }
  const mean = lums.reduce((a, b) => a + b, 0) / lums.length;
  const variance =
    lums.reduce((s, l) => s + (l - mean) ** 2, 0) / lums.length;
  return { mean: Math.round(mean), stdDev: Math.round(Math.sqrt(variance)) };
}

/**
 * Step 5: WCAG 2.1 contrast ratios — inline, zero deps
 * Implements W3C formula: (L1 + 0.05) / (L2 + 0.05)
 * AA requires 4.5:1 for normal text, 3:1 for large text / UI components
 * AAA requires 7:1 for normal text, 4.5:1 for large text
 */
function relativeLuminance({ r, g, b }: RGB): number {
  const linearize = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function checkWCAG(colors: ColorCluster[]): WCAGResult[] {
  const results: WCAGResult[] = [];
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const ratio = contrastRatio(colors[i].rgb, colors[j].rgb);
      results.push({
        color1: colors[i].hex,
        color2: colors[j].hex,
        ratio: parseFloat(ratio.toFixed(2)),
        passesAA: ratio >= 4.5,
        passesAAA: ratio >= 7.0,
      });
    }
  }
  return results.sort((a, b) => a.ratio - b.ratio); // worst pairs first
}
