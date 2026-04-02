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
import { detect_objects_in_image } from './detect_objects_in_image.js';

// APPROACH 5: Hybrid - Use detect_objects_in_image + code-based hierarchy + semantic enrichment
// This approach reuses the working detect_objects_in_image tool
const LAYOUT_EXTRACTION_SYSTEM_INSTRUCTION = `
You are a semantic enrichment assistant. Given a list of detected UI elements with their bounding boxes,
add semantic information: text content and ARIA roles.

For each element ID, provide:
- text: visible text content (what the user sees)
- role: ARIA role (button, navigation, textbox, main, region, etc.)

Return a JSON object mapping element IDs to their semantic info:
{
  "elem-0": {"text": "Navigation", "role": "navigation"},
  "elem-1": {"text": "New Chat", "role": "button"},
  "elem-2": {"text": "Search models", "role": "textbox"}
}

Return ONLY valid JSON, no explanation.
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

    console.error('[extract_layout_tree] Using Approach 5: Hybrid (detect_objects + hierarchy + enrichment)');

    // Step 1: Call detect_objects_in_image to get all elements
    console.error('[extract_layout_tree] Step 1: Detecting objects...');
    const detectionResult = await detect_objects_in_image(
      { imageSource: args.imageSource },
      config,
      imageProvider,
      imageFileService
    );

    if (!detectionResult.detections || detectionResult.detections.length === 0) {
      throw new VisionError('No objects detected in image', 'DETECTION_ERROR');
    }

    const imageWidth = detectionResult.image_metadata.width;
    const imageHeight = detectionResult.image_metadata.height;

    console.error(`[extract_layout_tree] Step 1 complete: ${detectionResult.detections.length} objects detected`);

    // Step 2: Build hierarchy from bounding boxes using code
    console.error('[extract_layout_tree] Step 2: Building hierarchy from bounding boxes...');

    const buildHierarchy = (detections: any[]): LayoutNode[] => {
      // Sort by area (larger first) to find parents
      const sorted = detections
        .map((d, idx) => ({ ...d, originalIndex: idx }))
        .sort((a, b) => {
          const areaA = a.normalized_box_2d[2] * a.normalized_box_2d[3];
          const areaB = b.normalized_box_2d[2] * b.normalized_box_2d[3];
          return areaB - areaA;
        });

      const nodeMap = new Map<number, LayoutNode>();
      const rootNodes: LayoutNode[] = [];

      // Create nodes
      for (const det of sorted) {
        const node: LayoutNode = {
          id: `elem-${det.originalIndex}`,
          type: det.object || 'div',
          role: 'generic',
          text: det.label,
          bounds: {
            x: 0,
            y: 0,
            width: imageWidth,
            height: imageHeight,
            normalized: {
              x: det.normalized_box_2d[1],
              y: det.normalized_box_2d[0],
              width: det.normalized_box_2d[3] - det.normalized_box_2d[1],
              height: det.normalized_box_2d[2] - det.normalized_box_2d[0],
            },
          },
          children: [],
        };
        nodeMap.set(det.originalIndex, node);
      }

      // Build parent-child relationships
      for (let i = 0; i < sorted.length; i++) {
        const child = nodeMap.get(sorted[i].originalIndex)!;
        let foundParent = false;

        // Find smallest parent that contains this element
        for (let j = 0; j < i; j++) {
          const parent = nodeMap.get(sorted[j].originalIndex)!;
          const [ymin1, xmin1, ymax1, xmax1] = sorted[i].normalized_box_2d;
          const [ymin2, xmin2, ymax2, xmax2] = sorted[j].normalized_box_2d;

          // Check if parent contains child (with small tolerance)
          if (xmin2 <= xmin1 + 5 && xmax1 <= xmax2 + 5 && ymin2 <= ymin1 + 5 && ymax1 <= ymax2 + 5) {
            parent.children.push(child);
            foundParent = true;
            break;
          }
        }

        if (!foundParent) {
          rootNodes.push(child);
        }
      }

      return rootNodes;
    };

    const hierarchy = buildHierarchy(detectionResult.detections);

    // Step 3: Enrich with semantic information
    console.error('[extract_layout_tree] Step 3: Enriching with semantic information...');

    const processedImageSource = await imageFileService.handleImageSource(args.imageSource);

    const enrichmentPrompt = `Given these detected UI elements with their bounding boxes, provide semantic information (text content and ARIA roles).

