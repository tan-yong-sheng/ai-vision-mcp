/**
 * MCP Tool: audit_design
 * Performs design compliance auditing with pixel-level analysis and Gemini critique
 * Pure TypeScript/JavaScript — zero native binaries
 */

import type { AnalysisOptions, AnalysisResult } from '../types/Providers.js';
import type { VisionProvider } from '../types/Providers.js';
import { FileService } from '../services/FileService.js';
import type { Config } from '../types/Config.js';
import { VisionError } from '../types/Errors.js';
import { FUNCTION_NAMES } from '../constants/FunctionNames.js';
import type {
  DesignMetrics,
  DesignAuditResult,
  DesignIssue,
} from '../types/DesignAudit.js';
import {
  loadImagePixels,
  extractDominantColors,
  analyzeEdges,
  computeLuminance,
  checkWCAG,
} from '../utils/pixelAnalysis.js';

export interface AuditDesignArgs {
  imageSource: string; // Can be URL, base64 data, or local file path
  prompt?: string; // Optional custom audit prompt
  options?: AnalysisOptions;
}

/**
 * Compute design metrics from pixel data
 */
async function computeDesignMetrics(
  imageBuffer: Buffer,
  imageWidth?: number,
  imageHeight?: number
): Promise<DesignMetrics> {
  const { width, height, rgba } = await loadImagePixels(imageBuffer);

  const dominantColors = extractDominantColors(rgba, width * height, 5, 8);
  const edges = analyzeEdges(rgba, width, height, 80);
  const luminance = computeLuminance(rgba, 4);
  const wcag = checkWCAG(dominantColors);

  return {
    width,
    height,
    dominantColors,
    edges,
    luminance,
    wcag,
  };
}

/**
 * Extract design issues from metrics
 */
function extractDesignIssues(metrics: DesignMetrics): DesignIssue[] {
  const issues: DesignIssue[] = [];

  // Check WCAG contrast issues
  const wcagFails = metrics.wcag.filter((w) => !w.passesAA);
  if (wcagFails.length > 0) {
    wcagFails.slice(0, 3).forEach((fail) => {
      issues.push({
        type: 'contrast',
        severity: fail.ratio < 3 ? 'critical' : 'major',
        title: `Low contrast: ${fail.color1} ↔ ${fail.color2}`,
        description: `Contrast ratio ${fail.ratio}:1 fails WCAG AA (needs 4.5:1)`,
        recommendation: 'Increase luminance difference between colors',
      });
    });
  }

  // Check edge complexity
  if (metrics.edges.complexity === 'complex') {
    issues.push({
      type: 'complexity',
      severity: 'major',
      title: 'High visual complexity',
      description: `Edge density ${metrics.edges.density.toFixed(3)} indicates dense structure — risk of cognitive overload`,
      recommendation: 'Simplify layout, reduce visual noise, increase whitespace',
    });
  }

  // Check brightness extremes
  if (metrics.luminance.mean < 50) {
    issues.push({
      type: 'brightness',
      severity: 'minor',
      title: 'Very dark design',
      description: `Mean brightness ${metrics.luminance.mean}/255 — may cause eye strain`,
      recommendation: 'Consider lighter backgrounds or increased contrast',
    });
  } else if (metrics.luminance.mean > 220) {
    issues.push({
      type: 'brightness',
      severity: 'minor',
      title: 'Very bright design',
      description: `Mean brightness ${metrics.luminance.mean}/255 — may cause glare`,
      recommendation: 'Consider darker accents or reduced brightness',
    });
  }

  // Check contrast std dev (visual separation)
  if (metrics.luminance.stdDev < 30) {
    issues.push({
      type: 'spacing',
      severity: 'minor',
      title: 'Low visual contrast',
      description: `Luminance std dev ${metrics.luminance.stdDev} — elements may blend together`,
      recommendation: 'Increase visual separation through color, size, or spacing',
    });
  }

  return issues;
}

/**
 * Build audit prompt for Gemini
 */
