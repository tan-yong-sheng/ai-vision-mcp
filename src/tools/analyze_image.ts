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

export interface AnalyzeImageArgs {
  imageSource: string; // Can be URL, base64 data, or local file path
  prompt: string;
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
    console.log(
      `[analyze_image] Processed image source: ${processedImageSource.substring(0, 100)}${processedImageSource.length > 100 ? '...' : ''}`
    );
    console.log(`[analyze_image] Original source: ${args.imageSource}`);
    console.log(
      `[analyze_image] Processed source starts with data:image: ${processedImageSource.startsWith('data:image/')}`
    );

    // Merge default options with provided options
    const options: AnalysisOptions = {
      temperature: config.TEMPERATURE_FOR_ANALYZE_IMAGE ?? config.TEMPERATURE_FOR_IMAGE ?? config.TEMPERATURE,
      topP: config.TOP_P_FOR_ANALYZE_IMAGE ?? config.TOP_P_FOR_IMAGE ?? config.TOP_P,
      topK: config.TOP_K_FOR_ANALYZE_IMAGE ?? config.TOP_K_FOR_IMAGE ?? config.TOP_K,
      maxTokens: config.MAX_TOKENS_FOR_ANALYZE_IMAGE ?? config.MAX_TOKENS_FOR_IMAGE ?? config.MAX_TOKENS,
      taskType: 'image',
      functionName: FUNCTION_NAMES.ANALYZE_IMAGE,
      ...args.options,  // User options override defaults
    };

    // Analyze the image
    const result = await imageProvider.analyzeImage(
      processedImageSource,
      args.prompt,
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
