/**
 * Configuration service for managing environment variables and settings
 */

import dotenv from 'dotenv';
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
import { ConfigurationError } from '../types/Errors.js';
import {
  type FunctionName,
  FUNCTION_NAMES,
} from '../constants/FunctionNames.js';
import { validateConfig, formatZodError } from '../utils/validation.js';
import { extractProjectIdFromCredentials } from '../utils/credentialsParser.js';

// Load environment variables
dotenv.config();

export class ConfigService {
  private static instance: ConfigService;
  private config: Config;

  private constructor() {
    this.config = this.loadConfig();
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

  private loadConfig(): Config {
    try {
      const rawConfig: Record<string, unknown> = {
        IMAGE_PROVIDER: process.env.IMAGE_PROVIDER || 'google',
        VIDEO_PROVIDER: process.env.VIDEO_PROVIDER || 'google',

        // Gemini API configuration
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_BASE_URL:
          process.env.GEMINI_BASE_URL ||
          'https://generativelanguage.googleapis.com',

        // Vertex AI configuration
        VERTEX_CREDENTIALS: process.env.VERTEX_CREDENTIALS,
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

        // Google Cloud Storage configuration (auto-derive from Vertex AI if not provided)
        GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
        GCS_PROJECT_ID: process.env.GCS_PROJECT_ID,
        GCS_CREDENTIALS: process.env.GCS_CREDENTIALS,
        GCS_REGION: process.env.GCS_REGION,

        // Universal API parameters
        TEMPERATURE: process.env.TEMPERATURE
          ? parseFloat(process.env.TEMPERATURE)
          : 0.8,
        TOP_P: process.env.TOP_P ? parseFloat(process.env.TOP_P) : 0.95,
        TOP_K: process.env.TOP_K ? parseInt(process.env.TOP_K, 10) : 30,
        MAX_TOKEN: process.env.MAX_TOKEN
          ? parseInt(process.env.MAX_TOKEN, 10)
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
          : undefined,
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

        // Logging configuration
        LOG_LEVEL:
          (process.env.LOG_LEVEL as 'info' | 'debug' | 'warn' | 'error') ||
          'info',

        // Development configuration
        NODE_ENV:
          (process.env.NODE_ENV as 'development' | 'production') ||
          'development',
      };

      const config = validateConfig(rawConfig);
      this.validateRequiredFields(config);
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
      if (!config.VERTEX_CREDENTIALS) {
        throw new ConfigurationError(
          'VERTEX_CREDENTIALS is required when using Vertex AI provider',
          'VERTEX_CREDENTIALS'
        );
      }

      // Auto-derive VERTEX_PROJECT_ID from credentials if not provided
      if (!config.VERTEX_PROJECT_ID) {
        try {
          config.VERTEX_PROJECT_ID = extractProjectIdFromCredentials(
            config.VERTEX_CREDENTIALS
          );
        } catch (error) {
          throw new ConfigurationError(
            'VERTEX_PROJECT_ID could not be auto-derived from credentials file. Please provide it explicitly.',
            'VERTEX_PROJECT_ID'
          );
        }
      }

      // GCS storage is required for Vertex AI
      if (!config.GCS_BUCKET_NAME) {
        throw new ConfigurationError(
          'GCS_BUCKET_NAME is required when using Vertex AI provider'
        );
      }

      // Auto-derive GCS_CREDENTIALS from VERTEX_CREDENTIALS if not provided
      if (!config.GCS_CREDENTIALS) {
        config.GCS_CREDENTIALS = config.VERTEX_CREDENTIALS;
      }

      // Auto-derive GCS_PROJECT_ID from credentials if not provided
      if (!config.GCS_PROJECT_ID) {
        try {
          config.GCS_PROJECT_ID = extractProjectIdFromCredentials(
            config.GCS_CREDENTIALS
          );
        } catch (error) {
          throw new ConfigurationError(
            'GCS_PROJECT_ID could not be auto-derived from credentials file. Please provide it explicitly.',
            'GCS_PROJECT_ID'
          );
        }
      }

      // Auto-derive GCS_REGION from VERTEX_LOCATION if not provided
      if (!config.GCS_REGION) {
        config.GCS_REGION = config.VERTEX_LOCATION || 'us-central1';
      }
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
      imageModel: this.config.IMAGE_MODEL || 'gemini-2.5-flash-lite',
      videoModel: this.config.VIDEO_MODEL || 'gemini-2.5-flash',
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
      credentials: this.config.VERTEX_CREDENTIALS,
      imageModel: this.config.IMAGE_MODEL || 'gemini-2.5-flash-lite',
      videoModel: this.config.VIDEO_MODEL || 'gemini-2.5-flash',
    };
  }

  public getGCSConfig(): GCSConfig {
    if (!this.config.GCS_BUCKET_NAME) {
      throw new ConfigurationError('GCS configuration is missing');
    }

    if (!this.config.GCS_PROJECT_ID) {
      throw new ConfigurationError('GCS_PROJECT_ID is missing');
    }

    if (!this.config.GCS_CREDENTIALS) {
      throw new ConfigurationError('GCS_CREDENTIALS is missing');
    }

    return {
      bucketName: this.config.GCS_BUCKET_NAME,
      projectId: this.config.GCS_PROJECT_ID,
      credentials: this.config.GCS_CREDENTIALS,
      region: this.config.GCS_REGION || 'us-central1',
    };
  }

  public getApiConfig(): ApiConfig {
    return {
      temperature: this.config.TEMPERATURE!,
      topP: this.config.TOP_P!,
      topK: this.config.TOP_K!,
      maxToken: this.config.MAX_TOKEN!,
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
      this.config.ALLOWED_IMAGE_FORMATS || ['jpg', 'jpeg', 'png', 'gif', 'webp']
    );
  }

  public getAllowedVideoFormats(): string[] {
    return this.config.ALLOWED_VIDEO_FORMATS || ['mp4', 'mov', 'avi', 'webm'];
  }

  public getMaxImagesForComparison(): number {
    return this.config.MAX_IMAGES_FOR_COMPARISON || 4;
  }

  // Utility method to reload configuration (useful for testing)
  public reloadConfig(): void {
    this.config = this.loadConfig();
  }
}