function buildAuditPrompt(
  metrics: DesignMetrics,
  customPrompt?: string
): string {
  const colorSummary = metrics.dominantColors
    .map((c) => `${c.hex} (${c.percentage.toFixed(1)}%)`)
    .join(', ');

  const wcagFails = metrics.wcag.filter((w) => !w.passesAA);
  const wcagSummary =
    wcagFails.length > 0
      ? wcagFails
          .map((w) => `${w.color1}↔${w.color2} = ${w.ratio}:1 (fails AA)`)
          .join(', ')
      : 'All dominant color pairs pass WCAG AA';

  const basePrompt = `You are a senior UX/UI design auditor. Analyze this design screenshot using the pre-computed metrics below.

Pre-computed metrics (from pixel analysis):
- Dominant colors: ${colorSummary}
- Edge complexity: ${metrics.edges.complexity} — ${metrics.edges.description}
- Brightness: ${metrics.luminance.mean}/255 (std dev: ${metrics.luminance.stdDev})
- WCAG contrast: ${wcagSummary}
- Dimensions: ${metrics.width}×${metrics.height}px

Using the image AND these metrics, provide a structured design audit:

1. **Color harmony** — palette coherence, emotional tone, brand alignment
2. **Visual hierarchy** — does the layout guide the eye correctly?
3. **Accessibility** — contrast issues, cognitive load, readability
4. **Layout complexity** — based on edge density: ${metrics.edges.density.toFixed(3)}
5. **Actionable fixes** — 3 specific, prioritized improvements

For each issue, label severity: [critical] [major] [minor].
Be concise and direct.`;

  if (customPrompt) {
    return `${basePrompt}\n\nAdditional context: ${customPrompt}`;
  }

  return basePrompt;
}

/**
 * Determine overall severity from issues
 */
function determineSeverity(issues: DesignIssue[]): DesignAuditResult['severity'] {
  if (issues.some((i) => i.severity === 'critical')) return 'critical';
  if (issues.some((i) => i.severity === 'major')) return 'major';
  if (issues.some((i) => i.severity === 'minor')) return 'minor';
  return 'pass';
}

export async function audit_design(
  args: AuditDesignArgs,
  config: Config,
  imageProvider: VisionProvider,
  imageFileService: FileService
): Promise<DesignAuditResult> {
  try {
    // Validate arguments
    if (!args.imageSource) {
      throw new VisionError('imageSource is required', 'MISSING_ARGUMENT');
    }

    // Handle image source (URL vs local file vs base64)
    const processedImageSource = await imageFileService.handleImageSource(
      args.imageSource
    );

    // Compute pixel-level metrics
    console.error('[audit_design] Computing pixel metrics...');
    let imageBuffer: Buffer;

    // If it's a data URI, decode it
    if (processedImageSource.startsWith('data:image/')) {
      const base64Data = processedImageSource.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (processedImageSource.startsWith('http')) {
      // Fetch from URL
      const response = await fetch(processedImageSource);
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      // Assume it's a file path
      const fs = await import('fs/promises');
      imageBuffer = await fs.readFile(processedImageSource);
    }

    const metrics = await computeDesignMetrics(imageBuffer);
    console.error(
      `[audit_design] Metrics computed: ${metrics.width}×${metrics.height}px, ${metrics.dominantColors.length} colors`
    );

    // Extract issues from metrics
    const issues = extractDesignIssues(metrics);

    // Merge default options with provided options
    const options: AnalysisOptions = {
      temperature:
        config.TEMPERATURE_FOR_ANALYZE_IMAGE ??
        config.TEMPERATURE_FOR_IMAGE ??
        config.TEMPERATURE,
      topP:
        config.TOP_P_FOR_ANALYZE_IMAGE ??
        config.TOP_P_FOR_IMAGE ??
        config.TOP_P,
      topK:
        config.TOP_K_FOR_ANALYZE_IMAGE ??
        config.TOP_K_FOR_IMAGE ??
        config.TOP_K,
      maxTokens:
        config.MAX_TOKENS_FOR_ANALYZE_IMAGE ??
        config.MAX_TOKENS_FOR_IMAGE ??
        config.MAX_TOKENS,
      taskType: 'image',
      functionName: FUNCTION_NAMES.ANALYZE_IMAGE, // Reuse for now
      ...args.options,
    };

    // Get Gemini critique
    console.error('[audit_design] Requesting Gemini critique...');
    const auditPrompt = buildAuditPrompt(metrics, args.prompt);
    const critiqueResult = await imageProvider.analyzeImage(
      processedImageSource,
      auditPrompt,
      options
    );

    const severity = determineSeverity(issues);

    return {
      metrics,
      critique: critiqueResult.text,
      issues,
      severity,
    };
  } catch (error) {
    console.error('Error in audit_design tool:', error);

    if (error instanceof VisionError) {
      throw error;
    }

    throw new VisionError(
      `Failed to audit design: ${error instanceof Error ? error.message : String(error)}`,
      'ANALYSIS_ERROR',
      'gemini',
      error instanceof Error ? error : undefined
    );
  }
}
