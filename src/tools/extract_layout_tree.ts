/**
 * MCP Tool: extract_layout_tree
 * Extracts hierarchical layout tree from screenshots for LLM design reasoning
 */

import path from 'path';
import type { AnalysisOptions } from '../types/Providers.js';
import type { VisionProvider } from '../types/Providers.js';
import { FileService } from '../services/FileService.js';
import type { Config } from '../types/Config.js';
import { VisionError } from '../types/Errors.js';
import { FUNCTION_NAMES } from '../constants/FunctionNames.js';
import type {
  ExtractLayoutTreeArgs,
  ExtractLayoutTreeResponse,
  LayoutTree,
  LayoutNode,
} from '../types/LayoutTree.js';
import { Image } from 'imagescript';
import { extractDesignTokens } from '../utils/designTokenExtractor.js';
import { analyzeLayout } from '../utils/layoutAnalyzer.js';
import { calculateSpatialMetrics } from '../utils/spatialMetrics.js';

// System instruction for layout tree extraction
const LAYOUT_EXTRACTION_SYSTEM_INSTRUCTION = `
You are a UI layout analysis assistant that extracts EVERY visible UI element from screenshots.

CRITICAL: Extract ALL visible elements, not just major sections. Include buttons, text, inputs, images, containers, etc.

STEP 1 - IDENTIFY ALL ELEMENTS:
Scan the entire screenshot systematically from top-left to bottom-right.
Detect EVERY visible element:
- Text elements (headings, paragraphs, labels, buttons with text)
- Interactive elements (buttons, inputs, selects, checkboxes, radio buttons, links)
- Containers (divs, sections, cards, panels, modals, dropdowns)
- Media (images, icons, videos)
- Navigation (nav bars, menus, breadcrumbs, tabs)
- Decorative elements (lines, borders, backgrounds)

STEP 2 - DETERMINE HIERARCHY:
Build parent-child relationships based on visual containment:
- If element A fully contains element B, A is parent of B
- Use bounding box logic: if B's box is inside A's box, B is a child of A
- Preserve semantic relationships (nav contains links, form contains inputs, etc.)

STEP 3 - CLASSIFY EACH ELEMENT:
For every element, determine:
- Type: button, heading, text, input, select, checkbox, radio, link, image, icon, container, section, nav, header, footer, modal, dropdown, card, etc.
- Role: ARIA role if applicable
- Text: visible text content (for buttons, labels, headings)
- Bounds: [x, y, width, height] in pixels (measure from top-left corner)

STEP 4 - OUTPUT FORMAT:
Return valid JSON with COMPLETE hierarchy:
{
  "root": {
    "id": "root-0",
    "type": "document",
    "bounds": {"x": 0, "y": 0, "width": 1920, "height": 1080},
    "children": [
      {
        "id": "element-1",
        "type": "header",
        "bounds": {"x": 0, "y": 0, "width": 1920, "height": 80},
        "children": [
          {"id": "element-2", "type": "button", "text": "Menu", "bounds": {"x": 10, "y": 10, "width": 60, "height": 60}},
          {"id": "element-3", "type": "text", "text": "Title", "bounds": {"x": 100, "y": 20, "width": 200, "height": 40}}
        ]
      },
      {
        "id": "element-4",
        "type": "section",
        "bounds": {"x": 0, "y": 80, "width": 1920, "height": 1000},
        "children": [...]
      }
    ]
  }
}

RULES:
- MANDATORY: Extract ALL visible elements (not just major sections)
- Use unique IDs: "root-0", "element-1", "element-2", etc.
- Bounds MUST be in pixels: [x, y, width, height] from top-left (0,0)
- Include text content for all text-bearing elements
- Ensure complete coverage: every visible element should be in the tree
- Preserve visual hierarchy: nested elements are children
`;

// Create detection schema for layout extraction
const createLayoutExtractionSchema = () => {
  return {
    type: 'object',
    properties: {
      root: {
        type: 'object',
        description: 'Root layout node containing hierarchical structure',
      },
    },
    required: ['root'],
  };
};

export type { ExtractLayoutTreeArgs } from '../types/LayoutTree.js';

/**
 * Build normalized coordinates from pixel coordinates
 */
function normalizeCoordinates(
  x: number,
  y: number,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round((x / imageWidth) * 1000),
    y: Math.round((y / imageHeight) * 1000),
    width: Math.round((width / imageWidth) * 1000),
    height: Math.round((height / imageHeight) * 1000),
  };
}

/**
 * Enhance layout node with normalized coordinates
 */
