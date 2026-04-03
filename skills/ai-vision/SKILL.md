---
name: ai-vision
description: >
  Analyze images and videos with AI vision models. Detect objects with bounding boxes,
  compare multiple images, extract design tokens and visual hierarchy, and analyze video
  content using Google Gemini or Vertex AI. Supports CLI and MCP modes.
license: MIT
metadata:
  version: 1.0.0
  author: Tan Yong Sheng
  tags:
    - image-analysis
    - video-analysis
    - gemini
    - vertex-ai
    - mcp
    - cli
    - object-detection
    - design-analysis
  keywords:
    - vision
    - ai
    - image
    - video
    - analysis
    - detection
    - comparison
    - design-tokens
    - visual-hierarchy
---

# AI Vision MCP

AI-powered image and video analysis CLI using Google Gemini and Vertex AI models. Analyze images, compare multiple images, detect objects, and analyze videos with advanced AI capabilities.

## Quick Start

### Installation

```bash
npm install -g ai-vision-mcp
```

Or use directly with npx:

```bash
npx ai-vision-mcp <command> [options]
```

### Setup

Set up your provider credentials:

**Google AI Studio (Recommended)**
```bash
export IMAGE_PROVIDER="google"
export VIDEO_PROVIDER="google"
export GEMINI_API_KEY="your-gemini-api-key"
```

