/**
 * Video token estimation utilities
 * Provides functions to estimate token usage for video analysis
 */

// Constants
export const CONTEXT_WARNING_THRESHOLD = 0.8; // 80% of context window
export const CONTEXT_CRITICAL_THRESHOLD = 0.95; // 95% of context window
export const DEFAULT_FPS = 1;
export const DEFAULT_RESOLUTION: 'low' | 'medium' | 'high' = 'low';

// Resolution token rates (tokens per second)
const RESOLUTION_TOKEN_RATES = {
  low: 100,
  medium: 180,
  high: 300,
};

// Context window sizes for different models
const DEFAULT_CONTEXT_WINDOW = 1_000_000;
const GEMINI_2_5_CONTEXT_WINDOW = 1_048_576; // 1M tokens

/**
 * Calculate estimated tokens for a video based on duration, FPS, and resolution
 *
 * @param durationSeconds - Video duration in seconds
 * @param fps - Frames per second (default: 1)
 * @param resolution - Resolution tier: 'low' | 'medium' | 'high' (default: 'low')
 * @returns Estimated token count
 */
export function calculateVideoTokens(
  durationSeconds: number,
  fps: number = DEFAULT_FPS,
  resolution: 'low' | 'medium' | 'high' = DEFAULT_RESOLUTION
): number {
  if (durationSeconds <= 0) {
    return 0;
  }

  if (fps <= 0) {
    throw new Error('FPS must be positive');
  }

  const tokensPerSecond = RESOLUTION_TOKEN_RATES[resolution];
  // Apply FPS factor - higher FPS means more frames sampled
  const fpsFactor = Math.min(fps, 30) / DEFAULT_FPS;

  return Math.ceil(durationSeconds * tokensPerSecond * fpsFactor);
}

/**
 * Get the context window size for a given model
 *
 * @param model - Model name string
 * @returns Context window size in tokens
 */
export function getContextWindowForModel(model: string = ''): number {
  const normalizedModel = model.toLowerCase().trim();

  // Gemini 2.5 series: 1M context window
  if (
    normalizedModel.includes('gemini-2.5') ||
    normalizedModel.includes('gemini 2.5')
  ) {
    return GEMINI_2_5_CONTEXT_WINDOW;
  }

  // Gemini 2.0 series: 1M context window
  if (
    normalizedModel.includes('gemini-2.0') ||
    normalizedModel.includes('gemini 2.0')
  ) {
    return GEMINI_2_5_CONTEXT_WINDOW;
  }

  // Default context window
  return DEFAULT_CONTEXT_WINDOW;
}

/**
 * Validation result interface
 */
export interface VideoContextValidation {
  /** Estimated tokens for the video */
  estimatedTokens: number;
  /** Context window size for the model */
  contextWindow: number;
  /** Whether the video fits within context window */
  fits: boolean;
  /** Utilization ratio (0-1) */
  utilization: number;
  /** Warning message if approaching limits */
  warning?: string;
  /** Suggestions for optimization */
  suggestions: string[];
}

/**
 * Validate video context window usage
 *
 * @param options - Validation options
 * @returns Validation result with recommendations
 */
export function validateVideoContext(options: {
  durationSeconds: number;
  fps?: number;
  resolution?: 'low' | 'medium' | 'high';
  model?: string;
  promptTokens?: number;
}): VideoContextValidation {
  const {
    durationSeconds,
    fps = DEFAULT_FPS,
    resolution = DEFAULT_RESOLUTION,
    model = '',
    promptTokens = 0,
  } = options;

  // Calculate estimated tokens
  const videoTokens = calculateVideoTokens(durationSeconds, fps, resolution);
  const estimatedTokens = videoTokens + promptTokens;
  const contextWindow = getContextWindowForModel(model);
  const utilization = estimatedTokens / contextWindow;
  const fits = utilization <= 1;

  // Build suggestions and warnings
  const suggestions: string[] = [];
  let warning: string | undefined;

  if (utilization > CONTEXT_CRITICAL_THRESHOLD) {
    warning = `Critical: Video uses ${(utilization * 100).toFixed(1)}% of context window. Risk of truncation or failure.`;
    suggestions.push('Reduce video duration');
    suggestions.push('Lower the resolution setting to "low"');
    suggestions.push('Reduce FPS (e.g., to 0.5 or 0.25)');
    suggestions.push('Shorten your prompt');
  } else if (utilization > CONTEXT_WARNING_THRESHOLD) {
    warning = `Warning: Video uses ${(utilization * 100).toFixed(1)}% of context window.`;
    suggestions.push('Consider reducing FPS to save tokens');
    suggestions.push('Consider using "low" resolution if quality permits');
  }

  if (!fits) {
    warning = `Error: Video exceeds context window by ${(estimatedTokens - contextWindow).toLocaleString()} tokens.`;
    suggestions.unshift('Significantly reduce video duration or use video clipping');
  }

  return {
    estimatedTokens,
    contextWindow,
    fits,
    utilization,
    warning,
    suggestions,
  };
}

/**
 * Format duration in seconds to human-readable string
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string like "5m 30s" or "2h 15m"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) {
    return '0s';
  }

  if (seconds === 0) {
    return '0s';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (remainingSeconds > 0 && hours === 0) {
    // Only show seconds if no hours, or if it's the only unit
    parts.push(`${remainingSeconds}s`);
  }

  // Handle edge case: less than 1 second
  if (parts.length === 0 && seconds > 0) {
    return '<1s';
  }

  return parts.join(' ');
}
