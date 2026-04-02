#!/bin/bash
# Example: Analyze a design system image and extract design tokens

if [ -z "$1" ]; then
  echo "Usage: $0 <image-path-or-url>"
  exit 1
fi

echo "Extracting design tokens from: $1"
ai-vision analyze-image "$1" \
  --mode palette \
  --prompt "Extract all design tokens including colors (with hex values), spacing values (padding, margins, gaps), typography (font sizes, weights, line heights), shadows, and border radius values. Provide structured output with clear categorization."
