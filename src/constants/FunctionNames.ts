/**
 * Centralized function name constants to avoid hard-coding
 */

export const FUNCTION_NAMES = {
  ANALYZE_IMAGE: 'analyze_image',
  COMPARE_IMAGES: 'compare_images',
  DETECT_OBJECTS_IN_IMAGE: 'detect_objects_in_image',
  ANALYZE_VIDEO: 'analyze_video',
} as const;

export type FunctionName = (typeof FUNCTION_NAMES)[keyof typeof FUNCTION_NAMES];

// Union types for different function groups
export const IMAGE_FUNCTIONS = [
  FUNCTION_NAMES.ANALYZE_IMAGE,
  FUNCTION_NAMES.COMPARE_IMAGES,
  FUNCTION_NAMES.DETECT_OBJECTS_IN_IMAGE,
] as const;

export const VIDEO_FUNCTIONS = [FUNCTION_NAMES.ANALYZE_VIDEO] as const;

export const ALL_FUNCTIONS = [...IMAGE_FUNCTIONS, ...VIDEO_FUNCTIONS] as const;

// Type helpers
export type ImageFunctionName = (typeof IMAGE_FUNCTIONS)[number];
export type VideoFunctionName = (typeof VIDEO_FUNCTIONS)[number];
export type AllFunctionName = (typeof ALL_FUNCTIONS)[number];
