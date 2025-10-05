# Vision MCP Server - Development Specification

## 1. Overview

Vision MCP server that provides AI-powered image and video analysis using Google Gemini with Google Cloud storage integration.

### 1.1 Current Implementation

- **Provider**: Google Gemini for both image and video analysis
- **Storage**: Google Cloud storage
- **Architecture**: Modular design for future provider expansion
- **Protocol**: Stateless MCP implementation

### 1.2 Future Expansion

Architecture supports easy addition of new providers through:
- Modular naming convention (GEMINI_, OPENAI_, etc.)
- Provider factory pattern for seamless integration

## 2. Environment Variables Configuration

### 2.1 Required Configuration

```bash
#===============================================
# PROVIDER SELECTION
#===============================================
IMAGE_PROVIDER=google|vertex_ai
VIDEO_PROVIDER=google|vertex_ai

#===============================================
# GEMINI API CONFIGURATION (AI Studio)
#===============================================
GEMINI_API_KEY=your_gemini_api_key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com

#===============================================
# VERTEX AI CONFIGURATION
#===============================================
VERTEX_CREDENTIALS=path/to/service-account.json
VERTEX_PROJECT_ID=your-gcp-project-id  # Optional: Auto-derived from credentials
VERTEX_LOCATION=us-central1
VERTEX_ENDPOINT=https://aiplatform.googleapis.com

#===============================================
# GOOGLE CLOUD STORAGE CONFIGURATION (Required for Vertex AI)
#===============================================
GCS_BUCKET_NAME=your-vision-files-bucket
# The following are optional and auto-derived from VERTEX_CREDENTIALS:
# GCS_PROJECT_ID - Auto-derived from VERTEX_CREDENTIALS
# GCS_CREDENTIALS - Defaults to VERTEX_CREDENTIALS
# GCS_REGION - Defaults to VERTEX_LOCATION
```

### 2.2 Optional Configuration

```bash
#===============================================
# UNIVERSAL API PARAMETERS
#===============================================
TEMPERATURE=0.8
TOP_P=0.6
MAX_TOKENS=16384

#===============================================
# FILE PROCESSING CONFIGURATION
#===============================================
MAX_IMAGE_SIZE=20MB
MAX_VIDEO_SIZE=2GB
ALLOWED_IMAGE_FORMATS=png,jpg,jpeg,webp,gif,bmp,tiff
ALLOWED_VIDEO_FORMATS=mp4,mov,avi,mkv,webm,flv,wmv,3gp
MAX_VIDEO_DURATION=3600  # seconds (1 hour)

#===============================================
# FILE UPLOAD CONFIGURATION
#===============================================
# File upload thresholds (files larger than this will use storage)
GEMINI_FILES_API_THRESHOLD=10MB
VERTEX_AI_FILES_API_THRESHOLD=0  # Vertex AI requires Google Cloud Storage for all files

# NOTE: File upload strategy is automatically determined by provider:
# - Google AI Studio: Uses inlineData for images, Files API for large files/videos
# - Vertex AI: Uses Google Cloud Storage with gs:// URIs for all files
# - Credentials are automatically shared between Vertex AI and GCS

#===============================================
# LOGGING CONFIGURATION
#===============================================
LOG_LEVEL=info|debug|warn|error

#===============================================
# DEVELOPMENT CONFIGURATION
#===============================================
NODE_ENV=development|production
```

## 3. System Architecture

### 3.1 Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Vision MCP Server                   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐  │
│  │   MCP Functions     │  │  MCP Resources  │  │ MCP    │  │
│  │                 │  │                 │  │ Prompts │  │
│  │ • analyze_image │  │ • file_storage  │  │         │  │
│  │ • analyze_video │  │ • provider_info │  │ • vision│  │
│  │                 │  │ • model_info    │  │ • code  │  │
│  └─────────────────┘  └─────────────────┘  └─────────┘  │
├─────────────────────────────────────────────────────────┤
│                 Provider Factory Layer                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐  │
│  │   Image Provider│  │  Video Provider │  │ Storage  │  │
│  │                 │  │                 │  │ Provider │  │
│  │ • Gemini        │  │ • Gemini        │  │         │  │
│  └─────────────────┘  └─────────────────┘  │ • Google Cloud    │  │
│                                         └─────────┘  │
├─────────────────────────────────────────────────────────┤
│                    Core Services                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────┐  │
│  │   File Service   │  │  Config Service  │  │ Logger  │  │
│  │                  │  │                  │  │ Service │  │
│  │ • Cloud Upload   │  │ • Env Variables  │  │         │  │
│  │ • URL Handling   │  │ • Provider Config│  │ • Struct│  │
│  │ • Validation     │  │ • Feature Flags  │  │ • Multi │  │
│  └──────────────────┘  └──────────────────┘  └─────────┘  │
├─────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐  │
│  │   HTTP Client   │  │   Error Handler │  │ Rate    │  │
│  │                 │  │                 │  │ Limiting│  │
│  │ • Retry Logic   │  │ • Error Types   │  │         │  │
│  │                 │  │ • Context       │  │ • Per   │  │
│  │                 │  │ • Recovery      │  │ Provider│  │
│  └─────────────────┘  └─────────────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Provider Interface

