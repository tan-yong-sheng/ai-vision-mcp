import type { Config } from '../../types/Config.js';
import { ConfigService } from '../../services/ConfigService.js';
import { VisionProviderFactory } from '../../providers/factory/ProviderFactory.js';
import { FileService } from '../../services/FileService.js';
import { extract_layout_tree } from '../../tools/extract_layout_tree.js';
import { parseOptions, formatOutput, handleError, parseArgs } from '../utils.js';

export async function runExtractLayoutTree(args: string[], config: Config): Promise<void> {
  // Parse arguments
  const { positional, options } = parseArgs(args);

  if (positional.length < 1) {
    console.error('Error: Image source required');
    console.error('Usage: ai-vision extract-layout-tree <source>');
    process.exit(1);
  }

  const imageSource = positional[0];

  // Initialize services
  const configService = ConfigService.getInstance();
  const imageProvider = VisionProviderFactory.createProviderWithValidation(config, 'image');
  const imageFileService = new FileService(configService, 'image', imageProvider as any);

  // Run tool
  try {
    const result = await extract_layout_tree(
      { imageSource, options: parseOptions(options) },
      config,
      imageProvider,
      imageFileService
    );

    console.log(formatOutput(result, 'json' in options));
  } catch (error) {
    handleError(error, 'json' in options);
  }
}
