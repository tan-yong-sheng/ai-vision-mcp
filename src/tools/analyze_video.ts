/**
 * MCP Tool: analyze_video
 * Analyzes a video using AI vision models. Supports URLs and local file paths.
 */

import type { AnalysisOptions, AnalysisResult } from '../types/Providers.js';
import type { VisionProvider } from '../types/Providers.js';
import { FileService } from '../services/FileService.js';
import type { Config } from '../types/Config.js';
import { VisionError } from '../types/Errors.js';
import { FUNCTION_NAMES } from '../constants/FunctionNames.js';
import { isYouTubeUrl, fetchYouTubeDuration } from '../utils/youtube.js';
import { validateVideoContext } from '../utils/videoTokens.js';

export interface AnalyzeVideoArgs {
  videoSource: string; // Can be URL or local file path
  prompt: string;
  options?: AnalysisOptions;
}

export interface ContextWarning {
  estimatedTokens: number;
  contextWindow: number;
  utilization: number;
  message: string;
  suggestions: string[];
}

export interface ExtendedAnalysisResult extends AnalysisResult {
  contextWarning?: ContextWarning;
}

export async function analyze_video(
  args: AnalyzeVideoArgs,
  config: Config,
  videoProvider: VisionProvider,
  videoFileService: FileService
): Promise<ExtendedAnalysisResult> {
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
      temperature:
        config.TEMPERATURE_FOR_ANALYZE_VIDEO ??
        config.TEMPERATURE_FOR_VIDEO ??
        config.TEMPERATURE,
      topP:
        config.TOP_P_FOR_ANALYZE_VIDEO ??
        config.TOP_P_FOR_VIDEO ??
        config.TOP_P,
      topK:
        config.TOP_K_FOR_ANALYZE_VIDEO ??
        config.TOP_K_FOR_VIDEO ??
        config.TOP_K,
      maxTokens:
        config.MAX_TOKENS_FOR_ANALYZE_VIDEO ??
        config.MAX_TOKENS_FOR_VIDEO ??
        config.MAX_TOKENS,
      taskType: 'video',
      functionName: FUNCTION_NAMES.ANALYZE_VIDEO,
      ...args.options, // User options override defaults
    };

    // Context window validation for YouTube videos
    let contextWarning: ContextWarning | undefined;

    if (isYouTubeUrl(args.videoSource)) {
      const youtubeApiKey = config.YOUTUBE_API_KEY;

      if (youtubeApiKey) {
        try {
          const durationSeconds = await fetchYouTubeDuration(args.videoSource, youtubeApiKey);

          if (durationSeconds !== null) {
            // Get the model name being used for video analysis
            const modelName = config.VIDEO_MODEL || 'gemini-2.5-flash';

            const validation = validateVideoContext({
              durationSeconds,
              model: modelName,
              promptTokens: Math.ceil(args.prompt.length / 4),
            });

            // Always set contextWarning when validation succeeds (even if no warning message)
            // This allows callers to know the context utilization
            contextWarning = {
              estimatedTokens: validation.estimatedTokens,
              contextWindow: validation.contextWindow,
              utilization: validation.utilization,
              message: validation.warning || '',
              suggestions: validation.suggestions,
            };
          }
        } catch (error) {
          // Log but don't fail - validation is advisory only
          console.warn('Failed to validate video context:', error);
        }
      }
    }

    // Analyze the video
    const result = await videoProvider.analyzeVideo(
      processedVideoSource,
      args.prompt,
      options
    );

    // Return result with context warning nested under metadata
    const extendedResult: ExtendedAnalysisResult = {
      ...result,
      metadata: {
        ...result.metadata,
        ...(contextWarning && { contextWarning }),
      },
    };

    return extendedResult;
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