```typescript
// Core provider interface
interface VisionProvider {
  // Core capabilities
  analyzeImage(imageSource: string, prompt: string, options?: AnalysisOptions): Promise<AnalysisResult>;
  analyzeVideo(videoSource: string, prompt: string, options?: AnalysisOptions): Promise<AnalysisResult>;

  // File operations
  uploadFile(buffer: Buffer, filename: string, mimeType: string): Promise<UploadedFile>;
  downloadFile(fileId: string): Promise<Buffer>;
  deleteFile(fileId: string): Promise<void>;

  // Model configuration
  setModel(imageModel: string, videoModel: string): void;
  getImageModel(): string;
  getVideoModel(): string;

  // Provider information
  getSupportedFormats(): ProviderCapabilities;
  getModelCapabilities(): ModelCapabilities;
  getProviderInfo(): ProviderInfo;

  // Health and status
  healthCheck(): Promise<HealthStatus>;
  getRateLimitInfo(): RateLimitInfo;
  supportsVideo(): boolean;
}
```

### 3.3 Provider Factory

```typescript
class ProviderFactory {
  private static providers = new Map<string, () => VisionProvider>();

  static registerProvider(name: string, factory: () => VisionProvider): void {
    this.providers.set(name, factory);
  }

  static createProvider(config: Config, type: 'image' | 'video'): VisionProvider {
    const providerName = config[`${type.toUpperCase()}_PROVIDER`] || 'google';
    const factory = this.providers.get(providerName);

    if (!factory) {
      throw new Error(`Unsupported provider: ${providerName}`);
    }

    const provider = factory();
    provider.setModel(config.IMAGE_MODEL, config.VIDEO_MODEL);
    return provider;
  }
```

### 3.4 Storage Provider

```typescript
// Storage provider interface
interface StorageProvider {
  uploadFile(buffer: Buffer, filename: string, mimeType: string): Promise<StorageFile>;
  downloadFile(fileId: string): Promise<Buffer>;
  deleteFile(fileId: string): Promise<void>;
  getPublicUrl(fileId: string): Promise<string>;
  getSignedUrl(fileId: string, expiresIn: number): Promise<string>;
  listFiles(prefix?: string): Promise<StorageFile[]>;
}

// Google Cloud Storage implementation using native SDK
class GCSStorageProvider implements StorageProvider {
  private storage: Storage;
  private bucket: Bucket;
  private config: GCSConfig;

  constructor(config: {
    bucketName: string;
    projectId: string;
    credentials: string;
    region?: string;
  }) {
    this.config = config;

    // Initialize native GCS Storage client
    this.storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.credentials,
    });

    this.bucket = this.storage.bucket(config.bucketName);
  }

  async uploadFile(buffer: Buffer, filename: string, mimeType: string): Promise<StorageFile> {
    const file = this.bucket.file(filename);

    await file.save(buffer, {
      contentType: mimeType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    const [metadata] = await file.getMetadata();

    return {
      id: filename,
      filename,
      mimeType,
      size: buffer.length,
      url: `gs://${this.config.bucketName}/${filename}`,
      lastModified: metadata.updated || new Date().toISOString(),
      etag: metadata.etag,
    };
  }

  async getPublicUrl(fileId: string): Promise<string> {
    // Return GCS URI format (gs://bucket/path)
    return `gs://${this.config.bucketName}/${fileId}`;
  }
}
```

### 3.5 File Upload Strategies

```typescript
// File upload strategy interface
interface FileUploadStrategy {
  uploadFile(buffer: Buffer, filename: string, mimeType: string): Promise<UploadedFile>;
  getFileForAnalysis(uploadedFile: UploadedFile): Promise<FileReference>;
  cleanup?(fileId: string): Promise<void>;
}

