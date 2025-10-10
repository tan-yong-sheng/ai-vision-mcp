/**
 * Gemini API provider implementation
 */

import { GoogleGenAI, setDefaultBaseUrls } from '@google/genai';
import fetch from 'node-fetch';
import { BaseVisionProvider } from '../base/VisionProvider.js';
import { FUNCTION_NAMES } from '../../constants/FunctionNames.js';
import type {
  GeminiConfig,
  AnalysisOptions,
  AnalysisResult,
  UploadedFile,
  HealthStatus,
  ProviderCapabilities,
  ModelCapabilities,
  ProviderInfo,
  GeminiFileMetadata,
} from '../../types/Providers.js';
import {
  ProviderError,
  FileUploadError,
  FileNotFoundError,
  NetworkError,
} from '../../types/Errors.js';

export class GeminiProvider extends BaseVisionProvider {
  private client: GoogleGenAI;
  private config: GeminiConfig;
  private baseUrl: string;

  constructor(config: GeminiConfig) {
    super('gemini', config.imageModel, config.videoModel);
    this.config = config;

    // Validate endpoint format
    this.validateEndpoint(config.baseUrl);

    // Set global base URL before creating the client
    setDefaultBaseUrls({ geminiUrl: config.baseUrl });

    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.baseUrl = config.baseUrl;
  }

  private validateEndpoint(endpoint: string): void {
    // Validate that it's a valid URL format
    try {
      new URL(endpoint);
    } catch (error) {
      throw new ProviderError(
        `Invalid Gemini endpoint format: ${endpoint}. Must be a valid URL.`,
        'gemini',
        undefined,
        400
      );
    }
  }

