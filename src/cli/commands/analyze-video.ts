import type { Config } from '../../types/Config.js';
import { ConfigService } from '../../services/ConfigService.js';
import { VisionProviderFactory } from '../../providers/factory/ProviderFactory.js';
import { FileService } from '../../services/FileService.js';
import { analyze_video } from '../../tools/analyze_video.js';
import { parseOptions, formatOutput, handleError, parseArgs } from '../utils.js';

export async function runAnalyzeVideo(args: string[], config: Config): Promise<void> {
  // Parse arguments
  const { positional, options } = parseArgs(args);

  if (positional.length < 1) {
    console.error('Error: Video source required');
    console.error('Usage: ai-vision analyze-video <source> --prompt <text>');
    process.exit(1);
  }

  const videoSource = positional[0];
  const prompt = options.prompt;

  if (!prompt) {
    console.error('Error: --prompt is required');
    process.exit(1);
  }

  // Initialize services
  const configService = ConfigService.getInstance();
  const videoProvider = VisionProviderFactory.createProviderWithValidation(config, 'video');
  const videoFileService = new FileService(configService, 'video', videoProvider as any);

  // Run tool
  try {
    const result = await analyze_video(
      { videoSource, prompt, options: parseOptions(options) },
      config,
      videoProvider,
      videoFileService
    );

    console.log(formatOutput(result, 'json' in options));
  } catch (error) {
    handleError(error, 'json' in options);
  }
}
