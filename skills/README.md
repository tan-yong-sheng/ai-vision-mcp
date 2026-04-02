# AI Vision MCP Skills

This directory contains reusable agent skills for the AI Vision MCP project, compatible with Vercel's skills.sh hub.

## Structure

```
skills/
└── ai-vision-mcp/
    ├── SKILL.md              # Main skill definition with YAML frontmatter
    ├── scripts/              # Optional executable scripts
    └── references/           # Optional supporting documentation
```

## Skill: ai-vision-mcp

A comprehensive skill for using the AI Vision MCP CLI to analyze images and videos with AI.

### Features

- **Image Analysis** - Analyze images with multiple modes (general, palette, hierarchy, components)
- **Image Comparison** - Compare 2-4 images to identify differences
- **Object Detection** - Detect and identify objects with bounding boxes
- **Video Analysis** - Analyze video content frame-by-frame

### Installation

Install the skill from this repository:

```bash
# Using skills CLI (when available)
skills install ./skills/ai-vision-mcp

# Or manually copy to your skills directory
cp -r skills/ai-vision-mcp ~/.claude/skills/
```

### Quick Start

```bash
# Analyze an image
ai-vision analyze-image image.jpg --prompt "describe the scene"

# Extract design tokens
ai-vision analyze-image design.png --mode palette --prompt "extract colors"

# Compare images
ai-vision compare-images before.jpg after.jpg --prompt "what changed?"

# Detect objects
ai-vision detect-objects photo.jpg --prompt "find all cars"

# Analyze video
ai-vision analyze-video recording.mp4 --prompt "summarize"
```

## Publishing to skills.sh

To publish this skill to Vercel's skills.sh hub:

1. Ensure the skill directory structure is correct
2. Verify SKILL.md has proper YAML frontmatter
3. Test the skill locally
4. Submit to [skills.sh](https://skills.sh) or create a PR to the [vercel-labs/skills](https://github.com/vercel-labs/skills) repository

## Resources

- [Vercel Skills Documentation](https://vercel.com/kb/guide/agent-skills-creating-installing-and-sharing-reusable-agent-context)
- [skills.sh Hub](https://skills.sh)
- [vercel-labs/skills Repository](https://github.com/vercel-labs/skills)
- [AI Vision MCP GitHub](https://github.com/tan-yong-sheng/ai-vision-mcp)
