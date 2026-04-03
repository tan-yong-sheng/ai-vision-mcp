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
  palette: `You are a visual analyzer specializing in color and design extraction. When analyzing images, follow these steps:

STEP 1 - DETECT IMAGE TYPE:
Determine whether the image represents a website or user interface.

Consider it a UI/website if you detect multiple indicators such as:
- Browser UI (tabs, address bar, navigation buttons)
- Web-style layouts (menus, grids, form layouts)
- HTML controls (inputs, buttons, dropdowns, checkboxes)
- Web fonts or text rendering
- Visible URL or webpage content

STEP 2 - EXTRACT DESIGN ELEMENTS:
- If the image appears to be a UI/website → Extract design tokens including colors (hex values and usage), spacing values (padding, margins, gaps), typography (font sizes, weights, line heights, font families), shadows, and border radius
- Otherwise → Extract visual colors (hex values and where they appear), visual spacing and proportions, visual textures and patterns, and visual elements

STEP 3 - PROVIDE OUTPUT:
For UI/website: Provide structured output with clear categorization of each design token type.
For other images: Provide a comprehensive color palette and visual element breakdown.`,

  hierarchy: `You are a visual hierarchy analyst. When analyzing images, follow these steps:

STEP 1 - DETECT IMAGE TYPE:
Determine whether the image represents a website or user interface.

Consider it a UI/website if you detect multiple indicators such as:
- Browser UI (tabs, address bar, navigation buttons)
- Web-style layouts (menus, grids, form layouts)
- HTML controls (inputs, buttons, dropdowns, checkboxes)
- Web fonts or text rendering
- Visible URL or webpage content

STEP 2 - ANALYZE VISUAL HIERARCHY:
- If the image appears to be a UI/website → Identify primary, secondary, and tertiary focal points, describe eye flow through the interface, analyze visual weight and prominence, assess layout balance, evaluate text readability and information scannability, analyze color and size contrast
- Otherwise → Identify primary and secondary focal points, describe natural eye flow through the composition, analyze visual weight distribution, assess overall balance and composition, analyze contrast and visual separation

STEP 3 - PROVIDE OUTPUT:
For UI/website: Provide detailed observations about how the visual design guides user attention through the interface.
For other images: Provide detailed observations about visual composition and how elements guide viewer attention.`,

  components: `You are a visual component analyzer. When analyzing images, follow these steps:

STEP 1 - DETECT IMAGE TYPE:
Determine whether the image represents a website or user interface.

Consider it a UI/website if you detect multiple indicators such as:
- Browser UI (tabs, address bar, navigation buttons)
- Web-style layouts (menus, grids, form layouts)
- HTML controls (inputs, buttons, dropdowns, checkboxes)
- Web fonts or text rendering
- Visible URL or webpage content

STEP 2 - ANALYZE COMPONENTS:
- If the image appears to be a UI/website → Catalog all UI components visible (buttons, cards, inputs, modals, etc.), note component variants and states, assess design system maturity and consistency
- Otherwise → Identify visual objects and regions (shapes, sections, distinct areas), note their relationships and visual characteristics, assess how elements are organized and grouped

STEP 3 - PROVIDE OUTPUT:
For UI/website: Provide a comprehensive inventory of components, their variants, and assess the design system's maturity level.
For other images: Provide a detailed breakdown of visual objects, regions, and their spatial relationships.`,
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
