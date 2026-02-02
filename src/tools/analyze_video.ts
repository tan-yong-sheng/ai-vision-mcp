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

export interface AnalyzeVideoArgs {
  videoSource: string; // Can be URL or local file path
  prompt: string;
  options?: AnalysisOptions;
  timeRange?: {
    startTime?: string; // e.g., "00:00:10"
    endTime?: string;   // e.g., "00:00:20"
  };
  resolution?: string; // e.g., "1280x720"
}

import { VideoProcessor } from '../utils/VideoProcessor.js';

export async function analyze_video(
  args: AnalyzeVideoArgs,
  config: Config,
  videoProvider: VisionProvider,
  videoFileService: FileService
): Promise<AnalysisResult> {
  const videoProcessor = new VideoProcessor();
  let processedVideoSource = '';
  let isTempFile = false;
  let source = args.videoSource;

  try {
    // Validate arguments
    if (!args.videoSource) {
      throw new VisionError('videoSource is required', 'MISSING_ARGUMENT');
    }
    if (!args.prompt) {
      throw new VisionError('prompt is required', 'MISSING_ARGUMENT');
    }

    // Handle video source (URL vs local file)
    // source variable initialized above

    // If time range or resolution options are provided, process the video
    // Note: This currently works best for local files. For URLs, we'd need to download first.
    // The FileService handles downloading, but we might need to intercept it.
    
    // We need to resolve the local path if it's a URL and we need processing.
    // However, FileService.handleVideoSource returns a URI or URL, not necessarily a local path we can ffmpeg.
    
    // Let's rely on FileService to get us a "handleable" source, but if we need processing,
    // we might need to ask FileService to download it to a temp file first if it's a URL.
    
    // Current FileService.handleVideoSource logic:
    // - Public URL -> returns URL
    // - Local File -> returns uploaded File URI (after upload)
    
    // We need to inject processing BEFORE upload for local files.
    // For URLs, we'd need to download -> process -> upload.
    
    // Let's modify the flow:
    // 1. If no processing needed, proceed as before.
    // 2. If processing needed:
    //    a. If local file: process to temp file -> upload temp file.
    //    b. If URL: download to temp file -> process -> upload.
    
    const needsProcessing = args.timeRange?.startTime || args.timeRange?.endTime || args.resolution;

    if (needsProcessing) {
        // We need a way to get the local path. 
        // If it's a URL, we need to download it.
        // FileService has logic for this but it's mixed with upload.
        // Let's use FileService's download capability if exposed, or add it.
        // For now, let's assume videoFileService can help us or we handle it here.
        
        let localInputPath = args.videoSource;
        
        // Check if URL
        if (args.videoSource.startsWith('http')) {
             // For now, let's skip complex URL downloading logic inside this tool 
             // and focus on local files or assume the user provides a local path if they want processing,
             // OR we can implement a simple download here.
             // Given the requirements, "make it for local videos via ffmpeg tools" is explicitly mentioned.
             // But "adjusting media resolution" implies we should handle it.
             
             // If it is a URL, we might throw or try to handle. 
             // Let's try to handle via FileService or direct fetch if simple.
             // Actually, FileService doesn't expose a simple "download to local path" public method easily found in the interface read.
             // But we can check if it's a local file.
             
             // If it IS a URL, we might skip processing or warn. 
             // But the prompt says "most of them are focusing on YouTube videos but you can try to make it for local videos via ffmpeg tools".
             // So supporting local video processing is the key.
        }
        
        // If it is a local file (and exists), we process it.
        if (!args.videoSource.startsWith('http') && !args.videoSource.startsWith('gs://') && !args.videoSource.startsWith('files/')) {
             const processedPath = await videoProcessor.processVideo(args.videoSource, {
                 startTime: args.timeRange?.startTime,
                 endTime: args.timeRange?.endTime,
                 resolution: args.resolution
             });
             
             if (processedPath !== args.videoSource) {
                 source = processedPath;
                 isTempFile = true;
             }
        }
    }

    processedVideoSource = await videoFileService.handleVideoSource(
      source
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
  } finally {
      if (isTempFile && source) {
          await videoProcessor.cleanup(source);
      }
  }
}
