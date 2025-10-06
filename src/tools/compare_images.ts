/**
 * MCP Tool: compare_images
 * Compares multiple images using AI vision models. Supports URLs, base64 data, and local file paths.
 */

import type { AnalysisOptions, AnalysisResult } from '../types/Providers.js';
import type { VisionProvider } from '../types/Providers.js';
import { FileService } from '../services/FileService.js';
import type { Config } from '../types/Config.js';
import { VisionError } from '../types/Errors.js';

export interface CompareImagesArgs {
  imageSources: string[]; // Array of image sources (URLs/base64/file paths)
  prompt: string;
  options?: AnalysisOptions;
}

export async function compare_images(
  args: CompareImagesArgs,
  config: Config,
  imageProvider: VisionProvider,
  imageFileService: FileService
): Promise<AnalysisResult> {
  try {
    // Validate arguments
    if (!args.imageSources || !Array.isArray(args.imageSources)) {
      throw new VisionError('imageSources must be an array', 'MISSING_ARGUMENT');
    }
    if (!args.prompt) {
      throw new VisionError('prompt is required', 'MISSING_ARGUMENT');
    }

    // Validate image count
    const maxImages = config.MAX_IMAGES_FOR_COMPARISON || 4;
    if (args.imageSources.length < 2) {
      throw new VisionError('At least 2 images are required for comparison', 'INVALID_ARGUMENT');
    }
    if (args.imageSources.length > maxImages) {
      throw new VisionError(
        `Maximum ${maxImages} images allowed for comparison, received ${args.imageSources.length}`,
        'INVALID_ARGUMENT'
      );
    }

    // Validate each image source
    for (let i = 0; i < args.imageSources.length; i++) {
      if (!args.imageSources[i] || typeof args.imageSources[i] !== 'string') {
        throw new VisionError(`Image source at index ${i} is invalid`, 'INVALID_ARGUMENT');
      }
    }

    console.log(`[compare_images] Processing ${args.imageSources.length} images for comparison`);

    // Process all image sources
    const processedImageSources = await Promise.all(
      args.imageSources.map(async (imageSource, index) => {
        console.log(`[compare_images] Processing image ${index + 1}: ${imageSource.substring(0, 100)}${imageSource.length > 100 ? '...' : ''}`);
        return await imageFileService.handleImageSource(imageSource);
      })
    );

    console.log(`[compare_images] All ${processedImageSources.length} images processed successfully`);

    // Merge default options with provided options
    const options: AnalysisOptions = {
      temperature: config.TEMPERATURE,
      topP: config.TOP_P,
      maxTokens: config.MAX_TOKENS_FOR_IMAGE,
      ...args.options,
    };

    // Call the provider's comparison method
    const result = await imageProvider.compareImages(
      processedImageSources,
      args.prompt,
      options
    );

    return result;
  } catch (error) {
    console.error('Error in compare_images tool:', error);

    if (error instanceof VisionError) {
      throw error;
    }

    throw new VisionError(
      `Failed to compare images: ${error instanceof Error ? error.message : String(error)}`,
      'ANALYSIS_ERROR',
      'gemini',
      error instanceof Error ? error : undefined
    );
  }
}