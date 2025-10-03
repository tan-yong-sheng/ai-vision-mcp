/**
 * Gemini API provider implementation
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import fetch from 'node-fetch';
import { BaseVisionProvider } from '../base/VisionProvider.js';
import type {
  GeminiConfig,
  AnalysisOptions,
  AnalysisResult,
  UploadedFile,
  HealthStatus,
  RateLimitInfo,
  ProviderCapabilities,
  ModelCapabilities,
  ProviderInfo,
  GeminiGenerateContentRequest,
  GeminiGenerateContentResponse,
  GeminiFileMetadata,
} from '../../types/Providers.js';
import {
  ProviderError,
  FileUploadError,
  FileNotFoundError,
  NetworkError,
} from '../../types/Errors.js';
import { RetryHandler } from '../../utils/retry.js';

export class GeminiProvider extends BaseVisionProvider {
  private client: GoogleGenerativeAI;
  private config: GeminiConfig;
  private baseUrl: string;

  constructor(config: GeminiConfig) {
    super('gemini', config.imageModel, config.videoModel);
    this.config = config;
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.baseUrl = config.baseUrl;
  }

  async analyzeImage(
    imageSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult> {
    try {
      const { result: imageData, duration } = await this.measureAsync(
        async () => {
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
          } else if (imageSource.startsWith('files/')) {
            // Handle file reference
            return await this.downloadFile(imageSource);
          } else {
            throw new Error('Invalid image source format');
          }
        }
      );

      // Determine MIME type
      const mimeType = this.getImageMimeType(imageSource, imageData);

      const model = this.client.getGenerativeModel({ model: this.imageModel });

      const { result: response, duration: analysisDuration } =
        await this.measureAsync(async () => {
          return await model.generateContent([
            {
              inlineData: {
                mimeType,
                data: imageData.toString('base64'),
              },
            },
            { text: prompt },
          ]);
        });

      const text = response.response.text();
      const usage = response.response.usageMetadata;

      return this.createAnalysisResult(
        text,
        this.imageModel,
        usage
          ? {
              promptTokenCount: usage.promptTokenCount,
              candidatesTokenCount: usage.candidatesTokenCount,
              totalTokenCount: usage.totalTokenCount,
            }
          : undefined,
        duration + analysisDuration,
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
      let fileReference: string;

      if (videoSource.startsWith('http') || videoSource.startsWith('gs://')) {
        // For external URLs, we need to upload to Gemini Files API first
        const uploadedFile = await this.uploadVideoFromUrl(videoSource);
        fileReference = uploadedFile.uri!;
      } else if (videoSource.startsWith('files/')) {
        // Use existing file reference
        fileReference = videoSource;
      } else {
        throw new Error('Invalid video source format');
      }

      const model = this.client.getGenerativeModel({ model: this.videoModel });

      const { result: response, duration } = await this.measureAsync(
        async () => {
          return await model.generateContent([
            {
              fileData: {
                mimeType: 'video/mp4',
                fileUri: fileReference,
              },
            },
            { text: prompt },
          ]);
        }
      );

      const text = response.response.text();
      const usage = response.response.usageMetadata;

      return this.createAnalysisResult(
        text,
        this.videoModel,
        usage
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
    try {
      const { result: fileMetadata, duration } = await this.measureAsync(
        async () => {
          return await this.uploadToGeminiFiles(buffer, filename, mimeType);
        }
      );

      return {
        id: fileMetadata.name,
        filename,
        mimeType,
        size: buffer.length,
        uri: fileMetadata.uri,
        displayName: fileMetadata.displayName,
        state: fileMetadata.state as 'PROCESSING' | 'ACTIVE' | 'FAILED',
        createTime: fileMetadata.createTime,
        updateTime: fileMetadata.updateTime,
        expirationTime: fileMetadata.expirationTime,
        sha256Hash: fileMetadata.sha256Hash,
      };
    } catch (error) {
      throw this.handleError(error, 'file upload');
    }
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      // First get file metadata to get the download URL
      const metadata = await this.getFileMetadata(fileId);

      // For Gemini Files API, we typically need to use the URI directly
      // This is a simplified implementation - in practice, you might need to use a different approach
      const response = await fetch(
        `${this.baseUrl}/v1beta/${fileId}?alt=media`,
        {
          headers: {
            'x-goog-api-key': this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      throw this.handleError(error, 'file download');
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/v1beta/${fileId}`, {
        method: 'DELETE',
        headers: {
          'x-goog-api-key': this.config.apiKey,
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }
    } catch (error) {
      throw this.handleError(error, 'file deletion');
    }
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
      maxVideoSize: 100 * 1024 * 1024, // 100MB for direct upload
      maxVideoDuration: 3600, // 1 hour
      supportsStreaming: false,
      supportsFileUpload: true,
    };
  }

  getModelCapabilities(): ModelCapabilities {
    return {
      ...this.getBaseModelCapabilities(),
      imageAnalysis: true,
      videoAnalysis: true,
      streaming: false,
      maxTokens: 8192,
      supportedFormats: this.getSupportedFormats().supportedImageFormats.concat(
        this.getSupportedFormats().supportedVideoFormats
      ),
    };
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'Google Gemini',
      version: '2.0',
      description:
        'Google Gemini multimodal AI model for image and video analysis',
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
        await model.generateContent([{ text: 'Hello' }]);
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
    // Gemini API rate limits (these are typical values - actual limits may vary)
    return {
      requestsPerMinute: 60,
      requestsPerDay: 1500,
      currentUsage: {
        requestsPerMinute: 0, // This would require tracking usage over time
        requestsPerDay: 0,
      },
    };
  }

  // Private helper methods

  private async uploadToGeminiFiles(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<GeminiFileMetadata> {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('file', blob, filename);

    const response = await fetch(
      `${this.baseUrl}/upload/v1beta/files?key=${this.config.apiKey}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new FileUploadError(
        `Failed to upload file to Gemini: ${response.statusText} - ${errorText}`
      );
    }

    const result = (await response.json()) as { file: GeminiFileMetadata };
    return result.file;
  }

  private async uploadVideoFromUrl(url: string): Promise<UploadedFile> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new NetworkError(`Failed to fetch video from URL: ${url}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = url.split('/').pop() || 'video.mp4';
    const mimeType = response.headers.get('content-type') || 'video/mp4';

    return await this.uploadFile(buffer, filename, mimeType);
  }

  private async getFileMetadata(fileId: string): Promise<GeminiFileMetadata> {
    const response = await fetch(
      `${this.baseUrl}/v1beta/${fileId}?key=${this.config.apiKey}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new FileNotFoundError(fileId, 'gemini');
      }
      throw new Error(`Failed to get file metadata: ${response.statusText}`);
    }

    return (await response.json()) as GeminiFileMetadata;
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
        // Return a generic rate limit error - specific retry info would come from headers
        return new ProviderError(
          `Rate limit exceeded during ${operation}`,
          'gemini',
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
          'gemini',
          error,
          401
        );
      }
      return new ProviderError(
        `Failed during ${operation}: ${error.message}`,
        'gemini',
        error
      );
    }

    return new ProviderError(
      `Unknown error during ${operation}`,
      'gemini',
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
