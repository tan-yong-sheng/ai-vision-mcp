/**
 * MCP Tool: analyze_image
 * Analyzes an image using AI vision models. Supports URLs, base64 data, and local file paths.
 */

import type { AnalysisOptions, AnalysisResult } from '../types/Providers.js';
import type { VisionProvider } from '../types/Providers.js';
import { FileService } from '../services/FileService.js';
import type { Config } from '../types/Config.js';
import { VisionError } from '../types/Errors.js';
import { FUNCTION_NAMES } from '../constants/FunctionNames.js';

// Mode-specific system prompts
const MODE_PROMPTS: Record<string, string> = {
  palette: `You are a design system analyzer specializing in design tokens. When analyzing images, focus on extracting design tokens including:
- Colors: Extract all colors used, their hex values, and where they're used
- Spacing: Identify spacing values (padding, margins, gaps)
- Typography: Extract font sizes, weights, line heights, and font families
- Shadows: Document shadow values and their applications
- Border Radius: Identify border radius values used

Provide structured output with clear categorization of each token type.`,

  hierarchy: `You are a visual hierarchy analyst. When analyzing images, focus on:
- Visual hierarchy: Identify the primary, secondary, and tertiary focal points
- Eye flow: Describe the natural path a viewer's eye follows through the interface
- Visual weight: Analyze which elements have the most visual prominence
- Balance: Assess if the layout is balanced, top-heavy, bottom-heavy, or unbalanced
- Readability: Evaluate text readability and information scannability
- Contrast: Analyze color and size contrast between elements

Provide detailed observations about how the visual design guides user attention.`,

  components: `You are a component inventory specialist. When analyzing images, focus on:
- Component identification: Catalog all UI components visible (buttons, cards, inputs, modals, etc.)
- Component variants: Note different states or variations of components
- Design system maturity: Assess if components follow consistent patterns
- Reusability: Identify which components appear multiple times
- Consistency: Note any inconsistencies in component styling or behavior

Provide a comprehensive inventory of components and assess the design system's maturity level.`,
};

function buildEffectivePrompt(
  userPrompt: string,
  mode?: 'general' | 'palette' | 'hierarchy' | 'components'
): string {
  if (!mode || mode === 'general') {
    return userPrompt;
  }

  const modePrompt = MODE_PROMPTS[mode];
  if (!modePrompt) {
    return userPrompt;
  }

  // Append mode-specific prompt to user prompt
  return `${modePrompt}\n\nUser request: ${userPrompt}`;
}

export interface AnalyzeImageArgs {
  imageSource: string; // Can be URL, base64 data, or local file path
  prompt: string;
  mode?: 'general' | 'palette' | 'hierarchy' | 'components';
  options?: AnalysisOptions;
}

export async function analyze_image(
  args: AnalyzeImageArgs,
  config: Config,
  imageProvider: VisionProvider,
  imageFileService: FileService
): Promise<AnalysisResult> {
  try {
    // Validate arguments
    if (!args.imageSource) {
      throw new VisionError('imageSource is required', 'MISSING_ARGUMENT');
    }
    if (!args.prompt) {
      throw new VisionError('prompt is required', 'MISSING_ARGUMENT');
    }

    // Handle image source (URL vs local file vs base64)
    const processedImageSource = await imageFileService.handleImageSource(
      args.imageSource
    );
    console.error(
      `[analyze_image] Processed image source: ${processedImageSource.substring(0, 100)}${processedImageSource.length > 100 ? '...' : ''}`
    );
    console.error(`[analyze_image] Original source: ${args.imageSource}`);
    console.error(
      `[analyze_image] Processed source starts with data:image: ${processedImageSource.startsWith('data:image/')}`
    );

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
      functionName: FUNCTION_NAMES.ANALYZE_IMAGE,
      ...args.options, // User options override defaults
    };

    // Analyze the image
    const effectivePrompt = buildEffectivePrompt(args.prompt, args.mode);
    const result = await imageProvider.analyzeImage(
      processedImageSource,
      effectivePrompt,
      options
    );

    return result;
  } catch (error) {
    console.error('Error in analyze_image tool:', error);

    if (error instanceof VisionError) {
      throw error;
    }

    throw new VisionError(
      `Failed to analyze image: ${error instanceof Error ? error.message : String(error)}`,
      'ANALYSIS_ERROR',
      'gemini',
      error instanceof Error ? error : undefined
    );
  }
}
