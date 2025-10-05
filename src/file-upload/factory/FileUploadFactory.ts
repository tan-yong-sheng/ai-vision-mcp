/**
 * File upload strategy factory
 */

import type { FileUploadStrategy } from '../../types/Providers.js';
import type { Config } from '../../types/Config.js';
import { GeminiFilesAPI } from '../gemini/GeminiFilesAPI.js';
import { VertexAIStorageStrategy } from '../vertexai/VertexAIStorageStrategy.js';
import { GCSStorageProvider } from '../../storage/gcs/GCSStorage.js';
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
        // For Vertex AI, we need Google Cloud Storage with S3-compatible API
        if (!config.GCS_BUCKET_NAME) {
          throw new ConfigurationError(
            'GCS_BUCKET_NAME is required for Vertex AI provider. Please set GCS_BUCKET_NAME.'
          );
        }
        if (!config.GCS_ENDPOINT) {
          throw new ConfigurationError(
            'GCS_ENDPOINT is required for Vertex AI provider. Please set GCS_ENDPOINT.'
          );
        }
        if (!config.GCS_ACCESS_KEY) {
          throw new ConfigurationError(
            'GCS_ACCESS_KEY is required for Vertex AI provider. Please set GCS_ACCESS_KEY.'
          );
        }
        if (!config.GCS_SECRET_KEY) {
          throw new ConfigurationError(
            'GCS_SECRET_KEY is required for Vertex AI provider. Please set GCS_SECRET_KEY.'
          );
        }

        const gcsConfig = {
          bucketName: config.GCS_BUCKET_NAME,
          endpoint: config.GCS_ENDPOINT,
          accessKey: config.GCS_ACCESS_KEY,
          secretKey: config.GCS_SECRET_KEY,
          region: 'auto', // GCS S3-compatible mode uses 'auto' region
        };

        const storageProvider = new GCSStorageProvider(gcsConfig);
        return new VertexAIStorageStrategy(storageProvider);

      default:
        throw new ConfigurationError(
          `Unsupported provider for file upload: ${providerName}`
        );
    }
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
