#!/usr/bin/env node
import type { Config } from '../types/Config.js';
import { ConfigService } from '../services/ConfigService.js';
import { runAnalyzeImage } from './commands/analyze-image.js';
import { runCompareImages } from './commands/compare-images.js';
import { runDetectObjects } from './commands/detect-objects.js';
import { runAnalyzeVideo } from './commands/analyze-video.js';

export async function runCli(args: string[]): Promise<void> {
  const command = args[0];
  const commandArgs = args.slice(1);

  // Initialize services (same as MCP mode)
  const configService = ConfigService.getInstance();
  const config = configService.getConfig();

  switch (command) {
    case 'analyze-image':
      await runAnalyzeImage(commandArgs, config);
      break;
    case 'compare-images':
      await runCompareImages(commandArgs, config);
      break;
    case 'detect-objects':
      await runDetectObjects(commandArgs, config);
      break;
    case 'analyze-video':
      await runAnalyzeVideo(commandArgs, config);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
ai-vision CLI

Usage: ai-vision <command> [options]

Commands:
  analyze-image <source>       Analyze an image
  compare-images <sources...>  Compare multiple images (2-4)
  detect-objects <source>      Detect objects in an image
  analyze-video <source>       Analyze a video

Global Options:
  --prompt <text>              The analysis prompt (required)
  --json                       Output raw JSON
  --temperature <num>          Temperature 0-2 (default: 0.7)
  --top-p <num>                Top P 0-1
  --top-k <num>                Top K 1-100
  --max-tokens <num>           Max output tokens
  --help                       Show this help

Examples:
  ai-vision analyze-image https://example.com/img.jpg --prompt "describe"
  ai-vision compare-images img1.jpg img2.jpg --prompt "find differences" --json
  ai-vision detect-objects photo.jpg --prompt "find all cars" --output annotated.jpg
`);
}
