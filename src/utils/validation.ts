/**
 * Zod schemas for data validation
 */

import { z } from 'zod';
import type { Config } from '../types/Config.js';
import type { AnalysisOptions } from '../types/Analysis.js';
import {
  FUNCTION_NAMES,
  type FunctionName,
} from '../constants/FunctionNames.js';

// Provider selection schemas
const ProviderSchema = z.enum(['google', 'vertex_ai']);

// Log level schema
const LogLevelSchema = z.enum(['info', 'debug', 'warn', 'error']);

// Node environment schema
const NodeEnvSchema = z.enum(['development', 'production']);

// File format schemas
const ImageFormatSchema = z.enum([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'bmp',
  'tiff',
]);

const VideoFormatSchema = z.enum([
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm',
  'flv',
  'wmv',
  '3gp',
]);

// Configuration schema
export const ConfigSchema = z.object({
  IMAGE_PROVIDER: ProviderSchema.optional().default('google'),
  VIDEO_PROVIDER: ProviderSchema.optional().default('google'),

  // Model configuration
  IMAGE_MODEL: z.string().min(1).optional(),
  VIDEO_MODEL: z.string().min(1).optional(),

  // Function-specific model configuration
  ANALYZE_IMAGE_MODEL: z.string().min(1).optional(),
  COMPARE_IMAGES_MODEL: z.string().min(1).optional(),
  DETECT_OBJECTS_IN_IMAGE_MODEL: z.string().min(1).optional(),
  ANALYZE_VIDEO_MODEL: z.string().min(1).optional(),

  // Gemini API configuration
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_BASE_URL: z
    .string()
    .url()
    .optional()
    .default('https://generativelanguage.googleapis.com'),

  // Vertex AI configuration
  VERTEX_CREDENTIALS: z.string().min(1).optional(),
  VERTEX_PROJECT_ID: z.string().min(1).optional(),
  VERTEX_LOCATION: z.string().min(1).optional().default('us-central1'),
  VERTEX_ENDPOINT: z
    .string()
    .url()
    .optional()
    .default('https://aiplatform.googleapis.com'),

  // Google Cloud Storage configuration (for Vertex AI file storage)
  GCS_BUCKET_NAME: z.string().min(1).optional(),
  GCS_PROJECT_ID: z.string().min(1).optional(), // Auto-derived from credentials
  GCS_CREDENTIALS: z.string().min(1).optional(), // Defaults to VERTEX_CREDENTIALS
  GCS_REGION: z.string().min(1).optional().default('us-central1'),

  // Universal API parameters
  TEMPERATURE: z.coerce.number().min(0).max(2).optional().default(0.8),
  TOP_P: z.coerce.number().min(0).max(1).optional().default(0.95),
  TOP_K: z.coerce.number().int().min(1).max(100).optional().default(30),
  MAX_TOKENS: z.coerce.number().int().min(1).max(8192).optional().default(1000),

  // Task-specific API parameters
  TEMPERATURE_FOR_IMAGE: z.number().min(0).max(2).optional(),
  TOP_P_FOR_IMAGE: z.number().min(0).max(1).optional(),
  TOP_K_FOR_IMAGE: z.number().int().positive().optional(),
  MAX_TOKENS_FOR_IMAGE: z.number().int().positive().optional(),
  TEMPERATURE_FOR_VIDEO: z.number().min(0).max(2).optional(),
  TOP_P_FOR_VIDEO: z.number().min(0).max(1).optional(),
  TOP_K_FOR_VIDEO: z.number().int().positive().optional(),
  MAX_TOKENS_FOR_VIDEO: z.number().int().positive().optional(),

  // Function-specific API parameters
  TEMPERATURE_FOR_ANALYZE_IMAGE: z.number().min(0).max(2).optional(),
  TOP_P_FOR_ANALYZE_IMAGE: z.number().min(0).max(1).optional(),
  TOP_K_FOR_ANALYZE_IMAGE: z.number().int().positive().optional(),
  MAX_TOKENS_FOR_ANALYZE_IMAGE: z.number().int().positive().optional(),
  TEMPERATURE_FOR_COMPARE_IMAGES: z.number().min(0).max(2).optional(),
  TOP_P_FOR_COMPARE_IMAGES: z.number().min(0).max(1).optional(),
  TOP_K_FOR_COMPARE_IMAGES: z.number().int().positive().optional(),
  MAX_TOKENS_FOR_COMPARE_IMAGES: z.number().int().positive().optional(),
  TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE: z.number().min(0).max(2).optional().default(0),
  TOP_P_FOR_DETECT_OBJECTS_IN_IMAGE: z.number().min(0).max(1).optional(),
  TOP_K_FOR_DETECT_OBJECTS_IN_IMAGE: z.number().int().positive().optional(),
  MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE: z.number().int().positive().optional().default(2048),
  TEMPERATURE_FOR_ANALYZE_VIDEO: z.number().min(0).max(2).optional(),
  TOP_P_FOR_ANALYZE_VIDEO: z.number().min(0).max(1).optional(),
  TOP_K_FOR_ANALYZE_VIDEO: z.number().int().positive().optional(),
  MAX_TOKENS_FOR_ANALYZE_VIDEO: z.number().int().positive().optional(),

  // File processing configuration
  MAX_IMAGE_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(20 * 1024 * 1024), // 20MB
  MAX_VIDEO_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(2 * 1024 * 1024 * 1024), // 2GB
  ALLOWED_IMAGE_FORMATS: z
    .array(ImageFormatSchema)
    .optional()
    .default(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff']),
  ALLOWED_VIDEO_FORMATS: z
    .array(VideoFormatSchema)
    .optional()
    .default(['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', '3gp']),
  MAX_VIDEO_DURATION: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(3600), // 1 hour
  MAX_IMAGES_FOR_COMPARISON: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(4), // Maximum 4 images for comparison

  // File upload configuration
  GEMINI_FILES_API_THRESHOLD: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(10 * 1024 * 1024), // 10MB
  VERTEX_AI_FILES_API_THRESHOLD: z.coerce.number().int().optional().default(0), // Vertex AI requires external storage for all files

  // Logging configuration
  LOG_LEVEL: LogLevelSchema.optional().default('info'),

  // Development configuration
  NODE_ENV: NodeEnvSchema.optional().default('development'),
});

// Analysis options schema
export const AnalysisOptionsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  stopSequences: z.array(z.string()).optional(),
  taskType: z.enum(['image', 'video']).optional(),
  functionName: z
    .enum(Object.values(FUNCTION_NAMES) as [FunctionName, ...FunctionName[]])
    .optional(),
});

