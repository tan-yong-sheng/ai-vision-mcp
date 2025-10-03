/**
 * Configuration service for managing environment variables and settings
 */

import dotenv from 'dotenv';
import type {
  Config,
  GeminiConfig,
  VertexAIConfig,
  S3Config,
  ApiConfig,
  FileProcessingConfig,
  LoggingConfig,
  DevelopmentConfig,
} from '../types/Config.js';
import type {
  ProviderCapabilities,
  ModelCapabilities,
} from '../types/Providers.js';
import { ConfigurationError } from '../types/Errors.js';
import { validateConfig, formatZodError } from '../utils/validation.js';

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
        GOOGLE_APPLICATION_CREDENTIALS:
          process.env.GOOGLE_APPLICATION_CREDENTIALS,
        VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
        VERTEX_LOCATION: process.env.VERTEX_LOCATION || 'us-central1',
        VERTEX_ENDPOINT:
          process.env.VERTEX_ENDPOINT ||
          'https://aiplatform.googleapis.com',

        // S3-compatible storage configuration
        S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
        S3_SECRET_KEY: process.env.S3_SECRET_KEY,
        S3_REGION: process.env.S3_REGION || 'us-east-1',
        S3_BUCKET: process.env.S3_BUCKET,
        S3_ENDPOINT: process.env.S3_ENDPOINT || 'https://s3.amazonaws.com',
        S3_CDN_URL: process.env.S3_CDN_URL,

        // Universal API parameters
        TEMPERATURE: process.env.TEMPERATURE
          ? parseFloat(process.env.TEMPERATURE)
          : 0.8,
        TOP_P: process.env.TOP_P ? parseFloat(process.env.TOP_P) : 0.6,
        MAX_TOKENS: process.env.MAX_TOKENS
          ? parseInt(process.env.MAX_TOKENS, 10)
          : 16384,
        STREAM_RESPONSES: process.env.STREAM_RESPONSES === 'true',

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

        // File upload configuration
        USE_PROVIDER_FILES_API: process.env.USE_PROVIDER_FILES_API !== 'false',
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
      if (!config.VERTEX_PROJECT_ID) {
        throw new ConfigurationError(
          'VERTEX_PROJECT_ID is required when using Vertex AI provider',
          'VERTEX_PROJECT_ID'
        );
      }
      if (
        !config.GOOGLE_APPLICATION_CREDENTIALS &&
        !process.env.GOOGLE_APPLICATION_CREDENTIALS
      ) {
        throw new ConfigurationError(
          'GOOGLE_APPLICATION_CREDENTIALS is required when using Vertex AI provider',
          'GOOGLE_APPLICATION_CREDENTIALS'
        );
      }
      // S3 storage is required for Vertex AI
      if (!config.S3_ACCESS_KEY || !config.S3_SECRET_KEY || !config.S3_BUCKET) {
        throw new ConfigurationError(
          'S3_ACCESS_KEY, S3_SECRET_KEY, and S3_BUCKET are required when using Vertex AI provider'
        );
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
      imageModel: 'gemini-2.5-flash-lite',
      videoModel: 'gemini-2.5-flash',
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
      location: this.config.VERTEX_LOCATION!,
      endpoint: this.config.VERTEX_ENDPOINT!,
      credentials: this.config.GOOGLE_APPLICATION_CREDENTIALS,
      imageModel: 'gemini-2.5-flash-lite',
      videoModel: 'gemini-2.5-flash',
    };
  }

  public getS3Config(): S3Config {
    if (
      !this.config.S3_ACCESS_KEY ||
      !this.config.S3_SECRET_KEY ||
      !this.config.S3_BUCKET
    ) {
      throw new ConfigurationError('S3 configuration is missing');
    }

    return {
      accessKey: this.config.S3_ACCESS_KEY,
      secretKey: this.config.S3_SECRET_KEY,
      region: this.config.S3_REGION!,
      bucket: this.config.S3_BUCKET,
      endpoint: this.config.S3_ENDPOINT!,
      cdnUrl: this.config.S3_CDN_URL,
    };
  }

  public getApiConfig(): ApiConfig {
    return {
      temperature: this.config.TEMPERATURE!,
      topP: this.config.TOP_P!,
      maxTokens: this.config.MAX_TOKENS!,
      streamResponses: this.config.STREAM_RESPONSES!,
    };
  }

  public getFileProcessingConfig(): FileProcessingConfig {
    return {
      maxImageSize: this.config.MAX_IMAGE_SIZE!,
      maxVideoSize: this.config.MAX_VIDEO_SIZE!,
      allowedImageFormats: this.config.ALLOWED_IMAGE_FORMATS!,
      allowedVideoFormats: this.config.ALLOWED_VIDEO_FORMATS!,
      maxVideoDuration: this.config.MAX_VIDEO_DURATION!,
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

  public shouldUseProviderFilesAPI(): boolean {
    return this.config.USE_PROVIDER_FILES_API!;
  }

  public getGeminiFilesApiThreshold(): number {
    return this.config.GEMINI_FILES_API_THRESHOLD!;
  }

  public getVertexAIFilesApiThreshold(): number {
    return this.config.VERTEX_AI_FILES_API_THRESHOLD!;
  }

  // Utility method to reload configuration (useful for testing)
  public reloadConfig(): void {
    this.config = this.loadConfig();
  }
}