function enhanceLayoutNode(
  node: any,
  imageWidth: number,
  imageHeight: number,
  idPrefix: string = 'element'
): LayoutNode {
  const nodeId =
    node.id || `${idPrefix}-${Math.random().toString(36).substr(2, 9)}`;
  const bounds = node.bounds || {
    x: 0,
    y: 0,
    width: imageWidth,
    height: imageHeight,
  };

  const normalized = normalizeCoordinates(
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    imageWidth,
    imageHeight
  );

  const enhancedNode: LayoutNode = {
    id: nodeId,
    type: node.type || 'div',
    role: node.role,
    text: node.text,
    ariaLabel: node.ariaLabel,
    bounds: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      normalized,
    },
    children: (node.children || []).map((child: any, index: number) =>
      enhanceLayoutNode(
        child,
        imageWidth,
        imageHeight,
        `${nodeId}-child-${index}`
      )
    ),
    properties: node.properties,
  };

  return enhancedNode;
}

/**
 * Generate human-readable summary of layout tree
 */
function generateLayoutSummary(
  layoutTree: LayoutTree,
  imageMetadata: {
    width: number;
    height: number;
    size_bytes: number;
    format: string;
  }
): string {
  const summary = [];

  summary.push(`LAYOUT TREE EXTRACTION COMPLETE\n`);
  summary.push(
    `Source Image: ${imageMetadata.width}×${imageMetadata.height} pixels (${imageMetadata.format.toUpperCase()}, ${(imageMetadata.size_bytes / 1024 / 1024).toFixed(1)}MB)`
  );
  summary.push(`Extraction Method: ${layoutTree.metadata.extractionMethod}`);
  summary.push(`Processing Time: ${layoutTree.metadata.processingTime}ms\n`);

  // Count elements
  let elementCount = 0;
  const countElements = (node: LayoutNode) => {
    elementCount++;
    node.children.forEach(countElements);
  };
  countElements(layoutTree.root);

  summary.push(`## LAYOUT STRUCTURE:\n`);
  summary.push(`Total Elements: ${elementCount}`);
  summary.push(`Root Type: ${layoutTree.root.type}`);
  summary.push(`Root Role: ${layoutTree.root.role || 'N/A'}\n`);

  // Element type breakdown
  const typeCount: Record<string, number> = {};
  const countTypes = (node: LayoutNode) => {
    typeCount[node.type] = (typeCount[node.type] || 0) + 1;
    node.children.forEach(countTypes);
  };
  countTypes(layoutTree.root);

  summary.push(`## ELEMENT TYPES:\n`);
  Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      summary.push(`- ${type}: ${count}`);
    });

  // Design tokens summary
  if (layoutTree.metadata.designTokens) {
    const tokens = layoutTree.metadata.designTokens;
    summary.push(`\n## DESIGN TOKENS:\n`);
    if (tokens.colors && tokens.colors.length > 0) {
      summary.push(
        `Colors: ${tokens.colors.length} unique (${tokens.colors
          .slice(0, 3)
          .map((c: any) => c.value)
          .join(', ')}${tokens.colors.length > 3 ? ', ...' : ''})`
      );
    }
    if (tokens.typography && tokens.typography.length > 0) {
      summary.push(`Typography: ${tokens.typography.length} unique styles`);
    }
    if (tokens.spacing && tokens.spacing.length > 0) {
      summary.push(`Spacing: ${tokens.spacing.length} unique values`);
    }
  }

  // Layout analysis summary
  if (layoutTree.metadata.layoutAnalysis) {
    const analysis = layoutTree.metadata.layoutAnalysis;
    summary.push(`\n## LAYOUT ANALYSIS:\n`);
    summary.push(`Layout Type: ${analysis.primaryLayout}`);
    if (analysis.alignmentPatterns && analysis.alignmentPatterns.length > 0) {
      summary.push(
        `Alignment Patterns: ${analysis.alignmentPatterns.join(', ')}`
      );
    }
    if (analysis.gridInfo) {
      summary.push(
        `Grid: ${analysis.gridInfo.rows || 1}×${analysis.gridInfo.columns}`
      );
    }
    summary.push(`Hierarchy Depth: ${analysis.hierarchy.depth}`);
  }

  // Spatial metrics summary
  if (layoutTree.metadata.spatialMetrics) {
    const metrics = layoutTree.metadata.spatialMetrics;
    summary.push(`\n## SPATIAL METRICS:\n`);
    if (metrics.alignmentMetrics && metrics.alignmentMetrics.length > 0) {
      const horizontalCount = metrics.alignmentMetrics.filter(
        (m: any) => m.type === 'horizontal'
      ).length;
      const verticalCount = metrics.alignmentMetrics.filter(
        (m: any) => m.type === 'vertical'
      ).length;
      summary.push(
        `Alignment Groups: ${horizontalCount} horizontal, ${verticalCount} vertical`
      );
    }
    if (metrics.spacingConsistency) {
      summary.push(
        `Spacing Consistency: ${metrics.spacingConsistency.variance.toFixed(1)}px variance`
      );
    }
    if (metrics.collisions && metrics.collisions.length > 0) {
      summary.push(`Overlapping Elements: ${metrics.collisions.length}`);
    }
  }

  summary.push(`\n## COORDINATE SYSTEM:\n`);
  summary.push(`- Pixel coordinates: absolute (x, y, width, height)`);
  summary.push(`- Normalized coordinates: 0-1000 scale`);
  summary.push(`- Origin: top-left (0, 0)`);

  return summary.join('\n');
}

