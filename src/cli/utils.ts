import type { AnalysisResult } from '../types/Providers.js';
import type { ObjectDetectionResponse } from '../types/ObjectDetection.js';

export function parseOptions(options: Record<string, string>): {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
} {
  const result: Record<string, number> = {};

  if (options.temperature) {
    result.temperature = parseFloat(options.temperature);
  }
  if (options['top-p'] || options.topP) {
    result.topP = parseFloat(options['top-p'] || options.topP);
  }
  if (options['top-k'] || options.topK) {
    result.topK = parseInt(options['top-k'] || options.topK);
  }
  if (options['max-tokens'] || options.maxTokens) {
    result.maxTokens = parseInt(options['max-tokens'] || options.maxTokens);
  }

  return result;
}

export function formatOutput(
  result: AnalysisResult | ObjectDetectionResponse,
  jsonMode?: boolean
): string {
  if (jsonMode) {
    return JSON.stringify(result, null, 2);
  }

  // Human-readable format
  if ('text' in result) {
    return result.text;
  }

  if ('detections' in result) {
    return result.summary || JSON.stringify(result.detections, null, 2);
  }

  return JSON.stringify(result, null, 2);
}

export function handleError(error: unknown, jsonMode?: boolean): never {
  if (jsonMode) {
    // Output JSON error to stdout
    const errorResponse = {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
    console.log(JSON.stringify(errorResponse, null, 2));
  } else {
    // Output human-readable error to stderr
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred');
    }
  }
  process.exit(1);
}

export function parseArgs(args: string[]): { positional: string[]; options: Record<string, string> } {
  const positional: string[] = [];
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace('--', '');
      // Look ahead to see if next arg is a value or another option
      const nextArg = args[i + 1];
      if (nextArg !== undefined && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++; // Skip the value
      } else {
        // Flag option without value (like --json)
        options[key] = '';
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, options };
}
