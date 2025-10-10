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


## Quick Start

### Pre-requisites

You could choose either to use [`google` provider](https://aistudio.google.com/welcome) or [`vertex_ai` provider](https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstart). For simplicity, `google` provider is recommended.

Below are the environment variables required to set, depending to the provider you have selected.

(i) **Using Google AI Studio Provider**

```bash
export IMAGE_PROVIDER="google" # or vertex_ai
export VIDEO_PROVIDER="google" # or vertex_ai
export GEMINI_API_KEY="your-gemini-api-key"
```

Get your Google AI Studio's api key [here](https://aistudio.google.com/app/api-keys)

(ii) **Using Vertex AI Provider**

```bash
export IMAGE_PROVIDER="vertex_ai"
export VIDEO_PROVIDER="vertex_ai"
export VERTEX_CREDENTIALS="/path/to/service-account.json"
export GCS_BUCKET_NAME="your-gcs-bucket"
```

Refer to [the guideline here](docs/provider/vertex-ai-setup-guide.md) on how to set this up.


### Installation

Below are the installation guide for this MCP on different MCP clients, such as Claude Desktop, Claude Code, Cursor, Cline, etc.

<details>
<summary>Claude Desktop</summary>

Add to your Claude Desktop configuration:

(i) Using Google AI Studio Provider
```json
{
  "mcpServers": {
    "ai-vision-mcp": {
      "command": "npx",
      "args": ["ai-vision-mcp"],
      "env": {
        "IMAGE_PROVIDER": "google",
        "VIDEO_PROVIDER": "google",
        "GEMINI_API_KEY": "your-gemini-api-key"
      }
    }
  }
}
```

(ii) Using Vertex AI Provider
```json
{
  "mcpServers": {
    "ai-vision-mcp": {
      "command": "npx",
      "args": ["ai-vision-mcp"],
      "env": {
        "IMAGE_PROVIDER": "vertex_ai",
        "VIDEO_PROVIDER": "vertex_ai",
        "VERTEX_CREDENTIALS": "/path/to/service-account.json",
        "GCS_BUCKET_NAME": "ai-vision-mcp-{VERTEX_PROJECT_ID}"
      }
    }
  }
}
```

</details>

<details>
<summary>Claude Code</summary>

(i) Using Google AI Studio Provider
```bash
claude mcp add ai-vision-mcp \
  -e IMAGE_PROVIDER=google \
  -e VIDEO_PROVIDER=google \
  -e GEMINI_API_KEY=your-gemini-api-key \
  -- npx ai-vision-mcp
```

(ii) Using Vertex AI Provider
```bash
claude mcp add ai-vision-mcp \
  -e IMAGE_PROVIDER=vertex_ai \
  -e VIDEO_PROVIDER=vertex_ai \
  -e VERTEX_CREDENTIALS=/path/to/service-account.json \
  -e GCS_BUCKET_NAME=ai-vision-mcp-{VERTEX_PROJECT_ID} \
  -- npx ai-vision-mcp
```


Note: Increase the MCP tool timeout to about 5 minutes by updating `~\.claude\settings.json` as follows:

```json
{
  "env": {
    "MCP_TIMEOUT": "20000", // Give the MCP server 20s to start.
    "MCP_TOOL_TIMEOUT": "300000" // Allow each tool calls before timeout.
  }
}
```

</details>

<details>
<summary>Cursor</summary>

Go to: Settings -> Cursor Settings -> MCP -> Add new global MCP server

Pasting the following configuration into your Cursor ~/.cursor/mcp.json file is the recommended approach. You may also install in a specific project by creating .cursor/mcp.json in your project folder. See [Cursor MCP docs](https://docs.cursor.com/context/model-context-protocol) for more info.

(i) Using Google AI Studio Provider
```json
{
  "mcpServers": {
    "ai-vision-mcp": {
      "command": "npx",
      "args": ["ai-vision-mcp"],
      "env": {
        "IMAGE_PROVIDER": "google",
        "VIDEO_PROVIDER": "google",
        "GEMINI_API_KEY": "your-gemini-api-key"
      }
    }
  }
}
```

(ii) Using Vertex AI Provider
```json
{
  "mcpServers": {
    "ai-vision-mcp": {
      "command": "npx",
      "args": ["ai-vision-mcp"],
      "env": {
        "IMAGE_PROVIDER": "vertex_ai",
        "VIDEO_PROVIDER": "vertex_ai",
        "VERTEX_CREDENTIALS": "/path/to/service-account.json",
        "GCS_BUCKET_NAME": "ai-vision-mcp-{VERTEX_PROJECT_ID}"
      }
    }
  }
}
```
</details>


<details>
<summary>Cline</summary>

Cline uses a JSON configuration file to manage MCP servers. To integrate the provided MCP server configuration:

1. Open Cline and click on the MCP Servers icon in the top navigation bar.
2. Select the Installed tab, then click Advanced MCP Settings.
3. In the cline_mcp_settings.json file, add the following configuration:

(i) Using Google AI Studio Provider
```json
{
  "mcpServers": {
    "timeout": 300, 
    "type": "stdio",
    "ai-vision-mcp": {
      "command": "npx",
      "args": ["ai-vision-mcp"],
      "env": {
        "IMAGE_PROVIDER": "google",
        "VIDEO_PROVIDER": "google",
        "GEMINI_API_KEY": "your-gemini-api-key"
      }
    }
  }
}
```

(ii) Using Vertex AI Provider
```json
{
  "mcpServers": {
    "ai-vision-mcp": {
      "timeout": 300,
      "type": "stdio",
      "command": "npx",
      "args": ["ai-vision-mcp"],
      "env": {
        "IMAGE_PROVIDER": "vertex_ai",
        "VIDEO_PROVIDER": "vertex_ai",
        "VERTEX_CREDENTIALS": "/path/to/service-account.json",
        "GCS_BUCKET_NAME": "ai-vision-mcp-{VERTEX_PROJECT_ID}"
      }
    }
  }
}
```
</details>


<details>

<summary>Other MCP clients</summary>

The server uses stdio transport and follows the standard MCP protocol. It can be integrated with any MCP-compatible client by running:

```bash
npx ai-vision-mcp
```
</details>


## MCP Tools

The server provides four main MCP tools:

### 1) `analyze_image`

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


### 2) `compare_images`

Compares multiple images using AI and returns a detailed comparison analysis.

**Parameters:**
- `imageSources` (array): Array of image sources (URLs, base64 data, or file paths) - minimum 2, maximum 4 images
- `prompt` (string): Question or instruction for comparing the images
- `options` (object, optional): Analysis options including temperature and max tokens

**Examples:**

1. **Compare images from URLs:**
```json
{
  "imageSources": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "prompt": "Compare these two images and tell me the differences"
}
```

2. **Compare mixed sources:**
```json
{
  "imageSources": [
    "https://example.com/image1.jpg",
    "C:\\\\Users\\\\username\\\\Downloads\\\\image2.jpg",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgAB..."
  ],
  "prompt": "Which image has the best lighting quality?"
}
```


### 3) `analyze_video`

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


### 4) `detect_objects_in_image`

Detects objects in an image using AI vision models and generates annotated images with bounding boxes. Returns detected objects with coordinates and either saves the annotated image to a file, temporary directory, or returns it inline (base64 encoded) depending on size.

**Parameters:**
- `imageSource` (string): URL, base64 data, or file path to the image
- `prompt` (string): Custom detection prompt describing what to detect or recognize in the image
- `outputFilePath` (string, optional): Explicit output path for the annotated image

**Configuration:**
This function uses optimized default parameters for object detection and does not accept runtime `options` parameter. To customize the AI parameters (temperature, topP, topK, maxTokens), use environment variables:

```bash
# Recommended settings for object detection (these are now the defaults)
export TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE=0.0     # Deterministic responses
export TOP_P_FOR_DETECT_OBJECTS_IN_IMAGE=0.95          # Nucleus sampling
export TOP_K_FOR_DETECT_OBJECTS_IN_IMAGE=30            # Vocabulary selection
export MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE=8192     # High token limit for JSON
```

**File Handling Logic:**
1. **Explicit outputFilePath provided** → Saves to the exact path specified
2. **Large files (≥2MB)** → Automatically saves to temporary directory
3. **Small files (<2MB)** → Returns inline as base64 encoded data

**Response Types:**
- Returns `file` object when explicit outputFilePath is provided
- Returns `tempFile` object when large files are auto-saved to temp
- Returns `image` object with base64 data for small files
- Always includes `detections` array with detected objects and coordinates
- Includes `summary` with percentage-based coordinates for browser automation

**Examples:**

1. **Basic object detection:**
```json
{
  "imageSource": "https://example.com/image.jpg",
  "prompt": "Detect all objects in this image"
}
```

2. **Save annotated image to specific path:**
```json
{
  "imageSource": "C:\\Users\\username\\Downloads\\image.jpg",
  "outputFilePath": "C:\\Users\\username\\Documents\\annotated_image.png"
}
```

3. **Custom detection prompt:**
```json
{
  "imageSource": "data:image/jpeg;base64,/9j/4AAQSkZJRgAB...",
  "prompt": "Detect and label all electronic devices in this image"
}
```

### Analysis Options

Most analysis functions (`analyze_image`, `compare_images`, `analyze_video`) support the following optional parameters in the `options` object:

**Note:** `detect_objects_in_image` uses optimized defaults and is configured via environment variables only.

- **`temperature`** (number, 0.0–2.0): Controls response creativity and randomness
  - `0.0` = Deterministic, consistent responses (recommended for object detection)
  - `0.1-0.3` = Precise, focused responses (good for technical analysis)
  - `0.7-1.0` = Balanced creativity and accuracy (default: 0.8)
  - `1.5-2.0` = Highly creative, varied responses (experimental use)

- **`topP`** (number, 0.0–1.0): Controls response diversity via nucleus sampling
  - `0.1-0.3` = Very focused, predictable responses
  - `0.5-0.7` = Moderately focused responses
  - `0.9-1.0` = More diverse, creative responses (default: 0.95)
  - Lower values = more focused; Higher values = more diverse

- **`topK`** (number, 1–100): Limits vocabulary to top K most likely tokens
  - `1-5` = Very limited vocabulary, highly focused
  - `10-30` = Balanced vocabulary selection (default: 30)
  - `50-100` = Broader vocabulary, more creative
  - Lower values = more focused; Higher values = more creative

- **`maxTokens`** (number, 1–8192): Maximum response length in tokens
  - `100-500` = Short, concise responses
  - `1000-2000` = Standard detailed responses (default: 1000)
  - `3000-8192` = Long, comprehensive responses (recommended for object detection: 3000+)
  - 1 token ≈ 0.75 words in English

**Example Usage:**
```json
{
  "imageSource": "path/to/image.jpg",
  "prompt": "Analyze this image",
  "options": {
    "temperature": 0.1,
    "topP": 0.9,
    "topK": 30,
    "maxTokens": 2000
  }
}
```

**Recommended Settings by Use Case:**
- **Object Detection**: `temperature: 0.0, topP: 1.0, topK: 1, maxTokens: 3000+`
- **Technical Analysis**: `temperature: 0.1-0.3, topP: 0.7-0.9, topK: 20-40`
- **Creative Description**: `temperature: 0.7-1.0, topP: 0.95, topK: 50+`
- **Precise Comparison**: `temperature: 0.2-0.5, topP: 0.8-0.9, topK: 30-50`

### Environment Variables
| Variable | Required | Description | Default |
|-----------|-----------|-------------|---------|
| **Provider Selection** ||||
| `IMAGE_PROVIDER` | Yes | Provider for image analysis | `google`,`vertex_ai` |
| `VIDEO_PROVIDER` | Yes | Provider for video analysis | `google`,`vertex_ai` |
| **Model Selection** ||||
| `IMAGE_MODEL` | No | Model for image analysis | `gemini-2.5-flash-lite` |
| `VIDEO_MODEL` | No | Model for video analysis | `gemini-2.5-flash` |
| **Function-specific Model Selection** ||||
| `ANALYZE_IMAGE_MODEL` | No | Model for analyze_image function | Uses `IMAGE_MODEL` |
| `COMPARE_IMAGES_MODEL` | No | Model for compare_images function | Uses `IMAGE_MODEL` |
| `DETECT_OBJECTS_IN_IMAGE_MODEL` | No | Model for detect_objects_in_image function | Uses `IMAGE_MODEL` |
| `ANALYZE_VIDEO_MODEL` | No | Model for analyze_video function | Uses `VIDEO_MODEL` |
| **Google Gemini API** ||||
| `GEMINI_API_KEY` | Yes if `IMAGE_PROVIDER` or `VIDEO_PROVIDER` = `google` | Google Gemini API key | Required for Gemini |
| `GEMINI_BASE_URL` | No | Gemini API base URL | `https://generativelanguage.googleapis.com` |
| **Vertex AI** ||||
| `VERTEX_CREDENTIALS` | Yes if `IMAGE_PROVIDER` or `VIDEO_PROVIDER` = `vertex_ai` | Path to GCP service account JSON | Required for Vertex AI |
| `VERTEX_PROJECT_ID` | Auto | Google Cloud project ID | Auto-derived from credentials |
| `VERTEX_LOCATION` | No | Vertex AI region | `us-central1` |
| `VERTEX_ENDPOINT` | No | Vertex AI endpoint URL | `https://aiplatform.googleapis.com` |
| **Google Cloud Storage (Vertex AI)** ||||
| `GCS_BUCKET_NAME` | Yes if `IMAGE_PROVIDER` or `VIDEO_PROVIDER` = `vertex_ai` | GCS bucket name for Vertex AI uploads | Required for Vertex AI |
| `GCS_CREDENTIALS` | No | Path to GCS credentials | Defaults to `VERTEX_CREDENTIALS` |
| `GCS_PROJECT_ID` | No | GCS project ID | Auto-derived from `VERTEX_CREDENTIALS` |
| `GCS_REGION` | No | GCS region | Defaults to `VERTEX_LOCATION` |
| **API Configuration** ||||
| `TEMPERATURE` | No | AI response temperature (0.0–2.0) | `0.8` |
| `TOP_P` | No | Top-p sampling parameter (0.0–1.0) | `0.95` |
| `TOP_K` | No | Top-k sampling parameter (1–100) | `30` |
| `MAX_TOKENS` | No | Maximum tokens for analysis (1–8192) | `1000` |
| **Task-type level Configuration** |||||
| `TEMPERATURE_FOR_IMAGE` | No | Image-specific temperature (0.0–2.0) | Uses `TEMPERATURE` |
| `TOP_P_FOR_IMAGE` | No | Image-specific top-p (0.0–1.0) | Uses `TOP_P` |
| `TOP_K_FOR_IMAGE` | No | Image-specific top-k (1–100) | Uses `TOP_K` |
| `TEMPERATURE_FOR_VIDEO` | No | Video-specific temperature (0.0–2.0) | Uses `TEMPERATURE` |
| `TOP_P_FOR_VIDEO` | No | Video-specific top-p (0.0–1.0) | Uses `TOP_P` |
| `TOP_K_FOR_VIDEO` | No | Video-specific top-k (1–100) | Uses `TOP_K` |
| `MAX_TOKENS_FOR_IMAGE` | No | Maximum tokens for image analysis | Uses `MAX_TOKENS` |
| `MAX_TOKENS_FOR_VIDEO` | No | Maximum tokens for video analysis | Uses `MAX_TOKENS` |
| **Function-specific Configuration** |||||
| `TEMPERATURE_FOR_ANALYZE_IMAGE` | No | Temperature for analyze_image function (0.0–2.0) | Uses `TEMPERATURE_FOR_IMAGE` |
| `TOP_P_FOR_ANALYZE_IMAGE` | No | Top-p for analyze_image function (0.0–1.0) | Uses `TOP_P_FOR_IMAGE` |
| `TOP_K_FOR_ANALYZE_IMAGE` | No | Top-k for analyze_image function (1–100) | Uses `TOP_K_FOR_IMAGE` |
| `MAX_TOKENS_FOR_ANALYZE_IMAGE` | No | Max tokens for analyze_image function | Uses `MAX_TOKENS_FOR_IMAGE` |
| `TEMPERATURE_FOR_COMPARE_IMAGES` | No | Temperature for compare_images function (0.0–2.0) | Uses `TEMPERATURE_FOR_IMAGE` |
| `TOP_P_FOR_COMPARE_IMAGES` | No | Top-p for compare_images function (0.0–1.0) | Uses `TOP_P_FOR_IMAGE` |
| `TOP_K_FOR_COMPARE_IMAGES` | No | Top-k for compare_images function (1–100) | Uses `TOP_K_FOR_IMAGE` |
| `MAX_TOKENS_FOR_COMPARE_IMAGES` | No | Max tokens for compare_images function | Uses `MAX_TOKENS_FOR_IMAGE` |
| `TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE` | No | Temperature for detect_objects_in_image function (0.0–2.0) | `0.0` |
| `TOP_P_FOR_DETECT_OBJECTS_IN_IMAGE` | No | Top-p for detect_objects_in_image function (0.0–1.0) | `0.95` |
| `TOP_K_FOR_DETECT_OBJECTS_IN_IMAGE` | No | Top-k for detect_objects_in_image function (1–100) | `30` |
| `MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE` | No | Max tokens for detect_objects_in_image function | `8192` |
| `TEMPERATURE_FOR_ANALYZE_VIDEO` | No | Temperature for analyze_video function (0.0–2.0) | Uses `TEMPERATURE_FOR_VIDEO` |
| `TOP_P_FOR_ANALYZE_VIDEO` | No | Top-p for analyze_video function (0.0–1.0) | Uses `TOP_P_FOR_VIDEO` |
| `TOP_K_FOR_ANALYZE_VIDEO` | No | Top-k for analyze_video function (1–100) | Uses `TOP_K_FOR_VIDEO` |
| `MAX_TOKENS_FOR_ANALYZE_VIDEO` | No | Max tokens for analyze_video function | Uses `MAX_TOKENS_FOR_VIDEO` |
| **File Processing** ||||
| `MAX_IMAGE_SIZE` | No | Maximum image size in bytes | `20971520` (20 MB) |
| `MAX_VIDEO_SIZE` | No | Maximum video size in bytes | `2147483648` (2 GB) |
| `MAX_VIDEO_DURATION` | No | Maximum video duration (seconds) | `3600` (1 hour) |
| `MAX_IMAGES_FOR_COMPARISON` | No | Maximum number of images for comparison, used by compare_images() mcp function | `4` |
| `ALLOWED_IMAGE_FORMATS` | No | Comma-separated image formats | `png,jpg,jpeg,webp,gif,bmp,tiff` |
| `ALLOWED_VIDEO_FORMATS` | No | Comma-separated video formats | `mp4,mov,avi,mkv,webm,flv,wmv,3gp` |
| **Development** ||||
| `LOG_LEVEL` | No | Logging level | `info` |
| `NODE_ENV` | No | Environment mode | `development` |
| `GEMINI_FILES_API_THRESHOLD` | No | Size threshold for Gemini Files API (bytes) | `10485760` (10 MB) |
| `VERTEX_AI_FILES_API_THRESHOLD` | No | Size threshold for Vertex AI uploads (bytes) | `0` |


<details>
<summary>More on Environment Variable Logic (Optional to learn) </summary>

The MCP server uses a four-level configuration priority system for AI parameters (highest to lowest):

1. **LLM-assigned values** - Parameters passed directly in tool calls (e.g., `{"temperature": 0.1}`)
2. **Function-specific variables** - `TEMPERATURE_FOR_ANALYZE_IMAGE`, `MAX_TOKENS_FOR_COMPARE_IMAGES`, etc.
3. **Task-specific variables** - `TEMPERATURE_FOR_IMAGE`, `MAX_TOKENS_FOR_VIDEO`, etc.
4. **Universal variables** - `TEMPERATURE`, `MAX_TOKENS`, etc.
5. **System defaults** - Built-in fallback values

For model selection, the server uses a three-level hierarchy (highest to lowest):

1. **Function-specific models** - `ANALYZE_IMAGE_MODEL`, `COMPARE_IMAGES_MODEL`, `ANALYZE_VIDEO_MODEL`
2. **Task-specific models** - `IMAGE_MODEL`, `VIDEO_MODEL`
3. **System defaults** - Built-in fallback models (`gemini-2.5-flash-lite`, `gemini-2.5-flash`)

**Example Usage:**
```bash
# AI Parameters configuration
TEMPERATURE=0.3
MAX_TOKENS=600

# Task-specific overrides
TEMPERATURE_FOR_IMAGE=0.1  # More precise for image analysis
MAX_TOKENS_FOR_VIDEO=1200   # Longer responses for video content

# Function-specific overrides
TEMPERATURE_FOR_ANALYZE_IMAGE=0.05     # Very precise for single image analysis
TEMPERATURE_FOR_COMPARE_IMAGES=0.2     # More creative for comparisons
MAX_TOKENS_FOR_COMPARE_IMAGES=1500      # Longer responses for image comparisons
TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE=0.0   # Deterministic for object detection
MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE=8192   # Higher token limit for structured output
TEMPERATURE_FOR_ANALYZE_VIDEO=0.1      # Precise video analysis

# Model selection configuration
ANALYZE_IMAGE_MODEL="gemini-2.5-flash-lite"          # Fast, cost-effective for single image analysis
COMPARE_IMAGES_MODEL="gemini-2.5-flash-lite"
DETECT_OBJECTS_IN_IMAGE_MODEL="gemini-2.5-flash-lite"  # Structured output capable model
ANALYZE_VIDEO_MODEL="gemini-2.5-flash-pro"           # Most capable for video analysis

# Task-specific models (existing pattern still works)
IMAGE_MODEL="gemini-2.5-flash"
VIDEO_MODEL="gemini-2.5-flash-pro"

# Resolution order for analyze_image:
# 1. ANALYZE_IMAGE_MODEL
# 2. IMAGE_MODEL
# 3. System default ("gemini-2.5-flash-lite")

# Resolution order for detect_objects_in_image:
# 1. DETECT_OBJECTS_IN_IMAGE_MODEL
# 2. IMAGE_MODEL
# 3. System default ("gemini-2.5-flash-lite")

# LLM can still override at runtime via tool parameters
```

This allows you to set sensible defaults while maintaining granular control per task type and per function, with a clean and maintainable 3-level hierarchy.
</details>

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

# Start development server
npm run dev
```

### Scripts

- `npm run build` - Build the TypeScript project
- `npm run dev` - Start development server with watch mode
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