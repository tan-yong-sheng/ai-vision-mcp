import type { Config } from '../../types/Config.js';
import { ConfigService } from '../../services/ConfigService.js';
import { VisionProviderFactory } from '../../providers/factory/ProviderFactory.js';
import { FileService } from '../../services/FileService.js';
import { detect_objects_in_image } from '../../tools/detect_objects_in_image.js';
import {
  parseOptions,
  formatOutput,
  handleError,
  parseArgs,
} from '../utils.js';

export async function runDetectObjects(
  args: string[],
  config: Config
): Promise<void> {
  // Parse arguments
  const { positional, options } = parseArgs(args);

  if (positional.length < 1) {
    console.error('Error: Image source required');
    console.error(
      'Usage: ai-vision detect-objects <source> --prompt <text> [--viewport-width <width>] [--viewport-height <height>]'
    );
    process.exit(1);
  }

  const imageSource = positional[0];
  const prompt = options.prompt;
  const outputFilePath = options.output;
  const viewportWidth = options['viewport-width']
    ? parseInt(options['viewport-width'], 10)
    : undefined;
  const viewportHeight = options['viewport-height']
    ? parseInt(options['viewport-height'], 10)
    : undefined;

  if (!prompt) {
    console.error('Error: --prompt is required');
    process.exit(1);
  }

  // Initialize services
  const configService = ConfigService.getInstance();
  const imageProvider = VisionProviderFactory.createProviderWithValidation(
    config,
    'image'
  );
  const imageFileService = new FileService(
    configService,
    'image',
    imageProvider as any
  );

  // Run tool
  try {
    const result = await detect_objects_in_image(
      {
        imageSource,
        prompt,
        outputFilePath,
        viewportWidth,
        viewportHeight,
        options: parseOptions(options),
      },
      config,
      imageProvider,
      imageFileService
    );

    console.log(formatOutput(result, 'json' in options));
  } catch (error) {
    handleError(error, 'json' in options);
  }
}
