/**
 * Vertex AI provider implementation
 */

import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';
import { BaseVisionProvider } from '../base/VisionProvider.js';
import { FUNCTION_NAMES } from '../../constants/FunctionNames.js';
import type {
  VertexAIConfig,
  AnalysisOptions,
  AnalysisResult,
  UploadedFile,
  HealthStatus,
  ProviderCapabilities,
  ModelCapabilities,
  ProviderInfo,
} from '../../types/Providers.js';
import {
  ProviderError,
  FileUploadError,
  NetworkError,
} from '../../types/Errors.js';

export class VertexAIProvider extends BaseVisionProvider {
  private client: GoogleGenAI;
  private config: VertexAIConfig;

  constructor(config: VertexAIConfig) {
    super('vertex_ai', config.imageModel, config.videoModel);
    this.config = config;

    // Ensure endpoint is set, use default if not provided
    const endpoint = config.endpoint || 'https://aiplatform.googleapis.com';

    // Validate endpoint format
    this.validateEndpoint(endpoint);

    // Initialize GoogleGenAI client with Vertex AI configuration
    const clientConfig: any = {
      vertexai: true,
      project: config.projectId,
      location: config.location,
    };

    // Add custom base URL if not using default Google endpoint
    if (endpoint !== 'https://aiplatform.googleapis.com') {
      clientConfig.baseUrl = endpoint;
    }

    this.client = new GoogleGenAI(clientConfig);

    // Log debug information
    this.logDebugInfo();
  }

