# AI Vision MCP Server

A powerful Model Context Protocol (MCP) server that provides AI-powered image and video analysis using Google Gemini and Vertex AI models.

## Features

- **Dual Provider Support**: Choose between Google Gemini API and Vertex AI
- **Multimodal Analysis**: Support for both image and video content analysis
- **Flexible File Handling**: Upload via multiple methods (URLs, local files, base64)
- **Storage Integration**: Built-in Google Cloud Storage support
- **Comprehensive Validation**: Zod-based data validation throughout
- **Error Handling**: Robust error handling with retry logic and circuit breakers
- **TypeScript**: Full TypeScript support with strict type checking

## Installation

```bash
npm install ai-vision-mcp
```

## Quick Start

### Using Google Gemini API

1. Set your environment variables:

```bash
export IMAGE_PROVIDER="google" # or vertex_ai
export VIDEO_PROVIDER="google" # or vertex_ai
export GEMINI_API_KEY="your-gemini-api-key"
```

2. Start the MCP server:

```bash
npx ai-vision-mcp
```

### Using Vertex AI

1. Set your environment variables:

```bash
export IMAGE_PROVIDER="vertex_ai"
export VIDEO_PROVIDER="vertex_ai"
export VERTEX_CREDENTIALS="/path/to/service-account.json"
export GCS_BUCKET_NAME="your-gcs-bucket"
```

Refer to [the guideline here](docs/provider/vertex-ai-setup-guide.md)

2. Start the MCP server:

```bash
npx ai-vision-mcp
```

## MCP Tools

The server provides two main MCP tools:

### `analyze_image`

Analyzes an image using AI and returns a detailed description.

**Parameters:**
- `imageSource` (string): URL, base64 data, or file path to the image
- `prompt` (string): Question or instruction for the AI
- `options` (object, optional): Analysis options including temperature and max tokens

**Examples:**

1. **Analyze image from URL:**
```json
{
  "imageSource": "https://plus.unsplash.com/premium_photo-1710965560034-778eedc929ff",
  "prompt": "What is this image about? Describe what you see in detail."
}
```

2. **Analyze local image file:**
```json
{
  "imageSource": "C:\\Users\\username\\Downloads\\image.jpg",
  "prompt": "What is this image about? Describe what you see in detail."
}
```


### `analyze_video`

Analyzes a video using AI and returns a detailed description.

**Parameters:**
- `videoSource` (string): YouTube URL, GCS URI, or local file path to the video
- `prompt` (string): Question or instruction for the AI
- `options` (object, optional): Analysis options including temperature and max tokens

**Supported video sources:**
- YouTube URLs (e.g., `https://www.youtube.com/watch?v=...`)
- Local file paths (e.g., `C:\Users\username\Downloads\video.mp4`)

**Examples:**

1. **Analyze video from YouTube URL:**
```json
{
  "videoSource": "https://www.youtube.com/watch?v=9hE5-98ZeCg",
  "prompt": "What is this video about? Describe what you see in detail."
}
```

2. **Analyze local video file:**
```json
{
  "videoSource": "C:\\Users\\username\\Downloads\\video.mp4",
  "prompt": "What is this video about? Describe what you see in detail."
}
```


**Note:** Only YouTube URLs are supported for public video URLs. Other public video URLs are not currently supported.

## Configuration

