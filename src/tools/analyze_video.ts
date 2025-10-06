/**
 * MCP Tool: analyze_video
 * Analyzes a video using AI vision models. Supports URLs and local file paths.
 */

import type { AnalysisOptions, AnalysisResult } from '../types/Providers.js';
import type { VisionProvider } from '../types/Providers.js';
import { FileService } from '../services/FileService.js';
import type { Config } from '../types/Config.js';
import { VisionError } from '../types/Errors.js';

export interface AnalyzeVideoArgs {
  videoSource: string; // Can be URL or local file path
  prompt: string;
  options?: AnalysisOptions;
}

export async function analyze_video(
  args: AnalyzeVideoArgs,
  config: Config,
  videoProvider: VisionProvider,
  videoFileService: FileService
): Promise<AnalysisResult> {
  try {
    // Validate arguments
    if (!args.videoSource) {
      throw new VisionError('videoSource is required', 'MISSING_ARGUMENT');
    }
    if (!args.prompt) {
      throw new VisionError('prompt is required', 'MISSING_ARGUMENT');
    }

    // Handle video source (URL vs local file)
    const processedVideoSource = await videoFileService.handleVideoSource(
      args.videoSource
    );

    // Merge default options with provided options
    const options: AnalysisOptions = {
      temperature: config.TEMPERATURE,
      topP: config.TOP_P,
      maxTokens: config.MAX_TOKENS_FOR_VIDEO,
      ...args.options,
    };

    // Analyze the video
    const result = await videoProvider.analyzeVideo(
      processedVideoSource,
      args.prompt,
      options
    );

    return result;
  } catch (error) {
    console.error('Error in analyze_video tool:', error);

    if (error instanceof VisionError) {
      throw error;
    }

    throw new VisionError(
      `Failed to analyze video: ${error instanceof Error ? error.message : String(error)}`,
      'ANALYSIS_ERROR',
      'gemini',
      error instanceof Error ? error : undefined
    );
  }
}