Get your API key at [aistudio.google.com/app/api-keys](https://aistudio.google.com/app/api-keys)

**Vertex AI**
```bash
export IMAGE_PROVIDER="vertex_ai"
export VIDEO_PROVIDER="vertex_ai"
export VERTEX_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
export VERTEX_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
export VERTEX_PROJECT_ID="your-gcp-project-id"
export GCS_BUCKET_NAME="your-gcs-bucket"
```

## Commands

### analyze-image

Analyze an image with AI vision models. Supports multiple analysis modes for different use cases.

```bash
ai-vision analyze-image <source> --prompt <text> [--mode <mode>] [options]
```

**Modes:**
- `general` (default) - General image analysis
- `palette` - Extract design tokens (colors, spacing, typography)
- `hierarchy` - Analyze visual hierarchy and eye flow
- `components` - Catalog UI components and design system maturity

**Examples:**

```bash
# General analysis
ai-vision analyze-image https://example.com/image.jpg --prompt "describe the scene"

# Design token extraction
ai-vision analyze-image screenshot.png --prompt "extract design tokens" --mode palette

# Visual hierarchy analysis
ai-vision analyze-image ui-mockup.png --prompt "analyze layout" --mode hierarchy

# Component inventory
ai-vision analyze-image design-system.png --prompt "list components" --mode components

# Output as JSON
ai-vision analyze-image image.jpg --prompt "analyze" --json
```

### compare-images

Compare 2-4 images side-by-side to identify differences, similarities, or changes. Supports URLs, local files, base64 data, GCS URIs, and file references.

```bash
ai-vision compare-images <source1> <source2> [source3] [source4] --prompt <text> [options]
```

**Options:**

```
--temperature <num>          Temperature 0-2 (default: 0.7)
--top-p <num>                Top P 0-1
--top-k <num>                Top K 1-100
--max-tokens <num>           Max output tokens
--json                       Output raw JSON instead of formatted text
```

**Examples:**

```bash
# Compare two versions
ai-vision compare-images before.jpg after.jpg --prompt "what changed?"

# Compare multiple designs
ai-vision compare-images v1.png v2.png v3.png --prompt "which is best?"

# Visual regression testing
ai-vision compare-images baseline.png current.png --prompt "find visual bugs" --json

# Compare images from different sources
ai-vision compare-images https://example.com/v1.png ./local-v2.png gs://bucket/v3.png --prompt "compare all versions"
```

### detect-objects

Detect and identify objects in an image with bounding boxes and confidence scores.

```bash
ai-vision detect-objects <source> --prompt <text> [--output <path>] [options]
```

**Options:**

```
--output <path>              Save annotated image to explicit path (optional)
--viewport-width <number>    Logical viewport width for web screenshots
--viewport-height <number>   Logical viewport height for web screenshots
--temperature <num>          Temperature 0-2 (default: 0.7)
--top-p <num>                Top P 0-1
--top-k <num>                Top K 1-100
--max-tokens <num>           Max output tokens
--json                       Output raw JSON instead of formatted text
```

**Examples:**

```bash
# Detect objects with bounding boxes
ai-vision detect-objects photo.jpg --prompt "find all cars"

# Save annotated image with bounding boxes drawn
ai-vision detect-objects scene.jpg --prompt "detect people" --output annotated.jpg

# Detect web elements with viewport dimensions
ai-vision detect-objects screenshot.png --prompt "find buttons" --viewport-width 1920 --viewport-height 1080

# Get JSON output
ai-vision detect-objects image.jpg --prompt "find text" --json
```

**Output Format:**

Returns:
- `detections`: Array of detected objects with bounding boxes and confidence scores
- `summary`: Human-readable text with CSS selectors for web elements and percentage coordinates
- `metadata`: Detection model, provider, processing time, and coordinate information

### analyze-video

Analyze video content frame-by-frame or as a whole. Supports URLs, local files, and YouTube videos.

```bash
ai-vision analyze-video <source> --prompt <text> [options]
```

**Options:**

```
--start-offset <time>        Start time for video clipping (e.g., "40s", "2m30s", "00:02:30")
--end-offset <time>          End time for video clipping (e.g., "80s", "3m", "00:03:00")
--fps <number>               Frame sampling rate (0.1-30, default: 1)
--temperature <num>          Temperature 0-2 (default: 0.7)
--top-p <num>                Top P 0-1
--top-k <num>                Top K 1-100
--max-tokens <num>           Max output tokens
--json                       Output raw JSON instead of formatted text
```

**Examples:**

```bash
# Analyze local video
ai-vision analyze-video recording.mp4 --prompt "describe what happens"

# Analyze YouTube video with context validation
ai-vision analyze-video https://www.youtube.com/watch?v=dQw4w9WgXcQ --prompt "summarize content"

# Analyze video segment with custom frame rate
ai-vision analyze-video video.mp4 --prompt "detect bugs" --start-offset 1m --end-offset 3m --fps 2

# Analyze Playwright recording
ai-vision analyze-video playwright-video.webm --prompt "detect interaction bugs"

# Get JSON output
ai-vision analyze-video video.mp4 --prompt "summarize" --json
```

## Global Options

```
--prompt <text>              Analysis prompt (required for most commands)
--json                       Output raw JSON instead of formatted text
--temperature <num>          Temperature 0-2 (default: 0.7)
--top-p <num>                Top P 0-1
--top-k <num>                Top K 1-100
--max-tokens <num>           Max output tokens
--help                       Show help
```

## Input Sources

All commands accept multiple input formats:

- **URLs**: `https://example.com/image.jpg`
- **Local files**: `./path/to/image.jpg`
- **Base64 data**: `data:image/jpeg;base64,...`
- **GCS URIs** (Vertex AI): `gs://bucket/path/to/image.jpg`
- **File references**: `files/...` (reuse previously uploaded files)
- **YouTube URLs** (analyze-video only): `https://www.youtube.com/watch?v=...`

## Use Cases

### Design System Analysis

Extract design tokens and component inventory from design mockups:

```bash
ai-vision analyze-image design-system.png --mode palette --prompt "extract all colors and spacing values"
ai-vision analyze-image components.png --mode components --prompt "catalog all UI components"
```

### Visual Regression Testing

Compare baseline and current screenshots to detect unintended changes:

```bash
ai-vision compare-images baseline.png current.png --prompt "identify visual differences"
```

### Content Moderation

Detect objects and analyze image content:

```bash
ai-vision detect-objects user-upload.jpg --prompt "find inappropriate content"
```

### Video Analysis

Analyze recorded interactions and detect bugs:

```bash
ai-vision analyze-video playwright-recording.webm --prompt "detect UI interaction bugs"
```

## Configuration

Configure default values via environment variables:

```bash
# Temperature settings
export TEMPERATURE=0.7
export TEMPERATURE_FOR_IMAGE=0.5
export TEMPERATURE_FOR_ANALYZE_IMAGE=0.3

# Token limits
export MAX_TOKENS=2048
export MAX_TOKENS_FOR_IMAGE=1024
export MAX_TOKENS_FOR_ANALYZE_IMAGE=512

# Sampling parameters
export TOP_P=0.9
export TOP_K=40
```

## Integration

Use as an MCP server in Claude Desktop, Claude Code, or other MCP clients:

```json
{
  "mcpServers": {
    "ai-vision-mcp": {
      "command": "npx",
      "args": ["ai-vision-mcp"],
      "env": {
        "IMAGE_PROVIDER": "google",
        "GEMINI_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Resources

- [GitHub Repository](https://github.com/tan-yong-sheng/ai-vision-mcp)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Google Gemini API](https://ai.google.dev)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai)

## License

MIT
