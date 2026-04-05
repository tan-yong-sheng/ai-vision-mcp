/**
 * Configuration service for managing environment variables and settings
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import type {
  Config,
  GeminiConfig,
  VertexAIConfig,
  GCSConfig,
  ApiConfig,
  FileProcessingConfig,
  LoggingConfig,
  DevelopmentConfig,
} from '../types/Config.js';
import { LoggerService } from './LoggerService.js';
import { ConfigurationError } from '../types/Errors.js';
import {
  type FunctionName,
  FUNCTION_NAMES,
} from '../constants/FunctionNames.js';
import { validateConfig, formatZodError } from '../utils/validation.js';

/**
 * Search up the directory tree for .env file (equivalent to Python's find_dotenv)
 */
function findDotEnv(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

// Find and load environment variables from .env file
const envPath = findDotEnv();
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

export class ConfigService {
  private static instance: ConfigService;
  private static readonly DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-lite-preview';
  private static readonly DEFAULT_VIDEO_MODEL = 'gemini-3.1-flash-lite-preview';
  private config: Config;
  private loggedSummary = false;
  private logger = LoggerService.getInstance('ai-vision-mcp');

  private constructor() {
    this.config = this.loadConfig();
    this.logModelResolutionSummaryOnce();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public static load(): Config {
    return ConfigService.getInstance().getConfig();
  }

  private logModelResolutionSummaryOnce(): void {
    if (this.loggedSummary) return;

    const enabled =
      process.env.AI_VISION_LOG_MODELS === '1' ||
      process.env.LOG_LEVEL === 'debug';
    if (!enabled) return;

    this.loggedSummary = true;

    const cfg = this.config;

    const resolve = (
      taskType: 'image' | 'video',
      functionName: FunctionName
    ): string => {
      const fnSpecific = this.getModelForFunction(functionName);
      if (fnSpecific) return fnSpecific;

      const taskSpecific =
        taskType === 'image' ? cfg.IMAGE_MODEL : cfg.VIDEO_MODEL;
      if (taskSpecific) return taskSpecific;

      return taskType === 'image'
        ? ConfigService.getDefaultImageModel()
        : ConfigService.getDefaultVideoModel();
    };

    void this.logger.info(
      {
        msg: 'Config loaded (model resolution summary)',
        NODE_ENV: cfg.NODE_ENV,
        IMAGE_PROVIDER: cfg.IMAGE_PROVIDER,
        VIDEO_PROVIDER: cfg.VIDEO_PROVIDER,
        GEMINI_BASE_URL: cfg.GEMINI_BASE_URL,
        IMAGE_MODEL: cfg.IMAGE_MODEL ?? null,
        VIDEO_MODEL: cfg.VIDEO_MODEL ?? null,
        function_models: {
          ANALYZE_IMAGE_MODEL: cfg.ANALYZE_IMAGE_MODEL ?? null,
          COMPARE_IMAGES_MODEL: cfg.COMPARE_IMAGES_MODEL ?? null,
          DETECT_OBJECTS_IN_IMAGE_MODEL:
            cfg.DETECT_OBJECTS_IN_IMAGE_MODEL ?? null,
          ANALYZE_VIDEO_MODEL: cfg.ANALYZE_VIDEO_MODEL ?? null,
        },
        resolved_models: {
          analyze_image: resolve('image', FUNCTION_NAMES.ANALYZE_IMAGE),
          compare_images: resolve('image', FUNCTION_NAMES.COMPARE_IMAGES),
          detect_objects_in_image: resolve(
            'image',
            FUNCTION_NAMES.DETECT_OBJECTS_IN_IMAGE
          ),
          analyze_video: resolve('video', FUNCTION_NAMES.ANALYZE_VIDEO),
        },
      },
      'config'
    );
  }

  private loadConfig(): Config {
    try {
      // Track which providers are explicitly set vs defaulted
      const imageProviderExplicitlySet = !!process.env.IMAGE_PROVIDER;
      const videoProviderExplicitlySet = !!process.env.VIDEO_PROVIDER;

      const rawConfig: Record<string, unknown> = {
        IMAGE_PROVIDER: process.env.IMAGE_PROVIDER || 'google',
        VIDEO_PROVIDER: process.env.VIDEO_PROVIDER || 'google',

        // Gemini API configuration
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_BASE_URL:
          process.env.GEMINI_BASE_URL ||
          'https://generativelanguage.googleapis.com',

        // Vertex AI configuration (simplified credentials)
        VERTEX_CLIENT_EMAIL: process.env.VERTEX_CLIENT_EMAIL,
        // GitHub Secrets / env vars often store private keys with literal "\\n".
        // Normalize to actual newlines so OpenSSL can parse the PEM.
        VERTEX_PRIVATE_KEY: process.env.VERTEX_PRIVATE_KEY?.includes('\\n')
          ? process.env.VERTEX_PRIVATE_KEY.replace(/\\n/g, '\n')
          : process.env.VERTEX_PRIVATE_KEY,
        VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
        VERTEX_LOCATION: process.env.VERTEX_LOCATION || 'us-central1',
        VERTEX_ENDPOINT:
          process.env.VERTEX_ENDPOINT || 'https://aiplatform.googleapis.com',

        // Model configuration
        IMAGE_MODEL: process.env.IMAGE_MODEL,
        VIDEO_MODEL: process.env.VIDEO_MODEL,

        // Function-specific model configuration
        ANALYZE_IMAGE_MODEL: process.env.ANALYZE_IMAGE_MODEL,
        COMPARE_IMAGES_MODEL: process.env.COMPARE_IMAGES_MODEL,
        DETECT_OBJECTS_IN_IMAGE_MODEL:
          process.env.DETECT_OBJECTS_IN_IMAGE_MODEL,
        ANALYZE_VIDEO_MODEL: process.env.ANALYZE_VIDEO_MODEL,

        // Google Cloud Storage configuration (uses Vertex AI credentials)
        GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,

        // Universal API parameters
        TEMPERATURE: process.env.TEMPERATURE
          ? parseFloat(process.env.TEMPERATURE)
          : 0.8,
        TOP_P: process.env.TOP_P ? parseFloat(process.env.TOP_P) : 0.95,
        TOP_K: process.env.TOP_K ? parseInt(process.env.TOP_K, 10) : 30,
        MAX_TOKENS: process.env.MAX_TOKENS
          ? parseInt(process.env.MAX_TOKENS, 10)
          : 1000,

        // Task-specific API parameters
        TEMPERATURE_FOR_IMAGE: process.env.TEMPERATURE_FOR_IMAGE
          ? parseFloat(process.env.TEMPERATURE_FOR_IMAGE)
          : undefined,
        TOP_P_FOR_IMAGE: process.env.TOP_P_FOR_IMAGE
          ? parseFloat(process.env.TOP_P_FOR_IMAGE)
          : undefined,
        TOP_K_FOR_IMAGE: process.env.TOP_K_FOR_IMAGE
          ? parseInt(process.env.TOP_K_FOR_IMAGE, 10)
          : undefined,
        MAX_TOKENS_FOR_IMAGE: process.env.MAX_TOKENS_FOR_IMAGE
          ? parseInt(process.env.MAX_TOKENS_FOR_IMAGE, 10)
          : undefined,
        TEMPERATURE_FOR_VIDEO: process.env.TEMPERATURE_FOR_VIDEO
          ? parseFloat(process.env.TEMPERATURE_FOR_VIDEO)
          : undefined,
        TOP_P_FOR_VIDEO: process.env.TOP_P_FOR_VIDEO
          ? parseFloat(process.env.TOP_P_FOR_VIDEO)
          : undefined,
        TOP_K_FOR_VIDEO: process.env.TOP_K_FOR_VIDEO
          ? parseInt(process.env.TOP_K_FOR_VIDEO, 10)
          : undefined,
        MAX_TOKENS_FOR_VIDEO: process.env.MAX_TOKENS_FOR_VIDEO
          ? parseInt(process.env.MAX_TOKENS_FOR_VIDEO, 10)
          : undefined,

        // Function-specific API parameters
        TEMPERATURE_FOR_ANALYZE_IMAGE: process.env.TEMPERATURE_FOR_ANALYZE_IMAGE
          ? parseFloat(process.env.TEMPERATURE_FOR_ANALYZE_IMAGE)
          : undefined,
        TOP_P_FOR_ANALYZE_IMAGE: process.env.TOP_P_FOR_ANALYZE_IMAGE
          ? parseFloat(process.env.TOP_P_FOR_ANALYZE_IMAGE)
          : undefined,
        TOP_K_FOR_ANALYZE_IMAGE: process.env.TOP_K_FOR_ANALYZE_IMAGE
          ? parseInt(process.env.TOP_K_FOR_ANALYZE_IMAGE, 10)
          : undefined,
        MAX_TOKENS_FOR_ANALYZE_IMAGE: process.env.MAX_TOKENS_FOR_ANALYZE_IMAGE
          ? parseInt(process.env.MAX_TOKENS_FOR_ANALYZE_IMAGE, 10)
          : undefined,
        TEMPERATURE_FOR_COMPARE_IMAGES: process.env
          .TEMPERATURE_FOR_COMPARE_IMAGES
          ? parseFloat(process.env.TEMPERATURE_FOR_COMPARE_IMAGES)
          : undefined,
        TOP_P_FOR_COMPARE_IMAGES: process.env.TOP_P_FOR_COMPARE_IMAGES
          ? parseFloat(process.env.TOP_P_FOR_COMPARE_IMAGES)
          : undefined,
        TOP_K_FOR_COMPARE_IMAGES: process.env.TOP_K_FOR_COMPARE_IMAGES
          ? parseInt(process.env.TOP_K_FOR_COMPARE_IMAGES, 10)
          : undefined,
        MAX_TOKENS_FOR_COMPARE_IMAGES: process.env.MAX_TOKENS_FOR_COMPARE_IMAGES
          ? parseInt(process.env.MAX_TOKENS_FOR_COMPARE_IMAGES, 10)
          : undefined,
        TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE: process.env
          .TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE
          ? parseFloat(process.env.TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE)
          : 0, // Default to 0 for deterministic object detection
        TOP_P_FOR_DETECT_OBJECTS_IN_IMAGE: process.env
          .TOP_P_FOR_DETECT_OBJECTS_IN_IMAGE
          ? parseFloat(process.env.TOP_P_FOR_DETECT_OBJECTS_IN_IMAGE)
          : undefined,
        TOP_K_FOR_DETECT_OBJECTS_IN_IMAGE: process.env
          .TOP_K_FOR_DETECT_OBJECTS_IN_IMAGE
          ? parseInt(process.env.TOP_K_FOR_DETECT_OBJECTS_IN_IMAGE, 10)
          : undefined,
        MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE: process.env
          .MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE
          ? parseInt(process.env.MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE, 10)
          : undefined,
        TEMPERATURE_FOR_ANALYZE_VIDEO: process.env.TEMPERATURE_FOR_ANALYZE_VIDEO
          ? parseFloat(process.env.TEMPERATURE_FOR_ANALYZE_VIDEO)
          : undefined,
        TOP_P_FOR_ANALYZE_VIDEO: process.env.TOP_P_FOR_ANALYZE_VIDEO
          ? parseFloat(process.env.TOP_P_FOR_ANALYZE_VIDEO)
          : undefined,
        TOP_K_FOR_ANALYZE_VIDEO: process.env.TOP_K_FOR_ANALYZE_VIDEO
          ? parseInt(process.env.TOP_K_FOR_ANALYZE_VIDEO, 10)
          : undefined,
        MAX_TOKENS_FOR_ANALYZE_VIDEO: process.env.MAX_TOKENS_FOR_ANALYZE_VIDEO
          ? parseInt(process.env.MAX_TOKENS_FOR_ANALYZE_VIDEO, 10)
          : undefined,
        TEMPERATURE_FOR_AUDIT_DESIGN: process.env.TEMPERATURE_FOR_AUDIT_DESIGN
          ? parseFloat(process.env.TEMPERATURE_FOR_AUDIT_DESIGN)
          : 0, // Default to 0 for deterministic design auditing
        TOP_P_FOR_AUDIT_DESIGN: process.env.TOP_P_FOR_AUDIT_DESIGN
          ? parseFloat(process.env.TOP_P_FOR_AUDIT_DESIGN)
          : undefined,
        TOP_K_FOR_AUDIT_DESIGN: process.env.TOP_K_FOR_AUDIT_DESIGN
          ? parseInt(process.env.TOP_K_FOR_AUDIT_DESIGN, 10)
          : undefined,
        MAX_TOKENS_FOR_AUDIT_DESIGN: process.env.MAX_TOKENS_FOR_AUDIT_DESIGN
          ? parseInt(process.env.MAX_TOKENS_FOR_AUDIT_DESIGN, 10)
          : undefined,

        // File processing configuration
        MAX_IMAGE_SIZE: process.env.MAX_IMAGE_SIZE
          ? parseInt(process.env.MAX_IMAGE_SIZE, 10)
          : 20 * 1024 * 1024,
        MAX_VIDEO_SIZE: process.env.MAX_VIDEO_SIZE
          ? parseInt(process.env.MAX_VIDEO_SIZE, 10)
          : 2 * 1024 * 1024 * 1024,
        ALLOWED_IMAGE_FORMATS: process.env.ALLOWED_IMAGE_FORMATS?.split(
          ','
        ).map(f => f.trim()) || [
          'png',
          'jpg',
          'jpeg',
          'webp',
          'gif',
          'bmp',
          'tiff',
        ],
        ALLOWED_VIDEO_FORMATS: process.env.ALLOWED_VIDEO_FORMATS?.split(
          ','
        ).map(f => f.trim()) || [
          'mp4',
          'mov',
          'avi',
          'mkv',
          'webm',
          'flv',
          'wmv',
          '3gp',
        ],
        MAX_VIDEO_DURATION: process.env.MAX_VIDEO_DURATION
          ? parseInt(process.env.MAX_VIDEO_DURATION, 10)
          : 3600,
        MAX_IMAGES_FOR_COMPARISON: process.env.MAX_IMAGES_FOR_COMPARISON
          ? parseInt(process.env.MAX_IMAGES_FOR_COMPARISON, 4)
          : 4,

        // File upload configuration
        GEMINI_FILES_API_THRESHOLD: process.env.GEMINI_FILES_API_THRESHOLD
          ? parseInt(process.env.GEMINI_FILES_API_THRESHOLD, 10)
          : 10 * 1024 * 1024,
        VERTEX_AI_FILES_API_THRESHOLD: process.env.VERTEX_AI_FILES_API_THRESHOLD
          ? parseInt(process.env.VERTEX_AI_FILES_API_THRESHOLD, 10)
          : 0,

        // YouTube API configuration
        YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,

        // Logging configuration
        LOG_LEVEL:
          (process.env.LOG_LEVEL as 'info' | 'debug' | 'warn' | 'error') ||
          'info',

        // Development configuration
        NODE_ENV:
          (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
          'development',
      };

      const config = validateConfig(rawConfig);
      this.validateRequiredFields(config);
      this.logProviderWarnings(config, imageProviderExplicitlySet, videoProviderExplicitlySet);
      return config;
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        throw new ConfigurationError(formatZodError(error as any));
      }
      throw error;
    }
  }

  private validateRequiredFields(config: Config): void {
    const imageProvider = config.IMAGE_PROVIDER;
    const videoProvider = config.VIDEO_PROVIDER;

    // Validate Gemini API configuration
    if (imageProvider === 'google' || videoProvider === 'google') {
      if (!config.GEMINI_API_KEY) {
        throw new ConfigurationError(
          'GEMINI_API_KEY is required when using Gemini API provider',
          'GEMINI_API_KEY'
        );
      }
    }

    // Validate Vertex AI configuration
    if (imageProvider === 'vertex_ai' || videoProvider === 'vertex_ai') {
      if (!config.VERTEX_CLIENT_EMAIL) {
        throw new ConfigurationError(
          'VERTEX_CLIENT_EMAIL is required when using Vertex AI provider',
          'VERTEX_CLIENT_EMAIL'
        );
      }
      if (!config.VERTEX_PRIVATE_KEY) {
        throw new ConfigurationError(
          'VERTEX_PRIVATE_KEY is required when using Vertex AI provider',
          'VERTEX_PRIVATE_KEY'
        );
      }
      if (!config.VERTEX_PROJECT_ID) {
        throw new ConfigurationError(
          'VERTEX_PROJECT_ID is required when using Vertex AI provider',
          'VERTEX_PROJECT_ID'
        );
      }

      // GCS storage is required for Vertex AI video processing
      if (!config.GCS_BUCKET_NAME) {
        throw new ConfigurationError(
          'GCS_BUCKET_NAME is required when using Vertex AI provider'
        );
      }
    }
  }

  private logProviderWarnings(
    config: Config,
    imageProviderExplicitlySet: boolean,
    videoProviderExplicitlySet: boolean
  ): void {
    // Warn if IMAGE_PROVIDER defaults to google
    if (!imageProviderExplicitlySet && config.IMAGE_PROVIDER === 'google') {
      void this.logger.warn(
        {
          msg: 'IMAGE_PROVIDER defaults to google (Gemini API). Ensure GEMINI_API_KEY is set.',
        },
        'config'
      );
    }

    // Warn if VIDEO_PROVIDER defaults to google
    if (!videoProviderExplicitlySet && config.VIDEO_PROVIDER === 'google') {
      void this.logger.warn(
        {
          msg: 'VIDEO_PROVIDER defaults to google (Gemini API). Ensure GEMINI_API_KEY is set.',
        },
        'config'
      );
    }

    // Warn if vertex_ai is explicitly set
    if (imageProviderExplicitlySet && config.IMAGE_PROVIDER === 'vertex_ai') {
      void this.logger.warn(
        {
          msg: 'IMAGE_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME',
        },
        'config'
      );
    }

    if (videoProviderExplicitlySet && config.VIDEO_PROVIDER === 'vertex_ai') {
      void this.logger.warn(
        {
          msg: 'VIDEO_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME',
        },
        'config'
      );
    }
  }

  public getConfig(): Config {
    return this.config;
  }

  public getGeminiConfig(): GeminiConfig {
    if (!this.config.GEMINI_API_KEY) {
      throw new ConfigurationError(
        'Gemini API configuration is missing',
        'GEMINI_API_KEY'
      );
    }

    return {
      apiKey: this.config.GEMINI_API_KEY,
      baseUrl: this.config.GEMINI_BASE_URL!,
      imageModel: this.config.IMAGE_MODEL || ConfigService.getDefaultImageModel(),
      videoModel: this.config.VIDEO_MODEL || ConfigService.getDefaultVideoModel(),
    } as GeminiConfig;
  }

  public getVertexAIConfig(): VertexAIConfig {
    if (!this.config.VERTEX_PROJECT_ID) {
      throw new ConfigurationError(
        'Vertex AI configuration is missing',
        'VERTEX_PROJECT_ID'
      );
    }

    return {
      projectId: this.config.VERTEX_PROJECT_ID,
      location: this.config.VERTEX_LOCATION || 'us-central1',
      endpoint:
        this.config.VERTEX_ENDPOINT || 'https://aiplatform.googleapis.com',
      clientEmail: this.config.VERTEX_CLIENT_EMAIL,
      privateKey: this.config.VERTEX_PRIVATE_KEY,
      imageModel: this.config.IMAGE_MODEL || ConfigService.getDefaultImageModel(),
      videoModel: this.config.VIDEO_MODEL || ConfigService.getDefaultVideoModel(),
    };
  }

  public getGCSConfig(): GCSConfig {
    if (!this.config.GCS_BUCKET_NAME) {
      throw new ConfigurationError('GCS configuration is missing');
    }

    if (!this.config.VERTEX_PROJECT_ID) {
      throw new ConfigurationError('VERTEX_PROJECT_ID is missing');
    }

    if (!this.config.VERTEX_CLIENT_EMAIL) {
      throw new ConfigurationError('VERTEX_CLIENT_EMAIL is missing');
    }

    if (!this.config.VERTEX_PRIVATE_KEY) {
      throw new ConfigurationError('VERTEX_PRIVATE_KEY is missing');
    }

    return {
      bucketName: this.config.GCS_BUCKET_NAME,
      projectId: this.config.VERTEX_PROJECT_ID,
      clientEmail: this.config.VERTEX_CLIENT_EMAIL,
      privateKey: this.config.VERTEX_PRIVATE_KEY,
      region: this.config.VERTEX_LOCATION || 'us-central1',
    };
  }

  public getApiConfig(): ApiConfig {
    return {
      temperature: this.config.TEMPERATURE!,
      topP: this.config.TOP_P!,
      topK: this.config.TOP_K!,
      maxTokens: this.config.MAX_TOKENS!,
      temperatureForImage: this.config.TEMPERATURE_FOR_IMAGE,
      topPForImage: this.config.TOP_P_FOR_IMAGE,
      topKForImage: this.config.TOP_K_FOR_IMAGE,
      maxTokensForImage: this.config.MAX_TOKENS_FOR_IMAGE!,
      temperatureForVideo: this.config.TEMPERATURE_FOR_VIDEO,
      topPForVideo: this.config.TOP_P_FOR_VIDEO,
      topKForVideo: this.config.TOP_K_FOR_VIDEO,
      maxTokensForVideo: this.config.MAX_TOKENS_FOR_VIDEO!,
      temperatureForAnalyzeImage: this.config.TEMPERATURE_FOR_ANALYZE_IMAGE,
      topPForAnalyzeImage: this.config.TOP_P_FOR_ANALYZE_IMAGE,
      topKForAnalyzeImage: this.config.TOP_K_FOR_ANALYZE_IMAGE,
      maxTokensForAnalyzeImage: this.config.MAX_TOKENS_FOR_ANALYZE_IMAGE,
      temperatureForCompareImages: this.config.TEMPERATURE_FOR_COMPARE_IMAGES,
      topPForCompareImages: this.config.TOP_P_FOR_COMPARE_IMAGES,
      topKForCompareImages: this.config.TOP_K_FOR_COMPARE_IMAGES,
      maxTokensForCompareImages: this.config.MAX_TOKENS_FOR_COMPARE_IMAGES,
      temperatureForDetectObjectsInImage:
        this.config.TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE,
      topPForDetectObjectsInImage:
        this.config.TOP_P_FOR_DETECT_OBJECTS_IN_IMAGE,
      topKForDetectObjectsInImage:
        this.config.TOP_K_FOR_DETECT_OBJECTS_IN_IMAGE,
      maxTokensForDetectObjectsInImage:
        this.config.MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE,
      temperatureForAnalyzeVideo: this.config.TEMPERATURE_FOR_ANALYZE_VIDEO,
      topPForAnalyzeVideo: this.config.TOP_P_FOR_ANALYZE_VIDEO,
      topKForAnalyzeVideo: this.config.TOP_K_FOR_ANALYZE_VIDEO,
      maxTokensForAnalyzeVideo: this.config.MAX_TOKENS_FOR_ANALYZE_VIDEO,
      // Model configuration
      analyzeImageModel: this.config.ANALYZE_IMAGE_MODEL,
      compareImagesModel: this.config.COMPARE_IMAGES_MODEL,
      detectObjectsInImageModel: this.config.DETECT_OBJECTS_IN_IMAGE_MODEL,
      analyzeVideoModel: this.config.ANALYZE_VIDEO_MODEL,
    };
  }

  public getTemperatureForTask(
    taskType: 'image' | 'video'
  ): number | undefined {
    switch (taskType) {
      case 'image':
        return this.config.TEMPERATURE_FOR_IMAGE;
      case 'video':
        return this.config.TEMPERATURE_FOR_VIDEO;
      default:
        return undefined;
    }
  }

  public getTopPForTask(taskType: 'image' | 'video'): number | undefined {
    switch (taskType) {
      case 'image':
        return this.config.TOP_P_FOR_IMAGE;
      case 'video':
        return this.config.TOP_P_FOR_VIDEO;
      default:
        return undefined;
    }
  }

  public getTopKForTask(taskType: 'image' | 'video'): number | undefined {
    switch (taskType) {
      case 'image':
        return this.config.TOP_K_FOR_IMAGE;
      case 'video':
        return this.config.TOP_K_FOR_VIDEO;
      default:
        return undefined;
    }
  }

  public getMaxTokensForTask(taskType: 'image' | 'video'): number | undefined {
    switch (taskType) {
      case 'image':
        return this.config.MAX_TOKENS_FOR_IMAGE;
      case 'video':
        return this.config.MAX_TOKENS_FOR_VIDEO;
      default:
        return undefined;
    }
  }

  // Function-specific configuration getter methods
  public getTemperatureForFunction(
    functionName: FunctionName
  ): number | undefined {
    switch (functionName) {
      case FUNCTION_NAMES.ANALYZE_IMAGE:
        return this.config.TEMPERATURE_FOR_ANALYZE_IMAGE;
      case FUNCTION_NAMES.COMPARE_IMAGES:
        return this.config.TEMPERATURE_FOR_COMPARE_IMAGES;
      case FUNCTION_NAMES.DETECT_OBJECTS_IN_IMAGE:
        return this.config.TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE;
      case FUNCTION_NAMES.ANALYZE_VIDEO:
        return this.config.TEMPERATURE_FOR_ANALYZE_VIDEO;
      default:
        return undefined;
    }
  }

  public getTopPForFunction(functionName: FunctionName): number | undefined {
    switch (functionName) {
      case FUNCTION_NAMES.ANALYZE_IMAGE:
        return this.config.TOP_P_FOR_ANALYZE_IMAGE;
      case FUNCTION_NAMES.COMPARE_IMAGES:
        return this.config.TOP_P_FOR_COMPARE_IMAGES;
      case FUNCTION_NAMES.DETECT_OBJECTS_IN_IMAGE:
        return this.config.TOP_P_FOR_DETECT_OBJECTS_IN_IMAGE;
      case FUNCTION_NAMES.ANALYZE_VIDEO:
        return this.config.TOP_P_FOR_ANALYZE_VIDEO;
      default:
        return undefined;
    }
  }

  public getTopKForFunction(functionName: FunctionName): number | undefined {
    switch (functionName) {
      case FUNCTION_NAMES.ANALYZE_IMAGE:
        return this.config.TOP_K_FOR_ANALYZE_IMAGE;
      case FUNCTION_NAMES.COMPARE_IMAGES:
        return this.config.TOP_K_FOR_COMPARE_IMAGES;
      case FUNCTION_NAMES.DETECT_OBJECTS_IN_IMAGE:
        return this.config.TOP_K_FOR_DETECT_OBJECTS_IN_IMAGE;
      case FUNCTION_NAMES.ANALYZE_VIDEO:
        return this.config.TOP_K_FOR_ANALYZE_VIDEO;
      default:
        return undefined;
    }
  }

  public getMaxTokensForFunction(
    functionName: FunctionName
  ): number | undefined {
    switch (functionName) {
      case FUNCTION_NAMES.ANALYZE_IMAGE:
        return this.config.MAX_TOKENS_FOR_ANALYZE_IMAGE;
      case FUNCTION_NAMES.COMPARE_IMAGES:
        return this.config.MAX_TOKENS_FOR_COMPARE_IMAGES;
      case FUNCTION_NAMES.DETECT_OBJECTS_IN_IMAGE:
        return this.config.MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE;
      case FUNCTION_NAMES.ANALYZE_VIDEO:
        return this.config.MAX_TOKENS_FOR_ANALYZE_VIDEO;
      default:
        return undefined;
    }
  }

  // Function-specific model getter methods
  public getModelForFunction(functionName: FunctionName): string | undefined {
    switch (functionName) {
      case FUNCTION_NAMES.ANALYZE_IMAGE:
        return this.config.ANALYZE_IMAGE_MODEL;
      case FUNCTION_NAMES.COMPARE_IMAGES:
        return this.config.COMPARE_IMAGES_MODEL;
      case FUNCTION_NAMES.DETECT_OBJECTS_IN_IMAGE:
        return this.config.DETECT_OBJECTS_IN_IMAGE_MODEL;
      case FUNCTION_NAMES.ANALYZE_VIDEO:
        return this.config.ANALYZE_VIDEO_MODEL;
      default:
        return undefined;
    }
  }

  public getFileProcessingConfig(): FileProcessingConfig {
    return {
      maxImageSize: this.config.MAX_IMAGE_SIZE!,
      maxVideoSize: this.config.MAX_VIDEO_SIZE!,
      allowedImageFormats: this.config.ALLOWED_IMAGE_FORMATS!,
      allowedVideoFormats: this.config.ALLOWED_VIDEO_FORMATS!,
      maxVideoDuration: this.config.MAX_VIDEO_DURATION!,
      maxImagesForComparison: this.config.MAX_IMAGES_FOR_COMPARISON!,
    };
  }

  public getLoggingConfig(): LoggingConfig {
    return {
      logLevel: this.config.LOG_LEVEL!,
    };
  }

  public getDevelopmentConfig(): DevelopmentConfig {
    return {
      nodeEnv: this.config.NODE_ENV!,
    };
  }

  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  public getImageProvider(): string {
    return this.config.IMAGE_PROVIDER;
  }

  public getVideoProvider(): string {
    return this.config.VIDEO_PROVIDER;
  }

  public shouldUseGeminiForImages(): boolean {
    return this.config.IMAGE_PROVIDER === 'google';
  }

  public shouldUseGeminiForVideos(): boolean {
    return this.config.VIDEO_PROVIDER === 'google';
  }

  public shouldUseVertexAIForImages(): boolean {
    return this.config.IMAGE_PROVIDER === 'vertex_ai';
  }

  public shouldUseVertexAIForVideos(): boolean {
    return this.config.VIDEO_PROVIDER === 'vertex_ai';
  }

  public getGeminiFilesApiThreshold(): number {
    return this.config.GEMINI_FILES_API_THRESHOLD!;
  }

  public getVertexAIFilesApiThreshold(): number {
    return this.config.VERTEX_AI_FILES_API_THRESHOLD!;
  }

  // Individual getter methods for file processing config
  public getMaxImageSize(): number {
    return this.config.MAX_IMAGE_SIZE || 20 * 1024 * 1024; // 20MB default
  }

  public getMaxVideoSize(): number {
    return this.config.MAX_VIDEO_SIZE || 2 * 1024 * 1024 * 1024; // 2GB default
  }

  public getAllowedImageFormats(): string[] {
    return (
      this.config.ALLOWED_IMAGE_FORMATS || ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp', 'avif', 'heic']
    );
  }

  public getAllowedVideoFormats(): string[] {
    return this.config.ALLOWED_VIDEO_FORMATS || [
      'mp4',
      'mov',
      'avi',
      'x-flv',
      'webm',
      'mpeg',
      'mpg',
      'wmv',
      '3gp',
    ];
  }

  public static getDefaultImageModel(): string {
    return ConfigService.DEFAULT_IMAGE_MODEL;
  }

  public static getDefaultVideoModel(): string {
    return ConfigService.DEFAULT_VIDEO_MODEL;
  }

  public getMaxImagesForComparison(): number {
    return this.config.MAX_IMAGES_FOR_COMPARISON || 4;
  }

  // Utility method to reload configuration (useful for testing)
  public reloadConfig(): void {
    this.config = this.loadConfig();
  }
}
