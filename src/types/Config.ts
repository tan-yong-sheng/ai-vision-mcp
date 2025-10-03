/**
 * Configuration types for the Vision MCP Server
 */

export interface Config {
  // Provider selection
  IMAGE_PROVIDER: 'google' | 'vertex_ai';
  VIDEO_PROVIDER: 'google' | 'vertex_ai';

  // Gemini API configuration
  GEMINI_API_KEY?: string | undefined;
  GEMINI_BASE_URL?: string | undefined;

  // Vertex AI configuration
  GOOGLE_APPLICATION_CREDENTIALS?: string;
  VERTEX_PROJECT_ID?: string;
  VERTEX_LOCATION?: string;
  VERTEX_ENDPOINT?: string;

  // Model configuration
  IMAGE_MODEL?: string;
  VIDEO_MODEL?: string;

  // Google Cloud Storage configuration
  GCS_BUCKET_NAME?: string;
  GCS_PROJECT_ID?: string;
  GCS_KEY_FILE_PATH?: string;
  GCS_PUBLIC_URL_BASE?: string;

  // Universal API parameters
  TEMPERATURE?: number;
  TOP_P?: number;
  MAX_TOKENS_FOR_IMAGE?: number;
  MAX_TOKENS_FOR_VIDEO?: number;
  STREAM_RESPONSES?: boolean;

  // File processing configuration
  MAX_IMAGE_SIZE?: number;
  MAX_VIDEO_SIZE?: number;
  ALLOWED_IMAGE_FORMATS?: string[];
  ALLOWED_VIDEO_FORMATS?: string[];
  MAX_VIDEO_DURATION?: number;

  // File upload configuration
  GEMINI_FILES_API_THRESHOLD?: number;
  VERTEX_AI_FILES_API_THRESHOLD?: number;

  // Logging configuration
  LOG_LEVEL?: 'info' | 'debug' | 'warn' | 'error';

  // Development configuration
  NODE_ENV?: 'development' | 'production';
}

export interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  imageModel: string;
  videoModel: string;
}

export interface VertexAIConfig {
  projectId: string;
  location: string;
  endpoint: string;
  credentials?: string;
  imageModel: string;
  videoModel: string;
}


export interface GCSConfig {
  bucketName: string;
  projectId?: string;
  keyFilePath?: string;
  publicUrlBase?: string;
}

export interface FileUploadConfig {
  useProviderFilesApi: boolean;
  geminiFilesApiThreshold: number;
  vertexAIFilesApiThreshold: number;
}

export interface ApiConfig {
  temperature: number;
  topP: number;
  maxTokensForImage: number;
  maxTokensForVideo: number;
  streamResponses: boolean;
}

export interface FileProcessingConfig {
  maxImageSize: number;
  maxVideoSize: number;
  allowedImageFormats: string[];
  allowedVideoFormats: string[];
  maxVideoDuration: number;
}

export interface LoggingConfig {
  logLevel: 'info' | 'debug' | 'warn' | 'error';
}

export interface DevelopmentConfig {
  nodeEnv: 'development' | 'production';
}
