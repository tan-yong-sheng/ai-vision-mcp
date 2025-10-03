/**
 * Vertex AI provider implementation
 */

import { VertexAI } from '@google-cloud/vertexai';
import fetch from 'node-fetch';
import { BaseVisionProvider } from '../base/VisionProvider.js';
import type {
  VertexAIConfig,
  AnalysisOptions,
  AnalysisResult,
  UploadedFile,
  HealthStatus,
  RateLimitInfo,
  ProviderCapabilities,
  ModelCapabilities,
  ProviderInfo,
} from '../../types/Providers.js';
import {
  ProviderError,
  FileUploadError,
  FileNotFoundError,
  NetworkError,
  TimeoutError,
} from '../../types/Errors.js';
import { TimeoutHandler } from '../../utils/retry.js';

export class VertexAIProvider extends BaseVisionProvider {
  private client: VertexAI;
  private config: VertexAIConfig;

  constructor(config: VertexAIConfig) {
    super('vertex_ai', config.imageModel, config.videoModel);
    this.config = config;
    this.client = new VertexAI({
      project: config.projectId,
      location: config.location,
      googleAuthOptions: {
        keyFilename: config.credentials,
      },
    });
  }

  async analyzeImage(
    imageSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult> {
    try {
      const imageData = await this.getImageData(imageSource);
      const mimeType = this.getImageMimeType(imageSource, imageData);

      const model = this.client.getGenerativeModel({
        model: this.imageModel,
      });

      const { result: response, duration } = await this.measureAsync(
        async () => {
          return await TimeoutHandler.withTimeout(
            () =>
              model.generateContent({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        inlineData: {
                          mimeType,
                          data: imageData.toString('base64'),
                        },
                      },
                      { text: prompt },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: options?.temperature ?? 0.4,
                  maxOutputTokens: options?.maxTokens ?? 1024,
                  candidateCount: 1,
                },
              }),
            this.config.timeout || 60000,
            `Vertex AI image analysis timed out`
          );
        }
      );

      const text =
        response.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usage = response.response.usageMetadata;

      return this.createAnalysisResult(
        text,
        this.imageModel,
        usage &&
          usage.promptTokenCount &&
          usage.candidatesTokenCount &&
          usage.totalTokenCount
          ? {
              promptTokenCount: usage.promptTokenCount,
              candidatesTokenCount: usage.candidatesTokenCount,
              totalTokenCount: usage.totalTokenCount,
            }
          : undefined,
        duration,
        mimeType,
        imageData.length
      );
    } catch (error) {
      throw this.handleError(error, 'image analysis');
    }
  }

  async analyzeVideo(
    videoSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult> {
    try {
      let fileUri: string;

      if (videoSource.startsWith('gs://')) {
        // Already a GCS URI
        fileUri = videoSource;
      } else if (videoSource.startsWith('http')) {
        // Need to upload to GCS first (this would be handled by a storage service)
        throw new Error(
          'Direct URL processing not supported for Vertex AI. Please upload to GCS first.'
        );
      } else if (videoSource.startsWith('files/')) {
        // File reference - should be a GCS URI
        fileUri = videoSource;
      } else {
        throw new Error(
          'Invalid video source format for Vertex AI. Expected GCS URI.'
        );
      }

      const model = this.client.getGenerativeModel({
        model: this.videoModel,
      });

      const { result: response, duration } = await this.measureAsync(
        async () => {
          return await TimeoutHandler.withTimeout(
            () =>
              model.generateContent({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        fileData: {
                          mimeType: 'video/mp4',
                          fileUri,
                        },
                      },
                      { text: prompt },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: options?.temperature ?? 0.4,
                  maxOutputTokens: options?.maxTokens ?? 1024,
                  candidateCount: 1,
                },
              }),
            this.config.timeout || 120000,
            `Vertex AI video analysis timed out`
          );
        }
      );

      const text =
        response.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usage = response.response.usageMetadata;

      return this.createAnalysisResult(
        text,
        this.videoModel,
        usage &&
          usage.promptTokenCount &&
          usage.candidatesTokenCount &&
          usage.totalTokenCount
          ? {
              promptTokenCount: usage.promptTokenCount,
              candidatesTokenCount: usage.candidatesTokenCount,
              totalTokenCount: usage.totalTokenCount,
            }
          : undefined,
        duration,
        'video/mp4'
      );
    } catch (error) {
      throw this.handleError(error, 'video analysis');
    }
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadedFile> {
    // Vertex AI requires external storage for all files
    // This method should integrate with a storage service
    throw new FileUploadError(
      'Vertex AI requires external storage. Please upload files to GCS first.',
      'vertex_ai'
    );
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    // For Vertex AI, files are stored in GCS
    // This would need to integrate with GCS client
    throw new Error(
      'File download not directly supported by Vertex AI provider. Use GCS client instead.'
    );
  }

  async deleteFile(fileId: string): Promise<void> {
    // For Vertex AI, files are stored in GCS
    // This would need to integrate with GCS client
    throw new Error(
      'File deletion not directly supported by Vertex AI provider. Use GCS client instead.'
    );
  }

  getSupportedFormats(): ProviderCapabilities {
    return {
      ...this.getProviderCapabilities(),
      supportedImageFormats: [
        'png',
        'jpg',
        'jpeg',
        'webp',
        'gif',
        'bmp',
        'tiff',
        'heic',
        'heif',
      ],
      supportedVideoFormats: [
        'mp4',
        'mov',
        'avi',
        'mkv',
        'webm',
        'flv',
        'wmv',
        '3gp',
        'm4v',
      ],
      maxImageSize: 20 * 1024 * 1024, // 20MB
      maxVideoSize: 2 * 1024 * 1024 * 1024, // 2GB
      maxVideoDuration: 3600, // 1 hour
      supportsVideo: true,
      supportsStreaming: true,
      supportsFileUpload: false, // Requires external storage
    };
  }

  getModelCapabilities(): ModelCapabilities {
    return {
      ...this.getBaseModelCapabilities(),
      imageAnalysis: true,
      videoAnalysis: true,
      streaming: true,
      maxTokens: 8192,
      supportedFormats: this.getSupportedFormats().supportedImageFormats.concat(
        this.getSupportedFormats().supportedVideoFormats
      ),
    };
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'Google Vertex AI',
      version: '2.0',
      description:
        'Google Vertex AI Gemini multimodal models for enterprise image and video analysis',
      capabilities: this.getSupportedFormats(),
      modelCapabilities: this.getModelCapabilities(),
      rateLimit: this.getRateLimitInfo(),
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const { result: _, duration } = await this.measureAsync(async () => {
        const model = this.client.getGenerativeModel({
          model: this.imageModel,
        });
        // Simple test with minimal content
        await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Hello' }],
            },
          ],
        });
      });

      return this.createHealthStatus('healthy', duration);
    } catch (error) {
      return this.createHealthStatus(
        'unhealthy',
        undefined,
        this.getErrorMessage(error)
      );
    }
  }

  getRateLimitInfo(): RateLimitInfo {
    // Vertex AI rate limits (these are typical values - actual limits vary by project)
    return {
      requestsPerMinute: 120,
      requestsPerDay: 15000,
      currentUsage: {
        requestsPerMinute: 0, // This would require tracking usage over time
        requestsPerDay: 0,
      },
    };
  }

  // Private helper methods

  private async getImageData(imageSource: string): Promise<Buffer> {
    if (imageSource.startsWith('http')) {
      // Handle URL
      const response = await fetch(imageSource);
      if (!response.ok) {
        throw new NetworkError(
          `Failed to fetch image from URL: ${imageSource}`
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else if (imageSource.startsWith('data:image/')) {
      // Handle base64
      const base64Data = imageSource.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    } else if (imageSource.startsWith('gs://')) {
      // For GCS URIs, we need to download from GCS
      throw new Error(
        'GCS download not implemented. Please use GCS client directly.'
      );
    } else {
      throw new Error('Invalid image source format for Vertex AI');
    }
  }

  private getImageMimeType(source: string, buffer: Buffer): string {
    if (source.startsWith('data:image/')) {
      return source.split(':')[1].split(';')[0];
    }

    // Simple detection based on file signature
    const signatures: Record<string, string> = {
      'image/png': '\x89PNG\r\n\x1a\n',
      'image/jpeg': '\xff\xd8\xff',
      'image/gif': 'GIF87a',
      'image/webp': 'RIFF',
    };

    for (const [mimeType, signature] of Object.entries(signatures)) {
      if (buffer.slice(0, signature.length).toString() === signature) {
        return mimeType;
      }
    }

    return 'image/jpeg'; // Default fallback
  }

  private handleError(error: unknown, operation: string): Error {
    if (error instanceof Error) {
      if (error.message.includes('timed out')) {
        return new TimeoutError(error.message);
      }
      if (
        error.message.includes('network') ||
        error.message.includes('fetch')
      ) {
        return new NetworkError(error.message, error);
      }
      if (
        error.message.includes('rate limit') ||
        error.message.includes('quota')
      ) {
        return new ProviderError(
          `Rate limit exceeded during ${operation}`,
          'vertex_ai',
          error,
          429
        );
      }
      if (
        error.message.includes('authentication') ||
        error.message.includes('unauthorized')
      ) {
        return new ProviderError(
          `Authentication failed during ${operation}: ${error.message}`,
          'vertex_ai',
          error,
          401
        );
      }
      if (
        error.message.includes('permission') ||
        error.message.includes('forbidden')
      ) {
        return new ProviderError(
          `Authorization failed during ${operation}: ${error.message}`,
          'vertex_ai',
          error,
          403
        );
      }
      return new ProviderError(
        `Failed during ${operation}: ${error.message}`,
        'vertex_ai',
        error
      );
    }

    return new ProviderError(
      `Unknown error during ${operation}`,
      'vertex_ai',
      error as Error
    );
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
