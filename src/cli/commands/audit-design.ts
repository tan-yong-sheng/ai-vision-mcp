import type { Config } from '../../types/Config.js';
import { VisionProviderFactory } from '../../providers/factory/ProviderFactory.js';
import { audit_design } from '../../tools/audit_design.js';
import {
  parseOptions,
  formatOutput,
  handleError,
  parseArgs,
} from '../utils.js';

export async function runAuditDesign(
  args: string[],
  config: Config
): Promise<void> {
  // Parse arguments
  const { positional, options } = parseArgs(args);

  if (positional.length < 1) {
    console.error('Error: Image source required');
    console.error('Usage: ai-vision audit-design <source> [--prompt <text>]');
    process.exit(1);
  }

  const imageSource = positional[0];
  const prompt = options.prompt;

  try {
    // Initialize services
    const imageProvider = VisionProviderFactory.createProviderWithValidation(
      config,
      'image'
    );

    // Run audit
    console.error(`[CLI] Auditing design from: ${imageSource}`);
    const result = await audit_design(
      {
        imageSource,
        prompt,
        options: parseOptions(options),
      },
      config,
      imageProvider
    );

    // Format and output results
    const output = {
      severity: result.severity,
      metrics: result.metrics
        ? {
            dimensions: `${result.metrics.width}×${result.metrics.height}px`,
            colors: result.metrics.dominantColors,
            edges: {
              complexity: result.metrics.edges.complexity,
              density: result.metrics.edges.density.toFixed(3),
            },
            luminance: {
              mean: result.metrics.luminance.mean,
              stdDev: result.metrics.luminance.stdDev,
            },
            wcagContrast: {
              total: result.metrics.wcag.length,
              passing: result.metrics.wcag.filter((w) => w.passesAA).length,
              failing: result.metrics.wcag.filter((w) => !w.passesAA).length,
            },
          }
        : null,
      issues: result.issues,
      critique: result.critique,
    };

    if (options.json) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(JSON.stringify(output, null, 2));
    }
  } catch (error) {
    handleError(error);
  }
}
