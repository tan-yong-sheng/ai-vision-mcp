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
        // For Vertex AI, we need Google Cloud Storage
        if (!config.GCS_BUCKET_NAME) {
          throw new ConfigurationError(
            'GCS_BUCKET_NAME is required for Vertex AI provider. Please set GCS_BUCKET_NAME.'
          );
        }

        const gcsConfig = {
          bucketName: config.GCS_BUCKET_NAME,
          projectId: config.GCS_PROJECT_ID || config.VERTEX_PROJECT_ID,
          keyFilePath: config.GCS_KEY_FILE_PATH,
          publicUrlBase: config.GCS_PUBLIC_URL_BASE,
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
