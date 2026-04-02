---
name: ai-vision-mcp
description: AI-powered image and video analysis using Google Gemini and Vertex AI
version: 1.0.0
author: Tan Yong Sheng
license: MIT
tags:
  - image-analysis
  - video-analysis
  - gemini
  - vertex-ai
  - mcp
  - cli
keywords:
  - vision
  - ai
  - image
  - video
  - analysis
  - detection
  - comparison
---

# AI Vision MCP

AI-powered image and video analysis CLI using Google Gemini and Vertex AI models. Analyze images, compare multiple images, detect objects, and analyze videos with advanced AI capabilities.

## Installation

```bash
npm install -g ai-vision-mcp
```

Or use directly with npx:

```bash
npx ai-vision-mcp <command> [options]
```

## Setup

Set up your provider credentials before using:

### Google AI Studio (Recommended)

```bash
export IMAGE_PROVIDER="google"
export VIDEO_PROVIDER="google"
export GEMINI_API_KEY="your-gemini-api-key"
```

Get your API key at [aistudio.google.com/app/api-keys](https://aistudio.google.com/app/api-keys)

### Vertex AI

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

Compare 2-4 images side-by-side to identify differences, similarities, or changes.

```bash
ai-vision compare-images <source1> <source2> [source3] [source4] --prompt <text> [options]
```

**Examples:**

```bash
# Compare two versions
ai-vision compare-images before.jpg after.jpg --prompt "what changed?"

# Compare multiple designs
ai-vision compare-images v1.png v2.png v3.png --prompt "which is best?"

# Visual regression testing
ai-vision compare-images baseline.png current.png --prompt "find visual bugs" --json
```

### detect-objects

Detect and identify objects in an image with bounding boxes and confidence scores.

```bash
ai-vision detect-objects <source> --prompt <text> [--output <path>] [options]
```

**Examples:**

```bash
# Detect objects
ai-vision detect-objects photo.jpg --prompt "find all cars"

# Save annotated image
ai-vision detect-objects scene.jpg --prompt "detect people" --output annotated.jpg

# Get JSON output
ai-vision detect-objects image.jpg --prompt "find text" --json
```

### analyze-video

Analyze video content frame-by-frame or as a whole.

```bash
ai-vision analyze-video <source> --prompt <text> [options]
```

**Examples:**

```bash
# Analyze video
ai-vision analyze-video recording.mp4 --prompt "describe what happens"

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

## Error Handling

The CLI provides clear error messages for common issues:

- Missing required arguments
- Invalid image sources
- API authentication failures
- Rate limiting
- Unsupported file formats

## Performance Tips

- Use `--max-tokens` to limit response length and reduce latency
- Adjust `--temperature` based on use case (lower for consistency, higher for creativity)
- For batch processing, consider using the MCP server mode instead of CLI
- Cache results when analyzing the same images multiple times

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