// Gemini API Files Strategy
class GeminiFilesAPI implements FileUploadStrategy {
  constructor(private config: GeminiConfig) {}

  async uploadFile(buffer: Buffer, filename: string, mimeType: string): Promise<UploadedFile> {
    // Upload to Gemini Files API
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType }), filename);

    const response = await fetch(`${this.config.baseUrl}/upload/v1beta/files`, {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': this.config.apiKey,
      },
      body: formData,
    });

    return await response.json();
  }

  async getFileForAnalysis(uploadedFile: UploadedFile): Promise<FileReference> {
    return {
      type: 'file_uri',
      uri: uploadedFile.uri,
      mimeType: uploadedFile.mimeType
    };
  }
}

// Vertex AI Storage Strategy
class VertexAIStorageStrategy implements FileUploadStrategy {
  constructor(private storageProvider: StorageProvider) {}

  async uploadFile(buffer: Buffer, filename: string, mimeType: string): Promise<UploadedFile> {
    // Upload to Google Cloud Storage using native SDK
    return await this.storageProvider.uploadFile(buffer, filename, mimeType);
  }

  async getFileForAnalysis(uploadedFile: UploadedFile): Promise<FileReference> {
    // For Vertex AI with native GCS, the URL is already in gs:// format
    const gcsUri = await this.storageProvider.getPublicUrl(uploadedFile.id);
    return {
      type: 'file_uri',
      uri: gcsUri,
      mimeType: uploadedFile.mimeType
    };
  }
}

// File Upload Factory
class FileUploadFactory {
  static createStrategy(config: Config, type: 'image' | 'video'): FileUploadStrategy {
    const providerName = config[`${type.toUpperCase()}_PROVIDER`] || 'google';

    switch (providerName) {
      case 'google':
        return new GeminiFilesAPI(config);
      case 'vertex_ai':
        const storageProvider = StorageFactory.createProvider(config);
        return new VertexAIStorageStrategy(storageProvider);
      default:
        throw new Error(`Unsupported provider for file upload: ${providerName}`);
    }
  }
}
```

## 4. Implementation Guidelines

### 4.1 Project Structure

```
src/
├── providers/
│   ├── base/
│   │   └── VisionProvider.ts
│   ├── gemini/
│   │   ├── GeminiProvider.ts
│   │   └── GeminiClient.ts
│   ├── vertexai/
│   │   └── VertexAIProvider.ts
│   └── factory/
│       └── ProviderFactory.ts
├── storage/
│   ├── base/
│   │   └── StorageProvider.ts
│   ├── gcs/
│   │   └── GCSStorage.ts
│   └── factory/
│       └── StorageFactory.ts
├── file-upload/
│   ├── base/
│   │   └── FileUploadStrategy.ts
│   ├── gemini/
│   │   └── GeminiFilesAPI.ts
│   ├── vertexai/
│   │   └── VertexAIStorageStrategy.ts
│   └── factory/
│       └── FileUploadFactory.ts
├── services/
│   ├── FileService.ts
│   ├── ConfigService.ts
│   └── LoggerService.ts
├── tools/
│   ├── analyze_image.ts
│   └── analyze_video.ts
├── types/
│   ├── Config.ts
│   ├── Analysis.ts
│   └── Storage.ts
├── utils/
│   ├── validation.ts
│   ├── errors.ts
│   └── retry.ts
└── server.ts
```

### 4.2 Gemini Provider Implementation

```typescript
export class GeminiProvider implements VisionProvider {
  private client: GoogleGenerativeAI;
  private imageModel: string;
  private videoModel: string;

  constructor(config: GeminiConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.imageModel = config.imageModel;
    this.videoModel = config.videoModel;
  }

  async analyzeImage(imageSource: string, prompt: string, options?: AnalysisOptions): Promise<AnalysisResult> {
    const model = this.client.getGenerativeModel({ model: this.imageModel });

    const imageData = await this.fetchImageData(imageSource);
    const result = await model.generateContent([
      { inlineData: imageData },
      { text: prompt }
    ]);

    return {
      text: result.response.text(),
      metadata: {
        model: this.imageModel,
        provider: 'gemini',
        usage: result.response.usageMetadata,
      }
    };
  }

