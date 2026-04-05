/**
 * MCP Tool: audit_design
 * Performs design compliance auditing with pixel-level analysis and Gemini critique
 * Pure TypeScript/JavaScript — zero native binaries
 *
 * Inspired by: "Automating UX/UI Design Analysis with Python, Machine Learning, and LLMs"
 * by Jade Graham
 * https://medium.com/@jadeygraham96/automating-ux-ui-design-analysis-with-python-machine-learning-and-llms-1fa1440b719b
 *
 * This TypeScript implementation adapts the original Python approach using pure JavaScript
 * pixel analysis (K-means clustering, Sobel edge detection, WCAG contrast validation)
 * combined with Gemini Vision API for design critique.
 */

import type { AnalysisOptions, AnalysisResult } from '../types/Providers.js';
import type { VisionProvider } from '../types/Providers.js';
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
import { processImageSource } from '../utils/imageSourceHandler.js';

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
  metrics: DesignMetrics | null,
  customPrompt?: string
): string {
  // If metrics are unavailable (e.g., AVIF format), use a simpler prompt
  if (!metrics) {
    const basePrompt = `You are a senior UX/UI design auditor. Analyze this design screenshot for:

1. **Color harmony** — palette coherence, emotional tone, brand alignment
2. **Visual hierarchy** — does the layout guide the eye correctly?
3. **Accessibility** — potential contrast issues, cognitive load, readability
4. **Layout complexity** — visual density and organization
5. **Actionable fixes** — 3 specific, prioritized improvements

For each issue, label severity: [critical] [major] [minor].
Be concise and direct.

Note: Pixel-level metrics unavailable (unsupported image format). Analysis based on visual inspection only.`;

    if (customPrompt) {
      return `${basePrompt}\n\nAdditional context: ${customPrompt}`;
    }
    return basePrompt;
  }

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
  imageProvider: VisionProvider
): Promise<DesignAuditResult> {
  try {
    // Validate arguments
    if (!args.imageSource) {
      throw new VisionError('imageSource is required', 'MISSING_ARGUMENT');
    }

    // Process image source using shared utility
    const {
      fileUri,
      mimeType,
      isInlineData,
    } = await processImageSource(args.imageSource);

    // Compute pixel-level metrics
    console.error('[audit_design] Computing pixel metrics...');
    let imageBuffer: Buffer;

    // Extract buffer from processed image source
    if (isInlineData && fileUri.startsWith('data:image/')) {
      const base64Data = fileUri.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // For file references and GCS URIs, we can't extract pixel data
      // Fall back to Gemini vision analysis only
      imageBuffer = Buffer.alloc(0);
    }

    // Try to compute pixel metrics, but gracefully handle unsupported formats
    let metrics: DesignMetrics | null = null;
    let issues: DesignIssue[] = [];

    if (imageBuffer.length > 0) {
      try {
        metrics = await computeDesignMetrics(imageBuffer);
        console.error(
          `[audit_design] Metrics computed: ${metrics.width}×${metrics.height}px, ${metrics.dominantColors.length} colors`
        );
        // Extract issues from metrics
        issues = extractDesignIssues(metrics);
      } catch (metricsError) {
        // Unsupported format detected - skip pixel analysis and use Gemini vision analysis only
        if (metricsError instanceof Error) {
          const message = metricsError.message.toLowerCase();
          if (
            message.includes('format detected') ||
            message.includes('unsupported') ||
            message.includes('pixel analysis skipped')
          ) {
            console.error(
              `[audit_design] ${metricsError.message}`
            );
            metrics = null;
          } else {
            throw metricsError;
          }
        } else {
          throw metricsError;
        }
      }
    }

    // Merge default options with provided options
    const options: AnalysisOptions = {
      temperature:
        config.TEMPERATURE_FOR_AUDIT_DESIGN ??
        config.TEMPERATURE_FOR_IMAGE ??
        config.TEMPERATURE,
      topP:
        config.TOP_P_FOR_AUDIT_DESIGN ??
        config.TOP_P_FOR_IMAGE ??
        config.TOP_P,
      topK:
        config.TOP_K_FOR_AUDIT_DESIGN ??
        config.TOP_K_FOR_IMAGE ??
        config.TOP_K,
      maxTokens:
        config.MAX_TOKENS_FOR_AUDIT_DESIGN ??
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
      fileUri,
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