export async function extract_layout_tree(
  args: ExtractLayoutTreeArgs,
  config: Config,
  imageProvider: VisionProvider,
  imageFileService: FileService
): Promise<ExtractLayoutTreeResponse> {
  try {
    // Validate arguments
    if (!args.imageSource) {
      throw new VisionError('imageSource is required', 'MISSING_ARGUMENT');
    }

    // Handle image source (URL vs local file vs base64)
    const processedImageSource = await imageFileService.handleImageSource(
      args.imageSource
    );
    console.error(
      `[extract_layout_tree] Processed image source: ${processedImageSource.substring(0, 100)}${processedImageSource.length > 100 ? '...' : ''}`
    );

    // Get original image buffer and dimensions
    let originalImageBuffer: Buffer;
    let imageWidth: number;
    let imageHeight: number;

    if (args.imageSource.startsWith('data:image/')) {
      // Base64 image
      const base64Data = args.imageSource.split(',')[1];
      originalImageBuffer = Buffer.from(base64Data, 'base64');
    } else if (args.imageSource.startsWith('http')) {
      // URL - fetch the image
      const response = await fetch(args.imageSource);
      if (!response.ok) {
        throw new VisionError(
          `Failed to fetch image from URL: ${response.statusText}`,
          'FETCH_ERROR'
        );
      }
      originalImageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      // Local file path
      originalImageBuffer = await imageFileService.readFile(args.imageSource);
    }

    // Get image dimensions using ImageScript
    const decoded = await Image.decode(originalImageBuffer);
    imageWidth = decoded.width || 0;
    imageHeight = decoded.height || 0;

    if (imageWidth === 0 || imageHeight === 0) {
      throw new VisionError(
        'Unable to determine image dimensions',
        'INVALID_IMAGE'
      );
    }

    console.error(
      `[extract_layout_tree] Image size: ${imageWidth}x${imageHeight}`
    );

    // Merge default options with provided options
    const options: AnalysisOptions = {
      temperature: config.TEMPERATURE_FOR_IMAGE ?? config.TEMPERATURE,
      topP: config.TOP_P_FOR_IMAGE ?? config.TOP_P,
      topK: config.TOP_K_FOR_IMAGE ?? config.TOP_K,
      maxTokens: config.MAX_TOKENS_FOR_IMAGE ?? config.MAX_TOKENS,
      taskType: 'image',
      functionName: FUNCTION_NAMES.ANALYZE_IMAGE, // Reuse for now
      responseSchema: createLayoutExtractionSchema(),
      systemInstruction: LAYOUT_EXTRACTION_SYSTEM_INSTRUCTION,
      ...args.options,
    };

    console.error('[extract_layout_tree] Extracting layout tree from image...');
    console.error(
      `[extract_layout_tree] Configuration: temperature=${options.temperature}, topP=${options.topP}, topK=${options.topK}, maxTokens=${options.maxTokens}`
    );

    // Analyze the image for layout extraction
    const result = await imageProvider.analyzeImage(
      processedImageSource,
      'Extract the hierarchical layout structure from this screenshot. Return a JSON object with the root element and all child elements organized hierarchically.',
      options
    );

    console.error(
      `[extract_layout_tree] Response length: ${result.text.length} characters`
    );

    // Parse layout tree results
    let rawLayoutData: any = null;

    const rawText = (result.text || '').trim();

    // Try to extract JSON from response
    const candidates: string[] = [];

    if (rawText) candidates.push(rawText);

    // Try fenced code block
    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      candidates.unshift(fencedMatch[1].trim());
    }

    // Try object extraction
    const objStart = rawText.indexOf('{');
    const objEnd = rawText.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
      candidates.push(rawText.slice(objStart, objEnd + 1).trim());
    }

    // Try parsing candidates
    let parsed = false;
    for (const candidate of candidates) {
      try {
        rawLayoutData = JSON.parse(candidate);
        parsed = true;
        if (candidate !== rawText) {
          console.error(
            '[extract_layout_tree] Successfully parsed JSON after extraction/cleanup'
          );
        }
        break;
      } catch (e) {
        // Try unescaping if it looks like double-encoded JSON
        if (candidate.includes('\\"')) {
          try {
            // First, try parsing as a JSON string to unescape it
            let unescaped = candidate;
            try {
              // If it's a JSON string, parse it first
              unescaped = JSON.parse(candidate);
            } catch {
              // If that fails, manually unescape
              unescaped = candidate
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\\//g, '/');
            }
            // Now parse the unescaped JSON
            rawLayoutData = JSON.parse(unescaped);
            parsed = true;
            console.error(
              '[extract_layout_tree] Successfully parsed JSON after unescaping'
            );
            break;
          } catch {
            // keep trying
          }
        }
      }
    }

    if (!parsed) {
      throw new VisionError(
        `Failed to parse layout tree as JSON. Raw response (first 500 chars): ${rawText.substring(0, 500)}`,
        'PARSE_ERROR',
        config.IMAGE_PROVIDER
      );
    }

    console.error('[extract_layout_tree] Successfully parsed layout tree');

    // Enhance layout tree with normalized coordinates
    const enhancedRoot = enhanceLayoutNode(
      rawLayoutData.root || rawLayoutData,
      imageWidth,
      imageHeight
    );

    // Extract design tokens, layout analysis, and spatial metrics
    console.error('[extract_layout_tree] Extracting design tokens...');
    const designTokens = extractDesignTokens(enhancedRoot);

    console.error('[extract_layout_tree] Analyzing layout structure...');
    const layoutAnalysis = analyzeLayout(enhancedRoot);

    console.error('[extract_layout_tree] Calculating spatial metrics...');
    const spatialMetrics = calculateSpatialMetrics(enhancedRoot);

    // Determine output format
    let outputFormat: string = 'png';
    if (args.imageSource.startsWith('data:image/')) {
      const mime = args.imageSource.split(';')[0];
      const ext = mime.split('/')[1];
      if (ext) outputFormat = ext;
    } else if (args.imageSource.startsWith('http')) {
      const urlPath = args.imageSource.split('?')[0];
      const ext = path.extname(urlPath).replace('.', '').toLowerCase();
      if (ext) outputFormat = ext;
    } else {
      const ext = path.extname(args.imageSource).replace('.', '').toLowerCase();
      if (ext) outputFormat = ext;
    }

    // Build layout tree response
    const layoutTree: LayoutTree = {
      root: enhancedRoot,
      metadata: {
        viewport: {
          width: imageWidth,
          height: imageHeight,
        },
        imageMetadata: {
          width: imageWidth,
          height: imageHeight,
          format: outputFormat,
          size_bytes: originalImageBuffer.length,
        },
        extractionMethod: 'vision',
        processingTime: result.metadata?.processingTime || 0,
        model: result.metadata?.model,
        provider: result.metadata?.provider || config.IMAGE_PROVIDER,
        coordinateScale: 1000,
        coordinateFormat: '[x, y, width, height]',
        designTokens,
        layoutAnalysis,
        spatialMetrics,
      },
    };

    // Generate summary
    const imageMetadata = {
      width: imageWidth,
      height: imageHeight,
      size_bytes: originalImageBuffer.length,
      format: outputFormat,
    };
    const summary = generateLayoutSummary(layoutTree, imageMetadata);

    console.error(
      `[extract_layout_tree] Generated summary (${summary.length} characters)`
    );

    const response: ExtractLayoutTreeResponse = {
      layoutTree,
      summary,
    };

    return response;
  } catch (error) {
    console.error('Error in extract_layout_tree tool:', error);

    if (error instanceof VisionError) {
      throw error;
    }

    throw new VisionError(
      `Failed to extract layout tree: ${error instanceof Error ? error.message : String(error)}`,
      'EXTRACTION_ERROR',
      config.IMAGE_PROVIDER,
      error instanceof Error ? error : undefined
    );
  }
}
