/**
 * Base vision provider interface and abstract class
 */

import type {
  VisionProvider,
  AnalysisOptions,
  AnalysisResult,
  UploadedFile,
  HealthStatus,
  RateLimitInfo,
  ProviderCapabilities,
  ModelCapabilities,
  ProviderInfo,
} from '../../types/Providers.js';

export abstract class BaseVisionProvider implements VisionProvider {
  protected imageModel: string;
  protected videoModel: string;
  protected providerName: string;

  constructor(providerName: string, imageModel: string, videoModel: string) {
    this.providerName = providerName;
    this.imageModel = imageModel;
    this.videoModel = videoModel;
  }

  // Abstract methods that must be implemented by concrete providers
  abstract analyzeImage(
    imageSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult>;
  abstract analyzeVideo(
    videoSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult>;
  abstract uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadedFile>;
  abstract downloadFile(fileId: string): Promise<Buffer>;
  abstract deleteFile(fileId: string): Promise<void>;
  abstract getSupportedFormats(): ProviderCapabilities;
  abstract getModelCapabilities(): ModelCapabilities;
  abstract getProviderInfo(): ProviderInfo;
  abstract healthCheck(): Promise<HealthStatus>;
  abstract getRateLimitInfo(): RateLimitInfo;

  // Concrete implementations for common functionality
  setModel(imageModel: string, videoModel: string): void {
    this.imageModel = imageModel;
    this.videoModel = videoModel;
  }

  getImageModel(): string {
    return this.imageModel;
  }

  getVideoModel(): string {
    return this.videoModel;
  }

  supportsVideo(): boolean {
    const capabilities = this.getSupportedFormats();
    return capabilities.supportsVideo;
  }

  protected createAnalysisResult(
    text: string,
    model: string,
    usage?: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    },
    processingTime?: number,
    fileType?: string,
    fileSize?: number
  ): AnalysisResult {
    return {
      text,
      metadata: {
        model,
        provider: this.providerName,
        usage,
        processingTime,
        fileType,
        fileSize,
      },
    };
  }

  protected createHealthStatus(
    status: 'healthy' | 'unhealthy' | 'degraded',
    responseTime?: number,
    message?: string
  ): HealthStatus {
    return {
      status,
      lastCheck: new Date().toISOString(),
      responseTime,
      message,
    };
  }

  protected async measureAsync<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    return { result, duration };
  }

  protected isValidImageFormat(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  protected isValidVideoFormat(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  protected getProviderCapabilities(): ProviderCapabilities {
    return {
      supportedImageFormats: [
        'png',
        'jpg',
        'jpeg',
        'webp',
        'gif',
        'bmp',
        'tiff',
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
      ],
      maxImageSize: 20 * 1024 * 1024, // 20MB
      maxVideoSize: 2 * 1024 * 1024 * 1024, // 2GB
      maxVideoDuration: 3600, // 1 hour
      supportsVideo: true,
      supportsStreaming: false,
      supportsFileUpload: true,
    };
  }

  protected getBaseModelCapabilities(): ModelCapabilities {
    return {
      imageAnalysis: true,
      videoAnalysis: this.supportsVideo(),
      streaming: false,
      maxTokens: 8192,
      supportedFormats: this.getSupportedFormats().supportedImageFormats.concat(
        this.supportsVideo()
          ? this.getSupportedFormats().supportedVideoFormats
          : []
      ),
    };
  }
}