  async analyzeImage(
    imageSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult> {
    try {
      console.log(
        `[GeminiProvider] Received imageSource: ${imageSource.substring(0, 100)}${imageSource.length > 100 ? '...' : ''}`
      );
      console.log(
        `[GeminiProvider] ImageSource starts with data:image: ${imageSource.startsWith('data:image/')}`
      );
      console.log(
        `[GeminiProvider] ImageSource starts with http: ${imageSource.startsWith('http')}`
      );
      console.log(
        `[GeminiProvider] ImageSource starts with gs: ${imageSource.startsWith('gs://')}`
      );
      console.log(
        `[GeminiProvider] ImageSource starts with files/: ${imageSource.startsWith('files/')}`
      );
      console.log(
        `[GeminiProvider] ImageSource contains generativelanguage: ${imageSource.includes('generativelanguage.googleapis.com')}`
      );

      let content: any;
      let mimeType: string;
      let fileSize: number | undefined;
      let processingDuration = 0;

      if (imageSource.startsWith('data:image/')) {
        // Handle base64 data with inlineData
        const matches = imageSource.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid data URL format');
        }

        mimeType = matches[1];
        const base64Data = matches[2];
        fileSize = Buffer.from(base64Data, 'base64').length;

        content = {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        };
      } else if (imageSource.startsWith('gs://')) {
        // GCS URIs can be passed directly using file_data
        mimeType = 'image/jpeg'; // Default, will be detected if needed
        content = {
          fileData: {
            fileUri: imageSource,
            mimeType,
          },
        };
      } else if (imageSource.startsWith('http')) {
        // Download image from URL and upload to Files API
        const { result: imageData, duration: downloadDuration } =
          await this.measureAsync(async () => {
            const response = await fetch(imageSource);
            if (!response.ok) {
              throw new NetworkError(
                `Failed to fetch image from URL: ${imageSource}`
              );
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
          });

        const filename = imageSource.split('/').pop() || 'image.jpg';
        mimeType = this.getImageMimeTypeFromUrl(imageSource);
        fileSize = imageData.length;

        const { result: uploadedFile, duration: uploadFileDuration } =
          await this.measureAsync(async () => {
            return await this.uploadFile(imageData, filename, mimeType);
          });

        processingDuration = downloadDuration + uploadFileDuration;
        content = {
          fileData: {
            fileUri: uploadedFile.uri!,
            mimeType,
          },
        };
      } else if (
        imageSource.startsWith('files/') ||
        imageSource.includes('generativelanguage.googleapis.com')
      ) {
        // Handle Files API references - for newer SDK, we can use file references directly
        let fileUri: string;
        if (imageSource.startsWith('files/')) {
          fileUri = this.buildFileUri(imageSource);
        } else {
          fileUri = imageSource;
        }

        // Wait for file to be processed if needed
        const fileId = fileUri.split('/').pop()!;
        await this.waitForFileProcessing(fileId);

        mimeType = 'image/jpeg'; // Default, will be detected if needed
        content = {
          fileData: {
            fileUri,
            mimeType,
          },
        };
      } else {
        throw new Error(
          `Invalid image source format: ${imageSource.substring(0, 100)}${imageSource.length > 100 ? '...' : ''} (starts with http: ${imageSource.startsWith('http')}, starts with data:image: ${imageSource.startsWith('data:image/')}, starts with files/: ${imageSource.startsWith('files/')})`
        );
      }

      const model = this.resolveModelForFunction(
        'image',
        options?.functionName
      );

      const { result: response, duration: analysisDuration } =
        await this.measureAsync(async () => {
          return await this.client.models.generateContent({
            model,
            contents: [content, { text: prompt }],
            config: this.buildConfigWithOptions(
              'image',
              options?.functionName,
              options
            ),
          });
        });

      const text = response.text || '';
      const usage = response.usageMetadata;

      return this.createAnalysisResult(
        text,
        model,
        usage
          ? {
              promptTokenCount: usage.promptTokenCount || 0,
              candidatesTokenCount: usage.candidatesTokenCount || 0,
              totalTokenCount: usage.totalTokenCount || 0,
            }
          : undefined,
        processingDuration + analysisDuration,
        content.fileData?.mimeType || content.inlineData?.mimeType,
        fileSize,
        response.modelVersion,
        response.responseId
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
      console.log(`[GeminiProvider] Comparing ${imageSources.length} images`);

      // Process all images to create content parts
      const contentParts: any[] = [];
      let totalFileSize = 0;
      let totalProcessingDuration = 0;

      for (let i = 0; i < imageSources.length; i++) {
        const imageSource = imageSources[i];
        console.log(
          `[GeminiProvider] Processing image ${i + 1}: ${imageSource.substring(0, 100)}${imageSource.length > 100 ? '...' : ''}`
        );

        let content: any;
        let mimeType: string;
        let fileSize: number | undefined;
        let processingDuration = 0;

        if (imageSource.startsWith('data:image/')) {
          // Handle base64 data with inlineData
          const matches = imageSource.match(/^data:([^;]+);base64,(.+)$/);
          if (!matches) {
            throw new Error(`Invalid data URL format for image ${i + 1}`);
          }

          mimeType = matches[1];
          const base64Data = matches[2];
          fileSize = Buffer.from(base64Data, 'base64').length;

          content = {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          };
        } else if (imageSource.startsWith('gs://')) {
          // GCS URIs can be passed directly using file_data
          mimeType = 'image/jpeg'; // Default, will be detected if needed
          content = {
            fileData: {
              fileUri: imageSource,
              mimeType,
            },
          };
        } else if (imageSource.startsWith('http')) {
          // Download image from URL and upload to Files API
          const { result: imageData, duration: downloadDuration } =
            await this.measureAsync(async () => {
              const response = await fetch(imageSource);
              if (!response.ok) {
                throw new NetworkError(
                  `Failed to fetch image ${i + 1} from URL: ${imageSource}`
                );
              }
              const arrayBuffer = await response.arrayBuffer();
              return Buffer.from(arrayBuffer);
            });

          const filename = imageSource.split('/').pop() || `image${i + 1}.jpg`;
          mimeType = this.getImageMimeTypeFromUrl(imageSource);
          fileSize = imageData.length;

          const { result: uploadedFile, duration: uploadFileDuration } =
            await this.measureAsync(async () => {
              return await this.uploadFile(imageData, filename, mimeType);
            });

          processingDuration = downloadDuration + uploadFileDuration;
          content = {
            fileData: {
              fileUri: uploadedFile.uri!,
              mimeType,
            },
          };
        } else if (
          imageSource.startsWith('files/') ||
          imageSource.includes('generativelanguage.googleapis.com')
        ) {
          // Handle Files API references
          let fileUri: string;
          if (imageSource.startsWith('files/')) {
            fileUri = this.buildFileUri(imageSource);
          } else {
            fileUri = imageSource;
          }

          // Wait for file to be processed if needed
          const fileId = fileUri.split('/').pop()!;
          await this.waitForFileProcessing(fileId);

          mimeType = 'image/jpeg'; // Default, will be detected if needed
          content = {
            fileData: {
              fileUri,
              mimeType,
            },
          };
        } else {
          throw new Error(
            `Invalid image source format for image ${i + 1}: ${imageSource.substring(0, 100)}${imageSource.length > 100 ? '...' : ''}`
          );
        }

        contentParts.push(content);
        if (fileSize) {
          totalFileSize += fileSize;
        }
        totalProcessingDuration += processingDuration;
      }

      // Add the prompt as the last content part
      contentParts.push({ text: prompt });

      console.log(
        `[GeminiProvider] All ${imageSources.length} images processed, sending to Gemini API`
      );

      const model = this.resolveModelForFunction(
        'image',
        options?.functionName
      );

      const { result: response, duration: analysisDuration } =
        await this.measureAsync(async () => {
          return await this.client.models.generateContent({
            model,
            contents: contentParts,
            config: this.buildConfigWithOptions(
              'image',
              options?.functionName,
              options
            ),
          });
        });

      const text = response.text || '';
      const usage = response.usageMetadata;

      return this.createAnalysisResult(
        text,
        model,
        usage
          ? {
              promptTokenCount: usage.promptTokenCount || 0,
              candidatesTokenCount: usage.candidatesTokenCount || 0,
              totalTokenCount: usage.totalTokenCount || 0,
            }
          : undefined,
        totalProcessingDuration + analysisDuration,
        'image/multiple',
        totalFileSize,
        response.modelVersion,
        response.responseId
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
      let content: any;
      let uploadDuration = 0;

      if (
        videoSource.startsWith('files/') ||
        videoSource.includes('generativelanguage.googleapis.com')
      ) {
        // Use existing file reference - check this FIRST before other http checks
        // videoSource could be either "files/3lahndmttgdq" or full Google API URL
        const fileUri = videoSource.startsWith('files/')
          ? this.buildVideoUri(videoSource)
          : videoSource;

        content = {
          fileData: {
            fileUri: fileUri,
            mimeType: 'video/mp4',
          },
        };
      } else if (videoSource.startsWith('http')) {
        // Check if it's a YouTube URL
        if (
          videoSource.includes('youtube.com') ||
          videoSource.includes('youtu.be')
        ) {
          // YouTube URLs can be passed directly
          content = {
            fileData: {
              fileUri: videoSource,
              mimeType: 'video/mp4',
            },
          };
        } else {
          // For other video URLs, download and upload to Files API
          const { result: videoData, duration: downloadDuration } =
            await this.measureAsync(async () => {
              const response = await fetch(videoSource);
              if (!response.ok) {
                throw new NetworkError(
                  `Failed to fetch video from URL: ${videoSource}`
                );
              }
              const arrayBuffer = await response.arrayBuffer();
              return Buffer.from(arrayBuffer);
            });

          const filename = videoSource.split('/').pop() || 'video.mp4';
          const mimeType = this.getVideoMimeType(videoSource, videoData);

          const { result: uploadedFile, duration: uploadFileDuration } =
            await this.measureAsync(async () => {
              return await this.uploadFile(videoData, filename, mimeType);
            });

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
      } else {
        throw new Error('Invalid video source format');
      }

      const model = this.resolveModelForFunction(
        'video',
        options?.functionName
      );

      const { result: response, duration: analysisDuration } =
        await this.measureAsync(async () => {
          return await this.client.models.generateContent({
            model,
            contents: [content, { text: prompt }],
            config: this.buildConfigWithOptions(
              'video',
              options?.functionName,
              options
            ),
          });
        });

      const text = response.text || '';
      const usage = response.usageMetadata;

      return this.createAnalysisResult(
        text,
        model,
        usage
          ? {
              promptTokenCount: usage.promptTokenCount || 0,
              candidatesTokenCount: usage.candidatesTokenCount || 0,
              totalTokenCount: usage.totalTokenCount || 0,
            }
          : undefined,
        uploadDuration + analysisDuration,
        content.fileData?.mimeType,
        undefined, // fileSize not available for video
        response.modelVersion,
        response.responseId
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
      const { result: fileMetadata } = await this.measureAsync(async () => {
        return await this.uploadToGeminiFiles(buffer, filename, mimeType);
      });

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
      await this.getFileMetadata(fileId);

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
      await this.client.files.delete({ name: fileId });
    } catch (error) {
      // Ignore 404 errors (file already deleted)
      if (!(error instanceof Error && error.message.includes('404'))) {
        throw this.handleError(error, 'file deletion');
      }
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
      supportsFileUpload: true,
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
      name: 'Google Gemini',
      version: '2.0',
      description:
        'Google Gemini multimodal AI model for image and video analysis',
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
          contents: [{ text: 'Hello' }],
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

  private buildFileUri(fileId: string): string {
    // Remove any leading 'files/' prefix if present
    const cleanFileId = fileId.startsWith('files/')
      ? fileId.replace('files/', '')
      : fileId;
    return `${this.baseUrl}/v1beta/files/${cleanFileId}`;
  }

  private buildVideoUri(videoSource: string): string {
    // If it's already a full URL, return as-is
    if (videoSource.startsWith('http')) {
      return videoSource;
    }
    // Otherwise, assume it's a file ID and construct the URI
    return `${this.baseUrl}/v1beta/${videoSource}`;
  }

  private async uploadToGeminiFiles(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<GeminiFileMetadata> {
    try {
      // Use the new @google/genai SDK's file upload API
      const blob = new Blob([buffer], { type: mimeType });
      const file = await this.client.files.upload({
        file: blob as any, // Cast to any since SDK expects Blob but type may not match exactly
        config: {
          mimeType,
          displayName: filename,
        },
      });

      // Map the new SDK's File type to our GeminiFileMetadata type
      return {
        name: file.name || '',
        displayName: file.displayName || filename,
        mimeType: file.mimeType || mimeType,
        sizeBytes: file.sizeBytes || String(buffer.length),
        createTime: file.createTime || new Date().toISOString(),
        updateTime: file.updateTime || new Date().toISOString(),
        expirationTime: file.expirationTime || '',
        sha256Hash: file.sha256Hash || '',
        uri: file.uri || '',
        state:
          (file.state as 'PROCESSING' | 'ACTIVE' | 'FAILED') || 'PROCESSING',
      };
    } catch (error) {
      throw new FileUploadError(
        `Failed to upload file to Gemini: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async getFileMetadata(fileId: string): Promise<GeminiFileMetadata> {
    try {
      const file = await this.client.files.get({ name: fileId });

      return {
        name: file.name || fileId,
        displayName: file.displayName || '',
        mimeType: file.mimeType || '',
        sizeBytes: file.sizeBytes || '0',
        createTime: file.createTime || '',
        updateTime: file.updateTime || '',
        expirationTime: file.expirationTime || '',
        sha256Hash: file.sha256Hash || '',
        uri: file.uri || '',
        state:
          (file.state as 'PROCESSING' | 'ACTIVE' | 'FAILED') || 'PROCESSING',
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        throw new FileNotFoundError(fileId, 'gemini');
      }
      throw new Error(
        `Failed to get file metadata: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async waitForFileProcessing(fileId: string): Promise<void> {
    const maxAttempts = 30; // Maximum 30 attempts
    const delay = 2000; // 2 seconds between attempts

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const fileMetadata = await this.getFileMetadata(fileId);

        if (fileMetadata.state === 'ACTIVE') {
          return; // File is ready for use
        }

        if (fileMetadata.state === 'FAILED') {
          throw new FileUploadError(
            `File processing failed: Unknown error`,
            'gemini'
          );
        }
      } catch (error) {
        // If it's a network error, we'll retry
        if (attempt === maxAttempts) {
          throw new FileUploadError(
            `Failed to check file status after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`,
            'gemini'
          );
        }
      }

      // Wait before the next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new FileUploadError(
      `File processing timed out after ${(maxAttempts * delay) / 1000} seconds`,
      'gemini'
    );
  }

  // Public getters for file upload strategy
  getApiBaseUrl(): string {
    return this.baseUrl;
  }

  getApiKey(): string {
    return this.config.apiKey;
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
