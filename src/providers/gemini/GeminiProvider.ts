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
      let content: any;
      let mimeType: string;
      let fileSize: number | undefined;
      let downloadDuration = 0;

      if (imageSource.startsWith('http')) {
        // For public URLs (non-GCS), download and use inlineData
        const { result: imageData, duration } = await this.measureAsync(
          async () => {
            const response = await fetch(imageSource);
            if (!response.ok) {
              throw new NetworkError(
                `Failed to fetch image from URL: ${imageSource}`
              );
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
          }
        );
        downloadDuration = duration;
        mimeType = this.getImageMimeType(imageSource, imageData);
        content = {
          inlineData: {
            mimeType,
            data: imageData.toString('base64'),
          },
        };
        fileSize = imageData.length;
      } else if (imageSource.startsWith('gs://')) {
        // GCS URIs can be passed directly using file_data
        content = {
          fileData: {
            fileUri: imageSource,
            mimeType: 'image/jpeg',
          },
        };
      } else if (imageSource.startsWith('data:image/')) {
        // Handle base64 data with inlineData
        const base64Data = imageSource.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        mimeType = this.getImageMimeType(imageSource, buffer);
        content = {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        };
        fileSize = buffer.length;
      } else if (imageSource.startsWith('files/')) {
        // Handle file reference using file_data
        content = {
          fileData: {
            fileUri: imageSource,
            mimeType: 'image/jpeg',
          },
        };
      } else {
        throw new Error('Invalid image source format');
      }

      const model = this.client.getGenerativeModel({ model: this.imageModel });

      const { result: response, duration: analysisDuration } =
        await this.measureAsync(async () => {
          return await model.generateContent([content, { text: prompt }]);
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
        downloadDuration + analysisDuration,
        content.fileData?.mimeType || content.inlineData?.mimeType,
        fileSize
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
      let content: any;
      let uploadDuration = 0;

      if (videoSource.startsWith('http')) {
        // Check if it's a YouTube URL
        if (videoSource.includes('youtube.com') || videoSource.includes('youtu.be')) {
          // YouTube URLs can be passed directly
          content = {
            fileData: {
              fileUri: videoSource,
              mimeType: 'video/mp4',
            },
          };
        } else {
          // For other video URLs, download and upload to Files API
          const { result: videoData, duration: downloadDuration } = await this.measureAsync(
            async () => {
              const response = await fetch(videoSource);
              if (!response.ok) {
                throw new NetworkError(
                  `Failed to fetch video from URL: ${videoSource}`
                );
              }
              const arrayBuffer = await response.arrayBuffer();
              return Buffer.from(arrayBuffer);
            }
          );

          const filename = videoSource.split('/').pop() || 'video.mp4';
          const mimeType = this.getVideoMimeType(videoSource, videoData);

          const { result: uploadedFile, duration: uploadFileDuration } = await this.measureAsync(
            async () => {
              return await this.uploadFile(videoData, filename, mimeType);
            }
          );

          uploadDuration = downloadDuration + uploadFileDuration;
          content = {
            fileData: {
              fileUri: uploadedFile.uri!,
              mimeType,
            },
          };
        }
      } else if (videoSource.startsWith('gs://')) {
        // GCS URIs can be passed directly
        content = {
          fileData: {
            fileUri: videoSource,
            mimeType: 'video/mp4',
          },
        };
      } else if (videoSource.startsWith('files/')) {
        // Use existing file reference
        content = {
          fileData: {
            fileUri: videoSource,
            mimeType: 'video/mp4',
          },
        };
      } else {
        throw new Error('Invalid video source format');
      }

      const model = this.client.getGenerativeModel({ model: this.videoModel });

      const { result: response, duration: analysisDuration } = await this.measureAsync(
        async () => {
          return await model.generateContent([content, { text: prompt }]);
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
        uploadDuration + analysisDuration,
        content.fileData?.mimeType
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

  private getImageMimeType(source: string, buffer?: Buffer): string {
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

    if (buffer) {
      for (const [mimeType, signature] of Object.entries(signatures)) {
        if (buffer.slice(0, signature.length).toString() === signature) {
          return mimeType;
        }
      }
    }

    return 'image/jpeg'; // Default fallback
  }

  private getImageMimeTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
    };
    return mimeTypes[extension || ''] || 'image/jpeg';
  }

  private getVideoMimeTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
      flv: 'video/x-flv',
      wmv: 'video/x-ms-wmv',
      '3gp': 'video/3gpp',
      m4v: 'video/mp4',
    };
    return mimeTypes[extension || ''] || 'video/mp4';
  }

  private getVideoMimeType(source: string, buffer: Buffer): string {
    // Try to detect from file extension
    const extension = source.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'webm': 'video/webm',
      'flv': 'video/x-flv',
      'wmv': 'video/x-ms-wmv',
      '3gp': 'video/3gpp',
      'm4v': 'video/mp4',
    };

    if (extension && mimeTypes[extension]) {
      return mimeTypes[extension];
    }

    // Simple detection based on file signature
    const signatures: Record<string, string> = {
      'video/mp4': '\x00\x00\x00\x18ftypmp42',
      'video/webm': '\x1a\x45\xdf\xa3',
      'video/avi': 'RIFF',
      'video/mov': '\x00\x00\x00\x14ftyp',
    };

    for (const [mimeType, signature] of Object.entries(signatures)) {
      if (buffer.slice(0, signature.length).toString() === signature) {
        return mimeType;
      }
    }

    return 'video/mp4'; // Default fallback
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