  async analyzeImage(
    imageSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult> {
    try {
      const imageData = await this.getImageData(imageSource);
      const mimeType = this.getImageMimeType(imageSource, imageData);

      const { result: response, duration } = await this.measureAsync(
        async () => {
          return await this.client.models.generateContent({
            model: this.resolveModelForFunction('image', options?.functionName),
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
            config: {
              temperature: this.resolveTemperatureForFunction(
                'image',
                options?.functionName,
                options?.temperature
              ),
              topP: this.resolveTopPForFunction(
                'image',
                options?.functionName,
                options?.topP
              ),
              topK: this.resolveTopKForFunction(
                'image',
                options?.functionName,
                options?.topK
              ),
              maxOutputTokens: this.resolveMaxTokensForFunction(
                'image',
                options?.functionName,
                options?.maxTokens
              ),
              candidateCount: 1,
            },
          });
        }
      );

      const text = response.text || '';
      const usage = response.usageMetadata;

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

  async compareImages(
    imageSources: string[],
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult> {
    try {
      console.log(`[VertexAIProvider] Comparing ${imageSources.length} images`);

      // Process all images to create parts
      const imageParts: any[] = [];
      let totalFileSize = 0;

      for (let i = 0; i < imageSources.length; i++) {
        const imageSource = imageSources[i];
        console.log(
          `[VertexAIProvider] Processing image ${i + 1}: ${imageSource.substring(0, 100)}${imageSource.length > 100 ? '...' : ''}`
        );

        const imageData = await this.getImageData(imageSource);
        const mimeType = this.getImageMimeType(imageSource, imageData);
        totalFileSize += imageData.length;

        imageParts.push({
          inlineData: {
            mimeType,
            data: imageData.toString('base64'),
          },
        });
      }

      // Add the prompt as the last part
      imageParts.push({ text: prompt });

      const { result: response, duration } = await this.measureAsync(
        async () => {
          return await this.client.models.generateContent({
            model: this.resolveModelForFunction('image', options?.functionName),
            contents: [
              {
                role: 'user',
                parts: imageParts,
              },
            ],
            config: {
              temperature: this.resolveTemperatureForFunction(
                'image',
                options?.functionName,
                options?.temperature
              ),
              topP: this.resolveTopPForFunction(
                'image',
                options?.functionName,
                options?.topP
              ),
              topK: this.resolveTopKForFunction(
                'image',
                options?.functionName,
                options?.topK
              ),
              maxOutputTokens: this.resolveMaxTokensForFunction(
                'image',
                options?.functionName,
                options?.maxTokens
              ),
              candidateCount: 1,
            },
          });
        }
      );

      const text = response.text || '';
      const usage = response.usageMetadata;

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
        'image/multiple',
        totalFileSize
      );
    } catch (error) {
      throw this.handleError(error, 'image comparison');
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
        // Check if it's a YouTube URL - these can be passed directly
        if (
          videoSource.includes('youtube.com') ||
          videoSource.includes('youtu.be')
        ) {
          fileUri = videoSource;
        } else {
          // For other HTTP URLs, would need to upload to GCS first
          throw new Error(
            'Direct URL processing not supported for Vertex AI (except YouTube). Please upload to GCS first.'
          );
        }
      } else if (videoSource.startsWith('files/')) {
        // File reference - should be a GCS URI
        fileUri = videoSource;
      } else {
        throw new Error(
          'Invalid video source format for Vertex AI. Expected GCS URI or YouTube URL.'
        );
      }

      const { result: response, duration } = await this.measureAsync(
        async () => {
          return await this.client.models.generateContent({
            model: this.resolveModelForFunction('video', options?.functionName),
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
            config: {
              temperature: this.resolveTemperatureForFunction(
                'video',
                options?.functionName,
                options?.temperature
              ),
              topP: this.resolveTopPForFunction(
                'video',
                options?.functionName,
                options?.topP
              ),
              topK: this.resolveTopKForFunction(
                'video',
                options?.functionName,
                options?.topK
              ),
              maxOutputTokens: this.resolveMaxTokensForFunction(
                'video',
                options?.functionName,
                options?.maxTokens
              ),
              candidateCount: 1,
            },
          });
        }
      );

      const text = response.text || '';
      const usage = response.usageMetadata;

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
    _buffer: Buffer,
    _filename: string,
    _mimeType: string
  ): Promise<UploadedFile> {
    // Vertex AI requires external storage for all files
    // This method should integrate with a storage service
    throw new FileUploadError(
      'Vertex AI requires external storage. Please upload files to GCS first.',
      'vertex_ai'
    );
  }

  async downloadFile(_fileId: string): Promise<Buffer> {
    // For Vertex AI, files are stored in GCS
    // This would need to integrate with GCS client
    throw new Error(
      'File download not directly supported by Vertex AI provider. Use GCS client instead.'
    );
  }

  async deleteFile(_fileId: string): Promise<void> {
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
      supportsFileUpload: false, // Requires external storage
    };
  }

  getModelCapabilities(): ModelCapabilities {
    return {
      ...this.getBaseModelCapabilities(),
      imageAnalysis: true,
      videoAnalysis: true,
      maxTokensForImage: 500, // Default from config
      maxTokensForVideo: 2000, // Default from config
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
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const { duration } = await this.measureAsync(async () => {
        // Simple test with minimal content
        await this.client.models.generateContent({
          model: this.resolveModelForFunction(
            'image',
            FUNCTION_NAMES.ANALYZE_IMAGE
          ),
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

  private validateEndpoint(endpoint: string): void {
    // Validate that it's a valid URL format
    try {
      new URL(endpoint);
    } catch (error) {
      throw new ProviderError(
        `Invalid Vertex AI endpoint format: ${endpoint}. Must be a valid URL.`,
        'vertex_ai',
        undefined,
        400
      );
    }
  }

  private logDebugInfo(): void {
    const imageModelUrl = `${this.config.endpoint}/v1/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${this.imageModel}:generateContent`;
    const videoModelUrl = `${this.config.endpoint}/v1/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${this.videoModel}:generateContent`;

    console.log(`[VertexAI Provider] Configuration:`);
    console.log(`  - Project ID: ${this.config.projectId}`);
    console.log(`  - Location: ${this.config.location}`);
    console.log(`  - Endpoint: ${this.config.endpoint}`);
    console.log(`  - Image Model URL: ${imageModelUrl}`);
    console.log(`  - Video Model URL: ${videoModelUrl}`);
  }
}