// MCP tool argument schemas
export const AnalyzeImageArgsSchema = z.object({
  imageSource: z.string().min(1, 'Image source is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  options: AnalysisOptionsSchema.optional(),
});

export const AnalyzeVideoArgsSchema = z.object({
  videoSource: z.string().min(1, 'Video source is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  options: AnalysisOptionsSchema.optional(),
});

// File validation schemas
export const FileValidationSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  size: z.number().int().nonnegative('File size must be non-negative'),
});

// URL validation schema
export const UrlSchema = z.string().url('Invalid URL format');

// Base64 validation schema
export const Base64Schema = z
  .string()
  .regex(/^data:image\/[a-zA-Z]+;base64,/, 'Invalid base64 image format');

// Model name validation
export const ModelNameSchema = z.string().min(1, 'Model name is required');

// Provider info validation
export const ProviderInfoSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  type: z.enum(['image', 'video']),
  models: z.object({
    image: ModelNameSchema,
    video: ModelNameSchema,
  }),
  credentials: z.record(z.string()),
  options: z.record(z.unknown()).optional(),
});

// Health status validation
export const HealthStatusSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  message: z.string().optional(),
  lastCheck: z.string().datetime(),
  responseTime: z.number().nonnegative().optional(),
});

// Usage metadata validation
export const UsageMetadataSchema = z.object({
  promptTokenCount: z.number().int().nonnegative(),
  candidatesTokenCount: z.number().int().nonnegative(),
  totalTokenCount: z.number().int().nonnegative(),
});

// Analysis result validation
export const AnalysisResultSchema = z.object({
  text: z.string(),
  metadata: z.object({
    model: z.string(),
    provider: z.string(),
    usage: UsageMetadataSchema.optional(),
    processingTime: z.number().nonnegative().optional(),
    fileType: z.string().optional(),
    fileSize: z.number().int().nonnegative().optional(),
  }),
});

// File reference validation
export const FileReferenceSchema = z.union([
  z.object({
    type: z.literal('file_uri'),
    uri: z.string().min(1),
    mimeType: z.string().min(1),
  }),
  z.object({
    type: z.literal('public_url'),
    url: z.string().url(),
    mimeType: z.string().min(1),
  }),
  z.object({
    type: z.literal('base64'),
    data: z.string().min(1),
    mimeType: z.string().min(1),
  }),
]);

// Validation functions
export const validateConfig = (config: unknown): Config => {
  return ConfigSchema.parse(config);
};

export const validateAnalysisOptions = (options: unknown): AnalysisOptions => {
  return AnalysisOptionsSchema.parse(options);
};

export const validateAnalyzeImageArgs = (args: unknown) => {
  return AnalyzeImageArgsSchema.parse(args);
};

export const validateAnalyzeVideoArgs = (args: unknown) => {
  return AnalyzeVideoArgsSchema.parse(args);
};

export const validateFile = (file: unknown) => {
  return FileValidationSchema.parse(file);
};

export const validateUrl = (url: unknown): string => {
  return UrlSchema.parse(url);
};

export const validateBase64 = (base64: unknown): string => {
  return Base64Schema.parse(base64);
};

export const validateModelName = (model: unknown): string => {
  return ModelNameSchema.parse(model);
};

export const validateHealthStatus = (status: unknown) => {
  return HealthStatusSchema.parse(status);
};

export const validateAnalysisResult = (result: unknown) => {
  return AnalysisResultSchema.parse(result);
};

export const validateFileReference = (reference: unknown) => {
  return FileReferenceSchema.parse(reference);
};

// Type guards
export const isValidUrl = (value: unknown): value is string => {
  return UrlSchema.safeParse(value).success;
};

export const isValidBase64 = (value: unknown): value is string => {
  return Base64Schema.safeParse(value).success;
};

export const isImageFormat = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

export const isVideoFormat = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

export const isSupportedImageFormat = (
  mimeType: string,
  supportedFormats: string[]
): boolean => {
  const extension = mimeType.split('/')[1];
  return supportedFormats.includes(extension);
};

export const isSupportedVideoFormat = (
  mimeType: string,
  supportedFormats: string[]
): boolean => {
  const extension = mimeType.split('/')[1];
  return supportedFormats.includes(extension);
};

// Error formatting for validation errors
export const formatZodError = (error: z.ZodError): string => {
  const errorMessages = error.errors.map(err => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
  return `Validation failed: ${errorMessages.join(', ')}`;
};