Elements:
${detectionResult.detections
  .map(
    (d: any, idx: number) =>
      `elem-${idx}: ${d.object} at [${d.normalized_box_2d.join(', ')}] - "${d.label}"`
  )
  .join('\n')}

Return a JSON object mapping element IDs to semantic info:
{
  "elem-0": {"text": "visible text", "role": "button"},
  "elem-1": {"text": "visible text", "role": "navigation"}
}

Return ONLY valid JSON, no explanation.`;

    const enrichmentOptions: AnalysisOptions = {
      temperature: config.TEMPERATURE_FOR_IMAGE ?? config.TEMPERATURE,
      topP: config.TOP_P_FOR_IMAGE ?? config.TOP_P,
      topK: config.TOP_K_FOR_IMAGE ?? config.TOP_K,
      maxTokens: config.MAX_TOKENS_FOR_IMAGE ?? config.MAX_TOKENS,
      taskType: 'image',
      systemInstruction: LAYOUT_EXTRACTION_SYSTEM_INSTRUCTION,
    };

    const enrichmentResult = await imageProvider.analyzeImage(
      processedImageSource,
      enrichmentPrompt,
      enrichmentOptions
    );

    let semanticMap: Record<string, any> = {};
    try {
      semanticMap = JSON.parse(enrichmentResult.text || '{}');
    } catch (e) {
      console.error('[extract_layout_tree] Warning: semantic enrichment parsing failed, continuing without enrichment');
    }

    // Merge semantic info into hierarchy
    const enrichHierarchy = (nodes: LayoutNode[]): LayoutNode[] => {
      return nodes.map((node) => ({
        ...node,
        text: semanticMap[node.id]?.text || node.text,
        role: semanticMap[node.id]?.role || node.role,
        children: enrichHierarchy(node.children),
      }));
    };

    const enrichedHierarchy = enrichHierarchy(hierarchy);

    // Create root node
    let enhancedRoot: LayoutNode;
    if (enrichedHierarchy.length === 1) {
      enhancedRoot = enrichedHierarchy[0];
    } else {
      enhancedRoot = {
        id: 'root-0',
        type: 'document',
        role: 'document',
        bounds: {
          x: 0,
          y: 0,
          width: imageWidth,
          height: imageHeight,
          normalized: normalizeCoordinates(0, 0, imageWidth, imageHeight, imageWidth, imageHeight),
        },
        children: enrichedHierarchy,
      };
    }

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
          size_bytes: detectionResult.image_metadata.original_size,
        },
        extractionMethod: 'hybrid',
        processingTime:
          (detectionResult.metadata?.processingTime || 0) + (enrichmentResult.metadata?.processingTime || 0),
        model: enrichmentResult.metadata?.model,
        provider: enrichmentResult.metadata?.provider || config.IMAGE_PROVIDER,
        coordinateScale: 1000,
        coordinateFormat: '[ymin, xmin, ymax, xmax]',
        designTokens,
        layoutAnalysis,
        spatialMetrics,
      },
    };

    // Generate summary
    const imageMetadata = {
      width: imageWidth,
      height: imageHeight,
      size_bytes: detectionResult.image_metadata.original_size,
      format: outputFormat,
    };
    const summary = generateLayoutSummary(layoutTree, imageMetadata);

    console.error(`[extract_layout_tree] Generated summary (${summary.length} characters)`);

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
