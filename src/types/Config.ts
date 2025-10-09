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
  VERTEX_CREDENTIALS?: string;
  VERTEX_PROJECT_ID?: string;
  VERTEX_LOCATION?: string;
  VERTEX_ENDPOINT?: string;

  // Model configuration
  IMAGE_MODEL?: string;
  VIDEO_MODEL?: string;

  // Function-specific model configuration
  ANALYZE_IMAGE_MODEL?: string;
  COMPARE_IMAGES_MODEL?: string;
  ANALYZE_VIDEO_MODEL?: string;

  // Google Cloud Storage configuration (for Vertex AI file storage)
  GCS_BUCKET_NAME?: string;
  GCS_PROJECT_ID?: string; // Auto-derived from VERTEX_CREDENTIALS if not provided
  GCS_CREDENTIALS?: string; // Optional: defaults to VERTEX_CREDENTIALS
  GCS_REGION?: string; // Optional: defaults to VERTEX_LOCATION

  // Universal API parameters
  TEMPERATURE?: number;
  TOP_P?: number;
  TOP_K?: number;
  MAX_TOKEN?: number;

  // Task-specific API parameters
  TEMPERATURE_FOR_IMAGE?: number;
  TOP_P_FOR_IMAGE?: number;
  TOP_K_FOR_IMAGE?: number;
  MAX_TOKENS_FOR_IMAGE?: number;
  TEMPERATURE_FOR_VIDEO?: number;
  TOP_P_FOR_VIDEO?: number;
  TOP_K_FOR_VIDEO?: number;
  MAX_TOKENS_FOR_VIDEO?: number;

  // Function-specific API parameters
  TEMPERATURE_FOR_ANALYZE_IMAGE?: number;
  TOP_P_FOR_ANALYZE_IMAGE?: number;
  TOP_K_FOR_ANALYZE_IMAGE?: number;
  MAX_TOKENS_FOR_ANALYZE_IMAGE?: number;
  TEMPERATURE_FOR_COMPARE_IMAGES?: number;
  TOP_P_FOR_COMPARE_IMAGES?: number;
  TOP_K_FOR_COMPARE_IMAGES?: number;
  MAX_TOKENS_FOR_COMPARE_IMAGES?: number;
  TEMPERATURE_FOR_ANALYZE_VIDEO?: number;
  TOP_P_FOR_ANALYZE_VIDEO?: number;
  TOP_K_FOR_ANALYZE_VIDEO?: number;
  MAX_TOKENS_FOR_ANALYZE_VIDEO?: number;

  // File processing configuration
  MAX_IMAGE_SIZE?: number;
  MAX_VIDEO_SIZE?: number;
  ALLOWED_IMAGE_FORMATS?: string[];
  ALLOWED_VIDEO_FORMATS?: string[];
  MAX_VIDEO_DURATION?: number;
  MAX_IMAGES_FOR_COMPARISON?: number;

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
  projectId: string;
  credentials: string;
  region: string;
}

export interface FileUploadConfig {
  useProviderFilesApi: boolean;
  geminiFilesApiThreshold: number;
  vertexAIFilesApiThreshold: number;
}

export interface ApiConfig {
  temperature: number;
  topP: number;
  topK: number;
  maxToken: number;
  maxTokensForImage: number;
  maxTokensForVideo: number;
  temperatureForImage?: number;
  topPForImage?: number;
  topKForImage?: number;
  temperatureForVideo?: number;
  topPForVideo?: number;
  topKForVideo?: number;
  temperatureForAnalyzeImage?: number;
  topPForAnalyzeImage?: number;
  topKForAnalyzeImage?: number;
  maxTokensForAnalyzeImage?: number;
  temperatureForCompareImages?: number;
  topPForCompareImages?: number;
  topKForCompareImages?: number;
  maxTokensForCompareImages?: number;
  temperatureForAnalyzeVideo?: number;
  topPForAnalyzeVideo?: number;
  topKForAnalyzeVideo?: number;
  maxTokensForAnalyzeVideo?: number;
  // Model configuration
  analyzeImageModel?: string;
  compareImagesModel?: string;
  analyzeVideoModel?: string;
}

export interface FileProcessingConfig {
  maxImageSize: number;
  maxVideoSize: number;
  allowedImageFormats: string[];
  allowedVideoFormats: string[];
  maxVideoDuration: number;
  maxImagesForComparison: number;
}

export interface LoggingConfig {
  logLevel: 'info' | 'debug' | 'warn' | 'error';
}

export interface DevelopmentConfig {
  nodeEnv: 'development' | 'production';
}