### Environment Variables
| Variable | Required | Description | Default |
|-----------|-----------|-------------|---------|
| **Provider Selection** ||||
| `IMAGE_PROVIDER` | Yes | Provider for image analysis | `google`,`vertex_ai` |
| `VIDEO_PROVIDER` | Yes | Provider for video analysis | `google`,`vertex_ai` |
| **Model Selection** ||||
| `IMAGE_MODEL` | No | Model for image analysis | `gemini-2.5-flash-lite` |
| `VIDEO_MODEL` | No | Model for video analysis | `gemini-2.5-flash` |
| `FALLBACK_IMAGE_MODEL` | No | Fallback Model for image analysis | `gemini-2.5-flash-lite` |
| `FALLBACK_VIDEO_MODEL` | No | Fallback Model for video analysis | `gemini-2.5-flash` |
| **Google Gemini API** ||||
| `GEMINI_API_KEY` | Yes if `IMAGE_PROVIDER` or `VIDEO_PROVIDER` = `google` | Google Gemini API key | Required for Gemini |
| `GEMINI_BASE_URL` | No | Gemini API base URL | `https://generativelanguage.googleapis.com` |
| **Vertex AI** ||||
| `VERTEX_CREDENTIALS` | Yes if `IMAGE_PROVIDER` or `VIDEO_PROVIDER` = `vertex_ai` | Path to GCP service account JSON | Required for Vertex AI |
| `VERTEX_PROJECT_ID` | Auto | Google Cloud project ID | Auto-derived from credentials |
| `VERTEX_LOCATION` | No | Vertex AI region | `us-central1` |
| `VERTEX_ENDPOINT` | No | Vertex AI endpoint URL | `https://aiplatform.googleapis.com` |
| **Google Cloud Storage (Vertex AI)** ||||
| `GCS_BUCKET_NAME` | If `IMAGE_PROVIDER` or `VIDEO_PROVIDER` = `vertex_ai` | GCS bucket name for Vertex AI uploads | Required for Vertex AI |
| `GCS_CREDENTIALS` | No | Path to GCS credentials | Defaults to `VERTEX_CREDENTIALS` |
| `GCS_PROJECT_ID` | No | GCS project ID | Auto-derived from `VERTEX_CREDENTIALS` |
| `GCS_REGION` | No | GCS region | Defaults to `VERTEX_LOCATION` |
| **API Configuration** ||||
| `TEMPERATURE` | No | AI response temperature (0.0–2.0) | `0.8` |
| `TOP_P` | No | Top-p sampling parameter (0.0–1.0) | `0.6` |
| `MAX_TOKENS_FOR_IMAGE` | No | Maximum tokens for image analysis | `500` |
| `MAX_TOKENS_FOR_VIDEO` | No | Maximum tokens for video analysis | `2000` |
| **File Processing** ||||
| `MAX_IMAGE_SIZE` | No | Maximum image size in bytes | `20971520` (20 MB) |
| `MAX_VIDEO_SIZE` | No | Maximum video size in bytes | `2147483648` (2 GB) |
| `MAX_VIDEO_DURATION` | No | Maximum video duration (seconds) | `3600` (1 hour) |
| `ALLOWED_IMAGE_FORMATS` | No | Comma-separated image formats | `png,jpg,jpeg,webp,gif,bmp,tiff` |
| `ALLOWED_VIDEO_FORMATS` | No | Comma-separated video formats | `mp4,mov,avi,mkv,webm,flv,wmv,3gp` |
| **Development** ||||
| `LOG_LEVEL` | No | Logging level | `info` |
| `NODE_ENV` | No | Environment mode | `development` |
| `GEMINI_FILES_API_THRESHOLD` | No | Size threshold for Gemini Files API (bytes) | `10485760` (10 MB) |
| `VERTEX_AI_FILES_API_THRESHOLD` | No | Size threshold for Vertex AI uploads (bytes) | `0` |

### Supported Formats

**Images:** PNG, JPG, JPEG, WebP, GIF, BMP, TIFF, HEIC, HEIF
**Videos:** MP4, MOV, AVI, MKV, WebM, FLV, WMV, 3GP, M4V

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/tan-yong-sheng/ai-vision-mcp.git
cd ai-vision-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

### Scripts

- `npm run build` - Build the TypeScript project
- `npm run dev` - Start development server with watch mode
- `npm test` - Run the test suite
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm start` - Start the built server

## Architecture

The project follows a modular architecture:

```
src/
├── providers/          # AI provider implementations
│   ├── gemini/        # Google Gemini provider
│   ├── vertexai/      # Vertex AI provider
│   └── factory/       # Provider factory
├── services/          # Core services
│   ├── ConfigService.ts
│   └── FileService.ts
├── storage/           # Storage implementations
├── file-upload/       # File upload strategies
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── server.ts         # Main MCP server
```

## Error Handling

The server includes comprehensive error handling:

- **Validation Errors**: Input validation using Zod schemas
- **Network Errors**: Automatic retries with exponential backoff
- **Authentication Errors**: Clear error messages for API key issues
- **File Errors**: Handling for file size limits and format restrictions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Google for the Gemini and Vertex AI APIs
- The Model Context Protocol team for the MCP framework
- All contributors and users of this project