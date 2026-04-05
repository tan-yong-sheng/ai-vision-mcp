---
name: ai-vision-cli
description: >
  Analyze images and videos with AI vision models. Detect objects with bounding boxes,
  compare multiple images, audit design compliance, and analyze video content using 
  Google Gemini or Vertex AI. Supports CLI and MCP modes.
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
    - design-audit
---

# AI Vision MCP

AI-powered image and video analysis CLI using Google Gemini and Vertex AI models.

## Quick Start

### Installation

```bash
npm install -g ai-vision-mcp
# or use directly
npx ai-vision-mcp <command> [options]
```

### Setup

Set your provider via environment variables:

**Google AI Studio (Recommended)**
```bash
export IMAGE_PROVIDER="google"
export VIDEO_PROVIDER="google"
export GEMINI_API_KEY="your-api-key"
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

### audit-design

Audit a website or UI design for accessibility, visual quality, WCAG contrast compliance, and design best practices.

```bash
ai-vision audit-design <source> [--prompt <text>] [options]
```

**Options:**
- `--prompt <text>` — Custom audit prompt (optional)
- `--temperature <num>` — Temperature 0-2 (default: 0.7)
- `--top-p <num>` — Top P 0-1
- `--top-k <num>` — Top K 1-100
- `--max-tokens <num>` — Max output tokens
- `--json` — Output raw JSON

**Output includes:**
- Severity level (critical/major/minor/pass)
- Metrics: dimensions, dominant colors, edge complexity, luminance, WCAG contrast
- Issues identified with recommendations
- AI critique

**Examples:**
```bash
ai-vision audit-design https://example.com/hero.jpg
ai-vision audit-design screenshot.png --prompt "Evaluate accessibility"
ai-vision audit-design design.jpg --json
```

### analyze-image

Analyze an image with AI vision models.

```bash
ai-vision analyze-image <source> --prompt <text> [options]
```

**Options:**
- `--prompt <text>` — Analysis prompt (required)
- `--temperature <num>` — Temperature 0-2 (default: 0.7)
- `--top-p <num>` — Top P 0-1
- `--top-k <num>` — Top K 1-100
- `--max-tokens <num>` — Max output tokens
- `--json` — Output raw JSON

**Examples:**
```bash
ai-vision analyze-image https://example.com/image.jpg --prompt "describe the scene"
ai-vision analyze-image screenshot.png --prompt "extract design tokens"
ai-vision analyze-image image.jpg --prompt "analyze" --json
```

### compare-images

Compare 2-4 images to identify differences, similarities, or changes.

```bash
ai-vision compare-images <source1> <source2> [source3] [source4] --prompt <text> [options]
```

**Options:**
- `--prompt <text>` — Comparison prompt (required)
- `--temperature <num>` — Temperature 0-2 (default: 0.7)
- `--top-p <num>` — Top P 0-1
- `--top-k <num>` — Top K 1-100
- `--max-tokens <num>` — Max output tokens
- `--json` — Output raw JSON

**Examples:**
```bash
ai-vision compare-images before.jpg after.jpg --prompt "what changed?"
ai-vision compare-images v1.png v2.png v3.png --prompt "which is best?"
ai-vision compare-images baseline.png current.png --prompt "find visual bugs" --json
```

### detect-objects

Detect and identify objects in an image with bounding boxes and confidence scores.

```bash
ai-vision detect-objects <source> --prompt <text> [--output <path>] [options]
```

**Options:**
- `--prompt <text>` — Detection prompt (required)
- `--output <path>` — Save annotated image (optional)
- `--viewport-width <number>` — Logical viewport width for web screenshots
- `--viewport-height <number>` — Logical viewport height for web screenshots
- `--temperature <num>` — Temperature 0-2 (default: 0.7)
- `--top-p <num>` — Top P 0-1
- `--top-k <num>` — Top K 1-100
- `--max-tokens <num>` — Max output tokens
- `--json` — Output raw JSON

**Output includes:**
- Detections: Array of objects with bounding boxes and confidence scores
- Summary: Human-readable text with CSS selectors for web elements
- Metadata: Detection model, provider, processing time

**Examples:**
```bash
ai-vision detect-objects photo.jpg --prompt "find all cars"
ai-vision detect-objects scene.jpg --prompt "detect people" --output annotated.jpg
ai-vision detect-objects screenshot.png --prompt "find buttons" --viewport-width 1920 --viewport-height 1080
ai-vision detect-objects image.jpg --prompt "find text" --json
```

### analyze-video

Analyze video content frame-by-frame or as a whole. Supports URLs, local files, and YouTube videos.

```bash
ai-vision analyze-video <source> --prompt <text> [options]
```

**Options:**
- `--prompt <text>` — Analysis prompt (required)
- `--start-offset <time>` — Start time (e.g., "40s", "2m30s", "00:02:30")
- `--end-offset <time>` — End time (e.g., "80s", "3m", "00:03:00")
- `--fps <number>` — Frame sampling rate (0.1-30, default: 1)
- `--temperature <num>` — Temperature 0-2 (default: 0.7)
- `--top-p <num>` — Top P 0-1
- `--top-k <num>` — Top K 1-100
- `--max-tokens <num>` — Max output tokens
- `--json` — Output raw JSON

**Examples:**
```bash
ai-vision analyze-video recording.mp4 --prompt "describe what happens"
ai-vision analyze-video https://www.youtube.com/watch?v=dQw4w9WgXcQ --prompt "summarize content"
ai-vision analyze-video video.mp4 --prompt "detect bugs" --start-offset 1m --end-offset 3m --fps 2
ai-vision analyze-video playwright-video.webm --prompt "detect interaction bugs"
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

### Supported Formats

**Images:** jpg, jpeg, png, bmp, gif, webp

**Videos:** mp4, mov, avi, webm, flv, mpeg, mpg, wmv, 3gp

**Remote video handling:**
- Videos under 50MB are downloaded and passed inline as base64
- Videos at or above 50MB use the Files API upload path

## Use Cases

**Design System Analysis**
```bash
ai-vision audit-design design-system.png
ai-vision analyze-image components.png --prompt "catalog all UI components"
```

**Visual Regression Testing**
```bash
ai-vision compare-images baseline.png current.png --prompt "identify visual differences"
```

**Content Moderation**
```bash
ai-vision detect-objects user-upload.jpg --prompt "find inappropriate content"
```

**Video Analysis**
```bash
ai-vision analyze-video playwright-recording.webm --prompt "detect UI interaction bugs"
```

## Configuration

Configure defaults via environment variables:

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