  async analyzeVideo(videoSource: string, prompt: string, options?: AnalysisOptions): Promise<AnalysisResult> {
    const model = this.client.getGenerativeModel({ model: this.videoModel });

    const videoFile = await this.uploadVideoFile(videoSource);
    const result = await model.generateContent([
      { fileData: { mimeType: videoFile.mimeType, fileUri: videoFile.uri } },
      { text: prompt }
    ]);

    return {
      text: result.response.text(),
      metadata: {
        model: this.videoModel,
        provider: 'gemini',
        usage: result.response.usageMetadata,
      }
    };
  }

  supportsVideo(): boolean {
    return true;
  }
}
```

### 4.3 Internal File Upload Implementation

```typescript
// services/FileService.ts - Internal file handling service
export class FileService {
  private uploadStrategy: FileUploadStrategy;

  constructor(config: Config, type: 'image' | 'video') {
    this.uploadStrategy = FileUploadFactory.createStrategy(config, type);
  }

  async handleImageSource(imageSource: string): Promise<string> {
    // If it's already a public URL, return as-is
    if (imageSource.startsWith('http')) {
      return imageSource;
    }

    // If it's a local file path, upload to S3 storage
    const fileBuffer = await fs.readFile(imageSource);
    const filename = path.basename(imageSource);
    const mimeType = mime.lookup(imageSource) || 'application/octet-stream';

    const uploadedFile = await this.uploadStrategy.uploadFile(
      fileBuffer,
      filename,
      mimeType
    );

    // Return provider-specific file reference
    const fileReference = await this.uploadStrategy.getFileForAnalysis(uploadedFile);
    return fileReference.type === 'file_uri'
      ? fileReference.uri
      : fileReference.url;
  }
}

// tools/analyze_image.ts
export async function analyze_image(args: {
  imageSource: string; // Can be URL or local file path
  prompt: string;
  options?: AnalysisOptions;
}): Promise<AnalysisResult> {
  const config = ConfigService.load();

  // Create provider
  const provider = ProviderFactory.createProvider(config, 'image');

  // Create file service for handling image source
  const fileService = new FileService(config, 'image');

  // Handle image source (URL vs local file)
  const processedImageSource = await fileService.handleImageSource(args.imageSource);

  return await provider.analyzeImage(processedImageSource, args.prompt, args.options);
}

// tools/analyze_video.ts
export async function analyze_video(args: {
  videoSource: string; // Can be URL or local file path
  prompt: string;
  options?: AnalysisOptions;
}): Promise<AnalysisResult> {
  const config = ConfigService.load();

  // Create provider
  const provider = ProviderFactory.createProvider(config, 'video');

  // Create file service for handling video source
  const fileService = new FileService(config, 'video');

  // Handle video source (URL vs local file)
  const processedVideoSource = await fileService.handleImageSource(args.videoSource);

  return await provider.analyzeVideo(processedVideoSource, args.prompt, args.options);
}
```

### 4.4 Error Handling

```typescript
export class VisionError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'VisionError';
  }
}

export class ConfigurationError extends VisionError {
  constructor(message: string, variable?: string) {
    super(message, 'CONFIG_ERROR', undefined, undefined);
    this.name = 'ConfigurationError';
  }
}

