/**
 * File upload strategy factory
 */

import type { FileUploadStrategy } from '../../types/Providers.js';
import type { Config } from '../../types/Config.js';
import { GeminiFilesAPI } from '../gemini/GeminiFilesAPI.js';
import { VertexAIStorageStrategy } from '../vertexai/VertexAIStorageStrategy.js';
import { S3CompatibleStorageProvider } from '../../storage/s3/S3CompatibleStorage.js';
import { GeminiProvider } from '../../providers/gemini/GeminiProvider.js';
import { ConfigurationError } from '../../types/Errors.js';

export class FileUploadFactory {
  static createStrategy(
    config: Config,
    type: 'image' | 'video',
    visionProvider: GeminiProvider
  ): FileUploadStrategy {
    const providerName =
      type === 'image' ? config.IMAGE_PROVIDER : config.VIDEO_PROVIDER;

    switch (providerName) {
      case 'google':
        return new GeminiFilesAPI(visionProvider);

      case 'vertex_ai':
        // For Vertex AI, we need external storage
        if (
          !config.S3_ACCESS_KEY ||
          !config.S3_SECRET_KEY ||
          !config.S3_BUCKET
        ) {
          throw new ConfigurationError(
            'S3 configuration is required for Vertex AI provider. Please set S3_ACCESS_KEY, S3_SECRET_KEY, and S3_BUCKET.'
          );
        }

        const s3Config = {
          accessKey: config.S3_ACCESS_KEY,
          secretKey: config.S3_SECRET_KEY,
          region: config.S3_REGION || 'us-east-1',
          bucket: config.S3_BUCKET,
          endpoint: config.S3_ENDPOINT || 'https://s3.amazonaws.com',
          cdnUrl: config.S3_CDN_URL,
          forcePathStyle: false,
        };

        const storageProvider = new S3CompatibleStorageProvider(s3Config);
        return new VertexAIStorageStrategy(storageProvider);

      default:
        throw new ConfigurationError(
          `Unsupported provider for file upload: ${providerName}`
        );
    }
  }

  static shouldUseProviderFilesAPI(
    config: Config,
    type: 'image' | 'video'
  ): boolean {
    if (!config.USE_PROVIDER_FILES_API) {
      return false;
    }

    const providerName =
      type === 'image' ? config.IMAGE_PROVIDER : config.VIDEO_PROVIDER;

    if (providerName === 'google') {
      return true;
    }

    if (providerName === 'vertex_ai') {
      // Vertex AI always requires external storage
      return false;
    }

    return false;
  }

  static getThreshold(config: Config, type: 'image' | 'video'): number {
    const providerName =
      type === 'image' ? config.IMAGE_PROVIDER : config.VIDEO_PROVIDER;

    if (providerName === 'google') {
      return config.GEMINI_FILES_API_THRESHOLD || 10 * 1024 * 1024; // 10MB default
    }

    if (providerName === 'vertex_ai') {
      // Vertex AI requires external storage for all files
      return config.VERTEX_AI_FILES_API_THRESHOLD || 0;
    }

    return 0;
  }
}
