/**
 * Analysis types for vision providers
 */

export interface AnalysisOptions {
  temperature?: number | undefined;
  topP?: number | undefined;
  maxTokens?: number | undefined; // Keep for backward compatibility
  maxTokensForImage?: number | undefined;
  maxTokensForVideo?: number | undefined;
  stream?: boolean | undefined;
  stopSequences?: string[] | undefined;
}

export interface AnalysisResult {
  text: string;
  metadata: AnalysisMetadata;
}

export interface AnalysisMetadata {
  model: string;
  provider: string;
  usage?: UsageMetadata;
  processingTime?: number;
  fileType?: string;
  fileSize?: number;
}

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface UploadedFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
  uri?: string;
  displayName?: string;
  state?: 'PROCESSING' | 'ACTIVE' | 'FAILED';
  createTime?: string;
  updateTime?: string;
  expirationTime?: string;
  sha256Hash?: string;
}

export interface FileReference {
  type: 'file_uri' | 'public_url' | 'base64';
  uri?: string;
  url?: string;
  data?: string;
  mimeType: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  lastCheck: string;
  responseTime?: number;
}

export interface RateLimitInfo {
  requestsPerMinute?: number;
  requestsPerDay?: number;
  currentUsage?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  resetTime?: string;
}

export interface ProviderCapabilities {
  supportedImageFormats: string[];
  supportedVideoFormats: string[];
  maxImageSize: number;
  maxVideoSize: number;
  maxVideoDuration: number;
  supportsVideo: boolean;
  supportsStreaming: boolean;
  supportsFileUpload: boolean;
}

export interface ModelCapabilities {
  imageAnalysis: boolean;
  videoAnalysis: boolean;
  streaming: boolean;
  maxTokensForImage: number;
  maxTokensForVideo: number;
  supportedFormats: string[];
}

export interface ProviderInfo {
  name: string;
  version: string;
  description: string;
  capabilities: ProviderCapabilities;
  modelCapabilities: ModelCapabilities;
  rateLimit: RateLimitInfo;
}
