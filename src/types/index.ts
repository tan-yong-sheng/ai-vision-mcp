/**
 * Central type exports for the Vision MCP Server
 */

// Export Config types with aliases to avoid conflicts
export type {
  Config,
  GeminiConfig as GeminiProviderConfig,
  VertexAIConfig as VertexAIProviderConfig,
  FileUploadConfig,
  ApiConfig,
  FileProcessingConfig,
  LoggingConfig,
  DevelopmentConfig,
} from './Config.js';

// Export all other types normally
export * from './Analysis.js';
export type {
  StorageProvider,
  StorageFile,
  StorageConfig,
  UploadOptions,
  ListOptions,
  ListResult,
  SignedUrlOptions,
} from './Storage.js';
export * from './Providers.js';
export type {
  VisionError,
  ConfigurationError,
  ProviderError,
  FileUploadError,
  FileNotFoundError,
  UnsupportedFileTypeError,
  FileSizeExceededError,
  RateLimitExceededError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  ValidationError,
  StorageError,
  ErrorType,
  ErrorDetails,
} from './Errors.js';