export class ProviderError extends VisionError {
  constructor(message: string, provider: string, originalError?: Error) {
    super(message, 'PROVIDER_ERROR', provider, originalError);
    this.name = 'ProviderError';
  }
}
```

### 4.4 Retry Logic

```typescript
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    throw new Error('Max retries exceeded');
  }

  private static isRetryableError(error: any): boolean {
    if (error.code === 'RATE_LIMIT_EXCEEDED') return true;
    if (error.code === 'NETWORK_ERROR') return true;
    if (error.status >= 500 && error.status < 600) return true;
    return false;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 5. Google Cloud Storage Setup

### 5.1 Native Google Cloud Storage (for Vertex AI)

Vertex AI now uses native Google Cloud Storage SDK with automatic credential sharing:

```bash
# Required configuration
VERTEX_CREDENTIALS=path/to/service-account.json
GCS_BUCKET_NAME=your-gcs-bucket

# Optional (auto-derived from VERTEX_CREDENTIALS)
# VERTEX_PROJECT_ID - extracted from service account JSON
# GCS_PROJECT_ID - same as VERTEX_PROJECT_ID
# GCS_CREDENTIALS - defaults to VERTEX_CREDENTIALS
# GCS_REGION - defaults to VERTEX_LOCATION
```

**Key Benefits:**
- Single credential file for both Vertex AI and GCS
- Automatic project ID extraction from credentials
- Native GCS SDK for better performance
- Direct `gs://` URI support for Vertex AI

### 5.2 Service Account Setup

1. Create a service account in Google Cloud Console
2. Grant the following roles:
   - `Vertex AI User` - for Vertex AI API access
   - `Storage Object Admin` - for GCS bucket access
3. Download the JSON key file
4. Set `VERTEX_CREDENTIALS` to the key file path

## 6. Provider Configuration Examples

### 6.1 Gemini API (AI Studio) - Development Setup

```bash
# Provider selection
IMAGE_PROVIDER=google
VIDEO_PROVIDER=google

# Gemini API configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com

# Optional: Google Cloud Storage for large files (uses inlineData for smaller files)
GCS_BUCKET_NAME=your-gemini-files
VERTEX_CREDENTIALS=path/to/service-account.json
```

### 6.2 Vertex AI - Production Setup

```bash
# Provider selection
IMAGE_PROVIDER=vertex_ai
VIDEO_PROVIDER=vertex_ai

# Vertex AI configuration (simplified)
VERTEX_CREDENTIALS=path/to/service-account.json
VERTEX_LOCATION=us-central1

# Required: Google Cloud Storage bucket
GCS_BUCKET_NAME=your-vertex-files

# All other fields auto-derived from VERTEX_CREDENTIALS:
# - VERTEX_PROJECT_ID
# - GCS_PROJECT_ID
# - GCS_CREDENTIALS
# - GCS_REGION
```

### 6.3 Mixed Setup - Development with Vertex AI for Production

```bash
# Use Gemini API for development (simpler)
IMAGE_PROVIDER=google
# Use Vertex AI for production (enterprise features)
VIDEO_PROVIDER=vertex_ai

# Both providers configured
GEMINI_API_KEY=your_gemini_api_key
VERTEX_CREDENTIALS=path/to/service-account.json
VERTEX_LOCATION=us-central1

# Google Cloud Storage for Vertex AI video processing
GCS_BUCKET_NAME=your-mixed-provider-files
# All GCS config auto-derived from VERTEX_CREDENTIALS
```

## 7. Security Considerations

### 7.1 API Key Management

- Load API keys from secure environment variables
- Validate API keys on startup
- Support for API key rotation without restart
- Log all API usage for security auditing

### 7.2 File Security

- Comprehensive file type and size validation
- Configurable file access restrictions
- Support for encrypted storage at rest
- Optional malware scanning integration

### 6.3 Network Security

- All API communications over HTTPS
- Proper SSL/TLS certificate validation
- Request retry limits
- Configurable IP whitelisting

## 8. Performance Optimization

### 8.1 Concurrent Request Management

- Limit concurrent requests per provider
- Queue file uploads to prevent rate limit exceeded
- Dynamic resource allocation based on load
- Request pooling and connection reuse


Users should check their actual rate limits in:
- **Gemini API**: [Google AI Studio](https://ai.google.dev/gemini-api/docs/rate-limits)
- **Vertex AI**: Google Cloud Console → Quotas & System Limits

The providers will return rate limit errors directly from the API with appropriate retry-after headers when limits are exceeded.

## 9. Testing Guidelines

### 9.1 Unit Tests

- Test provider implementations independently
- Test configuration loading and validation
- Test error handling and recovery scenarios
- Test utility functions and helpers

### 9.2 Integration Tests

- Test integration with Gemini API
- Test Cloud storage functionality
- Test end-to-end workflows from upload to analysis
- Test with actual file formats and sizes

### 9.3 Performance Tests

- Load testing with concurrent requests
- Stress testing system limits
- Benchmark analysis performance
- Memory usage and leak detection

## 10. Development Workflow

### 10.1 Development Setup

1. Install dependencies: `npm install`
2. Set environment variables in `.env` file
3. Run development server: `npm run dev`
4. Run tests: `npm test`
5. Run integration tests: `npm run test:integration`

### 10.2 Code Quality

- Use TypeScript for type safety
- Follow ESLint configuration
- Run Prettier for code formatting
- Use conventional commit messages
- Add unit tests for new features

### 10.3 Deployment

1. Build TypeScript: `npm run build`
2. Set production environment variables
3. Run production server: `npm start`
4. Configure monitoring and logging
5. Set up health checks

This specification provides a focused foundation for developing a Gemini-based Vision MCP server with modular architecture for future expansion.