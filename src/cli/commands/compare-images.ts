import type { Config } from '../../types/Config.js';
import { ConfigService } from '../../services/ConfigService.js';
import { VisionProviderFactory } from '../../providers/factory/ProviderFactory.js';
import { FileService } from '../../services/FileService.js';
import { compare_images } from '../../tools/compare_images.js';
import { parseOptions, formatOutput, handleError, parseArgs } from '../utils.js';

export async function runCompareImages(args: string[], config: Config): Promise<void> {
  // Parse arguments
  const { positional, options } = parseArgs(args);

  if (positional.length < 2) {
    console.error('Error: At least 2 image sources required');
    console.error('Usage: ai-vision compare-images <source1> <source2> [source3...] --prompt <text>');
    process.exit(1);
  }

  const imageSources = positional;
  const prompt = options.prompt;

  if (!prompt) {
    console.error('Error: --prompt is required');
    process.exit(1);
  }

  // Initialize services
  const configService = ConfigService.getInstance();
  const imageProvider = VisionProviderFactory.createProviderWithValidation(config, 'image');
  const imageFileService = new FileService(configService, 'image', imageProvider as any);

  // Run tool
  try {
    const result = await compare_images(
      { imageSources, prompt, options: parseOptions(options) },
      config,
      imageProvider,
      imageFileService
    );

    console.log(formatOutput(result, 'json' in options));
  } catch (error) {
    handleError(error, 'json' in options);
  }
}
