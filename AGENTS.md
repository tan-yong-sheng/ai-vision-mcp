# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. 
Use context7 MCP, web search, or web fetch for additional information when fixing bugs or implementing new features.

## Development Commands

### Building and Testing
- `npm run build` - Build TypeScript project to `dist/` directory
- `npm run dev` - Start development server with watch mode
- `npm start` - Start the built MCP server

### Code Quality
- `npm run lint` - Run ESLint on all TypeScript files
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier

### Publishing
- `npm run prepublishOnly` - Run tests and lint before publish
- `npm run preversion` - Run lint before version bump
- `npm run version` - Format code and add to git before version

## Architecture Overview

This is a Model Context Protocol (MCP) server that provides AI-powered image and video analysis using Google Gemini and Vertex AI models.

### Core Components

**Server Architecture** (`src/server.ts`):
- Main MCP server entry point using `@modelcontextprotocol/sdk`
- Lazy-loaded services initialized on first request
- Four primary tools: `analyze_image`, `compare_images`, `detect_object_in_image`, and `analyze_video`
- Comprehensive error handling with custom error types

**Provider Factory** (`src/providers/factory/ProviderFactory.ts`):
- Factory pattern for creating AI provider instances
- Supports two providers: `google` (Gemini API) and `vertex_ai` (Vertex AI)
- Automatic provider detection from model names
- Configuration validation before provider creation

**Configuration Service** (`src/services/ConfigService.ts`):
- Singleton pattern for configuration management
- Environment variable validation with Zod schemas
- Provider-specific configuration methods
- File processing limits and format validation

**Configuration Validation** (`src/types/Config.ts` and `src/utils/validation.ts`):
- `Config.ts` defines TypeScript interfaces for all configuration options
- `validation.ts` provides Zod schemas that validate environment variables against these interfaces
- These files must stay synchronized - any new config field in Config.ts requires corresponding validation rules in validation.ts

**Key Services**:
- `FileService` - Handles file uploads, validation, and processing
- `ConfigService` - Manages environment variables and settings
- Vision providers in `src/providers/` - AI model implementations
- Storage strategies in `src/storage/` and `src/file-upload/` - File handling

### Provider Implementation

**Gemini Provider** (`src/providers/gemini/`):
- Direct Google Gemini API integration
- Files API for larger uploads (>10MB)
- Base64 encoding for smaller files

**Vertex AI Provider** (`src/providers/vertexai/`):
- Google Cloud Vertex AI integration
- Requires GCS bucket for video processing
- Service account authentication

### File Processing Flow

1. **Input Validation**: File size, format, and duration checks
2. **Upload Strategy**: Direct upload vs cloud storage based on size
3. **AI Analysis**: Provider-specific API calls
4. **Response Processing**: Structured JSON responses with error handling

### Configuration Requirements

**Environment Variables**:
- `IMAGE_PROVIDER`/`VIDEO_PROVIDER`: Set to `google` or `vertex_ai`
- **Gemini**: `GEMINI_API_KEY`
- **Vertex AI**: `VERTEX_PROJECT_ID`, `VERTEX_CREDENTIALS`, `GCS_BUCKET_NAME`

**File Limits**:
- Images: 20MB max, formats: PNG, JPG, JPEG, WebP, GIF, BMP, TIFF
- Videos: 2GB max, 1 hour duration, formats: MP4, MOV, AVI, MKV, WebM, FLV, WMV, 3GP

## Development Notes

### TypeScript Configuration
- ES2022 target with ESNext modules
- Strict type checking enabled
- Path mapping with `@/*` pointing to `src/*`
- Declaration maps and source maps enabled

### Error Handling
- Custom error types in `src/types/Errors.ts`
- Provider-specific error context
- Graceful degradation with informative error messages
- Retry logic for network failures

### Testing Strategy
- Unit tests for individual components
- Integration tests for provider functionality
- Configuration validation tests
- File processing validation tests

### File Organization
- Type definitions in `src/types/`
- Utility functions in `src/utils/`
- Provider implementations in `src/providers/`
- Service layer in `src/services/`
- MCP tool implementations in `src/tools/`

## Common Development Patterns

1. **Lazy Loading**: Services are initialized on first request to improve startup time
2. **Factory Pattern**: Providers created through factory with validation
3. **Singleton Pattern**: Configuration service uses singleton for consistency
4. **Strategy Pattern**: Different file upload strategies based on provider and size
5. **Zod Validation**: All input validated with Zod schemas for type safety