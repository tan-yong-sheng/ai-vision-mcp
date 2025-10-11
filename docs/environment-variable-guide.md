# Environment Variable Configuration Guide

This guide provides comprehensive documentation for all environment variables used by the AI Vision MCP Server.

## Table of Contents

- [Quick Setup](#quick-setup)
- [Configuration Priority](#configuration-priority)
- [Environment Variables Reference](#environment-variables-reference)
- [Configuration Examples](#configuration-examples)
- [Troubleshooting](#troubleshooting)

## Quick Setup

### Google AI Studio Provider (Recommended for simplicity)

```bash
export IMAGE_PROVIDER="google"
export VIDEO_PROVIDER="google"
export GEMINI_API_KEY="your-gemini-api-key"
```

### Vertex AI Provider (Recommended for production)

```bash
export IMAGE_PROVIDER="vertex_ai"
export VIDEO_PROVIDER="vertex_ai"
export VERTEX_CREDENTIALS="/path/to/service-account.json"
export GCS_BUCKET_NAME="your-gcs-bucket"
```

Get your Google AI Studio API key [here](https://aistudio.google.com/app/api-keys).

For Vertex AI setup, see [Vertex AI Setup Guide](provider/vertex-ai-setup-guide.md).

## Configuration Priority

The AI Vision MCP Server uses a hierarchical configuration system where more specific settings override general ones.

### AI Parameters Priority (Highest to Lowest)

1. **LLM-assigned values** - Parameters passed directly in tool calls (e.g., `{"temperature": 0.1}`)
2. **Function-specific variables** - `TEMPERATURE_FOR_ANALYZE_IMAGE`, `MAX_TOKENS_FOR_COMPARE_IMAGES`, etc.
3. **Task-specific variables** - `TEMPERATURE_FOR_IMAGE`, `MAX_TOKENS_FOR_VIDEO`, etc.
4. **Universal variables** - `TEMPERATURE`, `MAX_TOKENS`, etc.
5. **System defaults** - Built-in fallback values

### Model Selection Priority (Highest to Lowest)

1. **Function-specific models** - `ANALYZE_IMAGE_MODEL`, `COMPARE_IMAGES_MODEL`, `ANALYZE_VIDEO_MODEL`
2. **Task-specific models** - `IMAGE_MODEL`, `VIDEO_MODEL`
3. **System defaults** - Built-in fallback models (`gemini-2.5-flash-lite`, `gemini-2.5-flash`)

## Environment Variables Reference

### Provider Selection

| Variable | Required | Description | Default |
|----------|-----------|-------------|---------|
| `IMAGE_PROVIDER` | Yes | Provider for image analysis | `google` or `vertex_ai` |
| `VIDEO_PROVIDER` | Yes | Provider for video analysis | `google` or `vertex_ai` |

### Model Selection

| Variable | Required | Description | Default |
|----------|-----------|-------------|---------|
| `IMAGE_MODEL` | No | Model for image analysis | `gemini-2.5-flash-lite` |
| `VIDEO_MODEL` | No | Model for video analysis | `gemini-2.5-flash` |

### Function-specific Model Selection

| Variable | Required | Description | Default |
|----------|-----------|-------------|---------|
| `ANALYZE_IMAGE_MODEL` | No | Model for analyze_image function | Uses `IMAGE_MODEL` |
| `COMPARE_IMAGES_MODEL` | No | Model for compare_images function | Uses `IMAGE_MODEL` |
| `DETECT_OBJECTS_IN_IMAGE_MODEL` | No | Model for detect_objects_in_image function | Uses `IMAGE_MODEL` |
| `ANALYZE_VIDEO_MODEL` | No | Model for analyze_video function | Uses `VIDEO_MODEL` |

### Google Gemini API Configuration

| Variable | Required | Description | Default |
|----------|-----------|-------------|---------|
| `GEMINI_API_KEY` | Yes if using `google` provider | Google Gemini API key | Required for Gemini |
| `GEMINI_BASE_URL` | No | Gemini API base URL | `https://generativelanguage.googleapis.com` |

### Vertex AI Configuration

| Variable | Required | Description | Default |
|----------|-----------|-------------|---------|
| `VERTEX_CREDENTIALS` | Yes if using `vertex_ai` provider | Path to GCP service account JSON | Required for Vertex AI |
| `VERTEX_PROJECT_ID` | Auto | Google Cloud project ID | Auto-derived from credentials |
| `VERTEX_LOCATION` | No | Vertex AI region | `us-central1` |
| `VERTEX_ENDPOINT` | No | Vertex AI endpoint URL | `https://aiplatform.googleapis.com` |

### Google Cloud Storage (Required for Vertex AI)

| Variable | Required | Description | Default |
|----------|-----------|-------------|---------|
| `GCS_BUCKET_NAME` | Yes if using `vertex_ai` provider | GCS bucket name for Vertex AI uploads | Required for Vertex AI |
| `GCS_CREDENTIALS` | No | Path to GCS credentials | Defaults to `VERTEX_CREDENTIALS` |
| `GCS_PROJECT_ID` | No | GCS project ID | Auto-derived from `VERTEX_CREDENTIALS` |
| `GCS_REGION` | No | GCS region | Defaults to `VERTEX_LOCATION` |

### Universal API Parameters

| Variable | Required | Description | Range | Default |
|----------|-----------|-------------|-------|---------|
| `TEMPERATURE` | No | AI response temperature | 0.0–2.0 | `0.8` |
| `TOP_P` | No | Top-p sampling parameter | 0.0–1.0 | `0.95` |
| `TOP_K` | No | Top-k sampling parameter | 1–100 | `30` |
| `MAX_TOKENS` | No | Maximum tokens for analysis | 1–8192 | `1000` |

### Task-specific API Parameters

| Variable | Required | Description | Range | Default |
|----------|-----------|-------------|-------|---------|
| `TEMPERATURE_FOR_IMAGE` | No | Image-specific temperature | 0.0–2.0 | Uses `TEMPERATURE` |
| `TOP_P_FOR_IMAGE` | No | Image-specific top-p | 0.0–1.0 | Uses `TOP_P` |
| `TOP_K_FOR_IMAGE` | No | Image-specific top-k | 1–100 | Uses `TOP_K` |
| `MAX_TOKENS_FOR_IMAGE` | No | Maximum tokens for image analysis | 1–8192 | Uses `MAX_TOKENS` |
| `TEMPERATURE_FOR_VIDEO` | No | Video-specific temperature | 0.0–2.0 | Uses `TEMPERATURE` |
| `TOP_P_FOR_VIDEO` | No | Video-specific top-p | 0.0–1.0 | Uses `TOP_P` |
| `TOP_K_FOR_VIDEO` | No | Video-specific top-k | 1–100 | Uses `TOP_K` |
| `MAX_TOKENS_FOR_VIDEO` | No | Maximum tokens for video analysis | 1–8192 | Uses `MAX_TOKENS` |

### Function-specific API Parameters

| Variable | Required | Description | Range | Default |
|----------|-----------|-------------|-------|---------|
| `TEMPERATURE_FOR_ANALYZE_IMAGE` | No | Temperature for analyze_image | 0.0–2.0 | Uses `TEMPERATURE_FOR_IMAGE` |
| `TOP_P_FOR_ANALYZE_IMAGE` | No | Top-p for analyze_image | 0.0–1.0 | Uses `TOP_P_FOR_IMAGE` |
| `TOP_K_FOR_ANALYZE_IMAGE` | No | Top-k for analyze_image | 1–100 | Uses `TOP_K_FOR_IMAGE` |
| `MAX_TOKENS_FOR_ANALYZE_IMAGE` | No | Max tokens for analyze_image | 1–8192 | Uses `MAX_TOKENS_FOR_IMAGE` |
| `TEMPERATURE_FOR_COMPARE_IMAGES` | No | Temperature for compare_images | 0.0–2.0 | Uses `TEMPERATURE_FOR_IMAGE` |
| `TOP_P_FOR_COMPARE_IMAGES` | No | Top-p for compare_images | 0.0–1.0 | Uses `TOP_P_FOR_IMAGE` |
| `TOP_K_FOR_COMPARE_IMAGES` | No | Top-k for compare_images | 1–100 | Uses `TOP_K_FOR_IMAGE` |
| `MAX_TOKENS_FOR_COMPARE_IMAGES` | No | Max tokens for compare_images | 1–8192 | Uses `MAX_TOKENS_FOR_IMAGE` |
| `TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE` | No | Temperature for object detection | 0.0–2.0 | `0.0` |
| `TOP_P_FOR_DETECT_OBJECTS_IN_IMAGE` | No | Top-p for object detection | 0.0–1.0 | `0.95` |
| `TOP_K_FOR_DETECT_OBJECTS_IN_IMAGE` | No | Top-k for object detection | 1–100 | `30` |
| `MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE` | No | Max tokens for object detection | 1–8192 | `8192` |
| `TEMPERATURE_FOR_ANALYZE_VIDEO` | No | Temperature for analyze_video | 0.0–2.0 | Uses `TEMPERATURE_FOR_VIDEO` |
| `TOP_P_FOR_ANALYZE_VIDEO` | No | Top-p for analyze_video | 0.0–1.0 | Uses `TOP_P_FOR_VIDEO` |
| `TOP_K_FOR_ANALYZE_VIDEO` | No | Top-k for analyze_video | 1–100 | Uses `TOP_K_FOR_VIDEO` |
| `MAX_TOKENS_FOR_ANALYZE_VIDEO` | No | Max tokens for analyze_video | 1–8192 | Uses `MAX_TOKENS_FOR_VIDEO` |

### File Processing Configuration

| Variable | Required | Description | Default |
|----------|-----------|-------------|---------|
| `MAX_IMAGE_SIZE` | No | Maximum image size in bytes | `20971520` (20 MB) |
| `MAX_VIDEO_SIZE` | No | Maximum video size in bytes | `2147483648` (2 GB) |
| `MAX_VIDEO_DURATION` | No | Maximum video duration (seconds) | `3600` (1 hour) |
| `MAX_IMAGES_FOR_COMPARISON` | No | Maximum images for comparison | `4` |
| `ALLOWED_IMAGE_FORMATS` | No | Comma-separated image formats | `png,jpg,jpeg,webp,gif,bmp,tiff` |
| `ALLOWED_VIDEO_FORMATS` | No | Comma-separated video formats | `mp4,mov,avi,mkv,webm,flv,wmv,3gp` |

### File Upload Configuration

| Variable | Required | Description | Default |
|----------|-----------|-------------|---------|
| `GEMINI_FILES_API_THRESHOLD` | No | Size threshold for Gemini Files API | `10485760` (10 MB) |
| `VERTEX_AI_FILES_API_THRESHOLD` | No | Size threshold for Vertex AI uploads | `0` |

### Development Configuration

| Variable | Required | Description | Default |
|----------|-----------|-------------|---------|
| `LOG_LEVEL` | No | Logging level | `info` |
| `NODE_ENV` | No | Environment mode | `development` |

## Configuration Examples

### Basic Development Setup

```bash
# Provider selection
export IMAGE_PROVIDER="google"
export VIDEO_PROVIDER="google"
export GEMINI_API_KEY="your-gemini-api-key"

# Basic configuration
export TEMPERATURE=0.7
export MAX_TOKENS=1500
export LOG_LEVEL="debug"
```

### Production Setup with Vertex AI

```bash
# Provider selection
export IMAGE_PROVIDER="vertex_ai"
export VIDEO_PROVIDER="vertex_ai"
export VERTEX_CREDENTIALS="/path/to/service-account.json"
export GCS_BUCKET_NAME="your-production-bucket"

# Production models
export IMAGE_MODEL="gemini-2.5-flash"
export VIDEO_MODEL="gemini-2.5-flash-pro"

# Production parameters
export TEMPERATURE=0.3
export MAX_TOKENS=2000
export NODE_ENV="production"
export LOG_LEVEL="info"
```

### Function-specific Optimization

```bash
# General settings
export IMAGE_PROVIDER="google"
export GEMINI_API_KEY="your-gemini-api-key"

# Function-specific optimizations
export TEMPERATURE_FOR_ANALYZE_IMAGE=0.1      # Precise image analysis
export TEMPERATURE_FOR_COMPARE_IMAGES=0.5     # More creative comparisons
export TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE=0.0  # Deterministic detection
export MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE=8192   # High token limit for JSON

# Function-specific models
export ANALYZE_IMAGE_MODEL="gemini-2.5-flash-lite"
export COMPARE_IMAGES_MODEL="gemini-2.5-flash"
export DETECT_OBJECTS_IN_IMAGE_MODEL="gemini-2.5-flash-lite"
```

### Mixed Provider Setup

```bash
# Use Gemini for images (simpler, faster)
export IMAGE_PROVIDER="google"
export GEMINI_API_KEY="your-gemini-api-key"

# Use Vertex AI for videos (enterprise features)
export VIDEO_PROVIDER="vertex_ai"
export VERTEX_CREDENTIALS="/path/to/service-account.json"
export GCS_BUCKET_NAME="your-mixed-provider-bucket"

# Task-specific parameters
export TEMPERATURE_FOR_IMAGE=0.2
export TEMPERATURE_FOR_VIDEO=0.5
export MAX_TOKENS_FOR_IMAGE=1000
export MAX_TOKENS_FOR_VIDEO=2000
```

## File Upload Strategy Configuration

### Gemini Provider Strategy

```bash
export GEMINI_FILES_API_THRESHOLD=10485760  # 10MB

# Files ≤ 10MB: Use inline base64 data
# Files > 10MB: Use Gemini Files API
```

### Vertex AI Provider Strategy

```bash
export VERTEX_AI_FILES_API_THRESHOLD=0  # All files use GCS

# All files: Upload to Google Cloud Storage and use gs:// URIs
```

## Troubleshooting

### Common Issues

1. **Missing API Key Error**
   ```
   Error: Missing required configuration for google: GEMINI_API_KEY
   ```
   **Solution**: Set `GEMINI_API_KEY` environment variable when using `google` provider

2. **Vertex AI Authentication Error**
   ```
   Error: Missing required configuration for vertex_ai: VERTEX_CREDENTIALS
   ```
   **Solution**: Set `VERTEX_CREDENTIALS` and `GCS_BUCKET_NAME` for Vertex AI

3. **File Size Limit Exceeded**
   ```
   Error: File size exceeds maximum limit
   ```
   **Solution**: Increase `MAX_IMAGE_SIZE` or `MAX_VIDEO_SIZE`, or reduce file size

4. **Unsupported File Format**
   ```
   Error: Unsupported file format
   ```
   **Solution**: Check `ALLOWED_IMAGE_FORMATS` and `ALLOWED_VIDEO_FORMATS` settings

5. **Token Limit Exceeded**
   ```
   Error: Response exceeds max tokens
   ```
   **Solution**: Increase relevant `MAX_TOKENS_*` environment variable

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
export LOG_LEVEL="debug"
```

This will provide detailed information about:
- Configuration loading
- Provider initialization
- File processing
- API requests and responses
- Error details

### Configuration Validation

The server validates configuration on startup. Common validation errors:

- Missing required provider-specific variables
- Invalid file paths in credentials
- Incompatible configuration combinations
- Out-of-range parameter values

Check the console output for detailed validation messages.

## Best Practices

1. **Use Environment-specific Files**: Create `.env.development` and `.env.production` files
2. **Secure Credentials**: Never commit API keys or credentials to version control
3. **Optimize Token Usage**: Set appropriate `MAX_TOKENS` values for each function type
4. **Monitor Usage**: Use appropriate temperature settings for your use case
5. **Test Configuration**: Validate configuration in development before production deployment

## Related Documentation

- [Installation Guide](../README.md#installation)
- [Vertex AI Setup Guide](provider/vertex-ai-setup-guide.md)
- [Technical Specification](SPEC.md)
- [Development Patterns](../CLAUDE.md)