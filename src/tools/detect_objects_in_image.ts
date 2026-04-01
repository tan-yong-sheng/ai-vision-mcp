/**
 * MCP Tool: detect_objects_in_image
 * Detects objects in images using AI vision models with bounding box annotations.
 */

import path from 'path';
import type { AnalysisOptions } from '../types/Providers.js';
import type { VisionProvider } from '../types/Providers.js';
import { FileService } from '../services/FileService.js';
import type { Config } from '../types/Config.js';
import { VisionError } from '../types/Errors.js';
import { FUNCTION_NAMES } from '../constants/FunctionNames.js';
import type {
  ObjectDetectionArgs,
  ObjectDetectionResponse,
  DetectedObject,
  DetectionWithFile,
  DetectionWithTempFile,
  DetectionOnly,
  ObjectDetectionMetadata,
} from '../types/ObjectDetection.js';
import { ImageAnnotator } from '../utils/imageAnnotator.js';
import { Image } from 'imagescript';

// System instruction for object detection with web context awareness
const DETECTION_SYSTEM_INSTRUCTION = `
You are a visual detection assistant that names detected objects based on image context.

STEP 1 - DETECT CONTEXT:
Determine whether the image represents a webpage.

Consider it a webpage if you detect multiple web indicators such as:
- Browser UI (tabs, address bar, navigation buttons)
- Web-style layouts (menus, grids, form layouts)
- HTML controls (inputs, buttons, dropdowns)
- Web fonts or text rendering
- Visible URL or webpage content

STEP 2 - NAME ELEMENTS:
- If the image appears to be a webpage → use HTML element names
  (e.g., button, input, a, nav, header, section, h1-h6, p, img, video)
- Otherwise → use general object names based on visual meaning.

STEP 3 - OUTPUT FORMAT:
Return a valid JSON array (no text outside JSON) with:
{
  "object": "<name based on context>",
  "label": "<short description>",
  "normalized_box_2d": [ymin, xmin, ymax, xmax],
  "confidence": <0.0-1.0>
}

Bounding box rules:
- Tightly fit visible area (exclude shadows/whitespace)
- Avoid overlap when separable
- Maintain ymin < ymax and xmin < xmax
- Differentiate duplicates by traits (e.g., color, position)

Confidence scoring:
- 0.9-1.0: Highly confident detection (clear, unambiguous)
- 0.7-0.9: Confident detection (visible, identifiable)
- 0.5-0.7: Moderate confidence (partially visible or ambiguous)
- Below 0.5: Low confidence (unclear or uncertain)
`;

// Detection schema equivalent to the one in gemini_object_detection.js
const createDetectionSchema = (provider: string) => {
  if (provider === 'google') {
    // Google GenAI schema format
    return {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          object: {
            type: 'string',
            description: 'Generic category for detected object element.',
          },
          label: {
            type: 'string',
            description: 'Descriptive label or instance-specific detail.',
          },
          normalized_box_2d: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: {
              type: 'integer',
            },
            description:
              'Bounding box coordinates [ymin, xmin, ymax, xmax], normalized to 0-1000',
          },
          confidence: {
            type: 'number',
            description: 'Detection confidence score (0.0-1.0)',
          },
        },
        required: ['object', 'label', 'normalized_box_2d', 'confidence'],
      },
    };
  } else {
    // Vertex AI and other providers - standard JSON schema
    return {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          object: {
            type: 'string',
            description: 'Generic category for detected object element.',
          },
          label: {
            type: 'string',
            description: 'Descriptive label or instance-specific detail.',
          },
          normalized_box_2d: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: {
              type: 'integer',
            },
            description:
              'Bounding box coordinates [ymin, xmin, ymax, xmax], normalized to 0-1000',
          },
          confidence: {
            type: 'number',
            description: 'Detection confidence score (0.0-1.0)',
          },
        },
        required: ['object', 'label', 'normalized_box_2d', 'confidence'],
      },
    };
  }
};

export type { ObjectDetectionArgs } from '../types/ObjectDetection.js';

/**
 * Generate CSS selector suggestions based on detected object type
 */
function suggestCSSSelectors(detection: DetectedObject): string[] {
  const selectors = [];
  const { object, label } = detection;

  // HTML element-specific selectors for web contexts
  if (object.startsWith('input[type=')) {
    const inputType = object.match(/type="([^"]+)"/)?.[1];
    if (inputType) {
      selectors.push(`input[type="${inputType}"]`);
      // Add name-based selector if label suggests a name
      const nameHint = label
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      if (nameHint) {
        selectors.push(`input[name="${nameHint}"]`);
      }
    }
  } else if (object === 'button') {
    selectors.push('button[type="submit"]');
    if (label) {
      selectors.push(`button:has-text("${label.replace(/\s+button$/i, '')}")`);
    }
  } else if (object === 'select') {
    selectors.push('select');
    const nameHint = label
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    if (nameHint) {
      selectors.push(`select[name="${nameHint}"]`);
    }
  } else if (object === 'a') {
    selectors.push('a');
    if (label) {
      selectors.push(`a:has-text("${label}")`);
    }
  } else if (object.startsWith('h') && /^h[1-6]$/.test(object)) {
    selectors.push(object);
    if (label) {
      selectors.push(`${object}:has-text("${label}")`);
    }
  } else if (
    ['nav', 'header', 'footer', 'main', 'section', 'article'].includes(object)
  ) {
    selectors.push(object);
  } else {
    // Generic fallback for non-HTML elements
    selectors.push(object);
  }

  return selectors.slice(0, 2); // Return top 2 suggestions
}

/**
 * Generate hybrid summary with CSS selectors and minimal coordinates
 */
function generateDetectionSummary(
  detections: DetectedObject[],
  imageMetadata: {
    width: number;
    height: number;
    size_bytes: number;
    format: string;
  },
  model: string,
  provider: string
): string {
  const summary = [];

  // Header with image context
  summary.push(`IMAGE ANALYSIS COMPLETE\n`);
  summary.push(
    `Source Image: ${imageMetadata.width}×${imageMetadata.height} pixels (${imageMetadata.format.toUpperCase()}, ${(imageMetadata.size_bytes / 1024 / 1024).toFixed(1)}MB)`
  );
  summary.push(`Detection Model: ${model} (${provider})`);
  summary.push(`Elements Found: ${detections.length} elements detected\n`);

  // Context-aware guidance based on detected elements
  const webElements = [
    'button',
    'input',
    'select',
    'textarea',
    'nav',
    'header',
    'footer',
    'main',
    'section',
    'article',
    'a',
    'form',
    'label',
    'fieldset',
  ];
  const hasWebElements = detections.some(d =>
    webElements.some(
      webEl => d.object === webEl || d.object.startsWith(webEl + '[')
    )
  );

  if (hasWebElements) {
    // Show web automation guidance for web interfaces
    summary.push(`FOR WEB AUTOMATION:`);
    summary.push(
      `- **RECOMMENDED**: Use CSS selectors for reliable automation (primary approach)`
    );
    summary.push(
      `- **REFERENCE ONLY**: Percentage coordinates for spatial context (secondary reference)`
    );
    summary.push(
      `- **AVOID**: Direct coordinate-based clicking for automation`
    );
    summary.push(
      `- **Technical Note**: Raw coordinates use normalized_box_2d format [ymin, xmin, ymax, xmax] on 0-1000 scale\n`
    );
  } else {
    // Show general object detection guidance for non-web content
    summary.push(`OBJECT DETECTION RESULTS:`);
    summary.push(
      `- **SPATIAL REFERENCE**: Coordinates show relative positioning within image`
    );
    summary.push(
      `- **COORDINATE FORMAT**: normalized_box_2d format [ymin, xmin, ymax, xmax] on 0-1000 scale\n`
    );
  }

  // Element details with hybrid format
  summary.push(`## DETECTED ELEMENTS:\n`);

  detections.forEach((detection, index) => {
    const [ymin, xmin, ymax, xmax] = detection.normalized_box_2d;

    // Convert normalized to percentage (0-1000 → 0-100)
    const centerX = (xmin + xmax) / 2 / 10; // 78.5%
    const centerY = (ymin + ymax) / 2 / 10; // 26.7%
    const widthPercent = (xmax - xmin) / 10; // 13.0%
    const heightPercent = (ymax - ymin) / 10; // 4.5%

    // Calculate pixel coordinates
    const pixelBox = {
      x: Math.round((xmin / 1000) * imageMetadata.width),
      y: Math.round((ymin / 1000) * imageMetadata.height),
      width: Math.round(((xmax - xmin) / 1000) * imageMetadata.width),
      height: Math.round(((ymax - ymin) / 1000) * imageMetadata.height),
      centerX: Math.round(((xmin + xmax) / 2 / 1000) * imageMetadata.width),
      centerY: Math.round(((ymin + ymax) / 2 / 1000) * imageMetadata.height),
    };

    // Element header
    summary.push(`### ${index + 1}. ${detection.object} - ${detection.label}`);

    // Only show automation guidance for web elements
    const isWebElement = webElements.some(
      webEl =>
        detection.object === webEl || detection.object.startsWith(webEl + '[')
    );

    if (isWebElement) {
      // Generate CSS selector suggestions for web elements
      const selectors = suggestCSSSelectors(detection);
      summary.push(
        `- **Automation**: ${selectors.map(s => `\`${s}\``).join(' or ')}`
      );
    }

    // Always show position for spatial reference
    summary.push(
      `- **Position**: ${centerX.toFixed(1)}% across, ${centerY.toFixed(1)}% down (${widthPercent.toFixed(1)}% × ${heightPercent.toFixed(1)}% size)`
    );

    // Always show pixel information
    summary.push(
      `- **Pixels**: ${pixelBox.width}×${pixelBox.height} at (${pixelBox.x}, ${pixelBox.y}), center (${pixelBox.centerX}, ${pixelBox.centerY})\n`
    );
  });

  return summary.join('\n');
}

export async function detect_objects_in_image(
  args: ObjectDetectionArgs,
  config: Config,
  imageProvider: VisionProvider,
  imageFileService: FileService
): Promise<ObjectDetectionResponse> {
  try {
    // Validate arguments
    if (!args.imageSource) {
      throw new VisionError('imageSource is required', 'MISSING_ARGUMENT');
    }
    if (!args.prompt) {
      throw new VisionError('prompt is required', 'MISSING_ARGUMENT');
    }

    // Handle image source (URL vs local file vs base64)
    const processedImageSource = await imageFileService.handleImageSource(
      args.imageSource
    );
    console.error(
      `[detect_objects_in_image] Processed image source: ${processedImageSource.substring(
        0,
        100
      )}${processedImageSource.length > 100 ? '...' : ''}`
    );

    // Get original image buffer and dimensions for annotation
    let originalImageBuffer: Buffer;
    // eslint-disable-next-line prefer-const
    let imageWidth: number;
    // eslint-disable-next-line prefer-const
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
    // eslint-disable-next-line prefer-const
    imageWidth = decoded.width || 0;
    // eslint-disable-next-line prefer-const
    imageHeight = decoded.height || 0;

    if (imageWidth === 0 || imageHeight === 0) {
      throw new VisionError(
        'Unable to determine image dimensions',
        'INVALID_IMAGE'
      );
    }

    console.error(
      `[detect_objects_in_image] Image size: ${imageWidth}x${imageHeight}`
    );

    // Use the provided prompt as the detection query
    const detectionPrompt = args.prompt;

    // Merge default options with provided options
    const options: AnalysisOptions = {
      temperature:
        config.TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE ??
        config.TEMPERATURE_FOR_IMAGE ??
        config.TEMPERATURE,
      topP:
        config.TOP_P_FOR_DETECT_OBJECTS_IN_IMAGE ??
        config.TOP_P_FOR_IMAGE ??
        config.TOP_P,
      topK:
        config.TOP_K_FOR_DETECT_OBJECTS_IN_IMAGE ??
        config.TOP_K_FOR_IMAGE ??
        config.TOP_K,
      maxTokens:
        config.MAX_TOKENS_FOR_DETECT_OBJECTS_IN_IMAGE ??
        config.MAX_TOKENS_FOR_IMAGE ??
        config.MAX_TOKENS,
      taskType: 'image',
      functionName: FUNCTION_NAMES.DETECT_OBJECTS_IN_IMAGE,
      // Add structured output configuration for object detection
      responseSchema: createDetectionSchema(config.IMAGE_PROVIDER),
      // Add system instruction to guide the model's behavior
      systemInstruction: DETECTION_SYSTEM_INSTRUCTION,
      ...args.options, // User options override defaults
    };

    console.error(
      '[detect_objects_in_image] Analyzing image for object detection...'
    );
    console.error(
      `[detect_objects_in_image] Configuration: temperature=${options.temperature}, topP=${options.topP}, topK=${options.topK}, maxTokens=${options.maxTokens}`
    );

    // Analyze the image for object detection
    const result = await imageProvider.analyzeImage(
      processedImageSource,
      detectionPrompt,
      options
    );

    console.error(
      `[detect_objects_in_image] Response length: ${result.text.length} characters`
    );
    console.error(
      `[detect_objects_in_image] Response ends with: "${result.text.slice(-50)}"`
    );

    // Parse detection results
    let detections: DetectedObject[] = [];

    const rawText = (result.text || '').trim();

    // The model is instructed to return raw JSON, but in practice it may return
    // prose + a fenced ```json block. Build a small set of increasingly-lenient
    // candidates and attempt to parse each.
    const candidates: string[] = [];

    // 1) Raw text as-is
    if (rawText) candidates.push(rawText);

    // 2) First fenced code block (```json ... ```), even if preceded by prose
    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      candidates.unshift(fencedMatch[1].trim());
    }

    // 3) Best-effort slice from first '[' to last ']' (common for arrays)
    const arrayStart = rawText.indexOf('[');
    const arrayEnd = rawText.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      candidates.push(rawText.slice(arrayStart, arrayEnd + 1).trim());
    }

    // 4) Best-effort slice from first '{' to last '}' (fallback)
    const objStart = rawText.indexOf('{');
    const objEnd = rawText.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
      candidates.push(rawText.slice(objStart, objEnd + 1).trim());
    }

    // Try parsing candidates
    let parsed = false;
    for (const candidate of candidates) {
      try {
        detections = JSON.parse(candidate);
        parsed = true;
        if (candidate !== rawText) {
          console.error(
            '[detect_objects_in_image] Successfully parsed JSON after extraction/cleanup'
          );
        }
        break;
      } catch {
        // keep trying
      }
    }

    if (!parsed) {
      console.error(
        '[detect_objects_in_image] Failed to parse detection JSON, attempting truncated-array fix...'
      );
      console.error(
        `[detect_objects_in_image] Raw response (first 500 chars): ${rawText.substring(0, 500)}`
      );

      // If it looks like an array but is missing the closing bracket, try truncating
      // to the last complete object and closing the array.
      const best = candidates[0] || rawText;
      if (best.startsWith('[') && !best.endsWith(']')) {
        const lastCompleteObjectIndex = best.lastIndexOf('},');
        if (lastCompleteObjectIndex > 0) {
          const fixedText =
            best.substring(0, lastCompleteObjectIndex + 1) + '\n]';
          try {
            detections = JSON.parse(fixedText);
            parsed = true;
            console.error(
              `[detect_objects_in_image] Successfully parsed truncated JSON after fix. Objects found: ${detections.length}`
            );
          } catch (parseError) {
            throw new VisionError(
              `Failed to parse detection results as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Raw response (first 500 chars): ${rawText.substring(0, 500)}`,
              'PARSE_ERROR',
              config.IMAGE_PROVIDER,
              parseError instanceof Error ? parseError : undefined
            );
          }
        }
      }

      if (!parsed) {
        throw new VisionError(
          `Failed to parse detection results as JSON. Raw response (first 500 chars): ${rawText.substring(0, 500)}`,
          'PARSE_ERROR',
          config.IMAGE_PROVIDER
        );
      }
    }

    console.error(
      `[detect_objects_in_image] Detected ${detections.length} objects`
    );

    // Validate and filter detections with valid normalized coordinates
    const processedDetections = detections
      .map((detection: any) => {
        if (
          !detection.normalized_box_2d ||
          !Array.isArray(detection.normalized_box_2d) ||
          detection.normalized_box_2d.length !== 4
        ) {
          console.error(
            `[detect_objects_in_image] Skipping detection with invalid coordinates: ${JSON.stringify(detection)}`
          );
          return null;
        }

        const [normY1, normX1, normY2, normX2] = detection.normalized_box_2d;

        // Validate coordinate ranges (should be 0-1000)
        if (
          normY1 < 0 ||
          normX1 < 0 ||
          normY2 > 1000 ||
          normX2 > 1000 ||
          normY1 >= normY2 ||
          normX1 >= normX2
        ) {
          console.error(
            `[detect_objects_in_image] Skipping detection with invalid coordinate ranges: ${detection.object} [${normY1}, ${normX1}, ${normY2}, ${normX2}]`
          );
          return null;
        }

        // Validate confidence score (should be 0-1)
        const confidence =
          typeof detection.confidence === 'number' ? detection.confidence : 0.5;
        if (confidence < 0 || confidence > 1) {
          console.error(
            `[detect_objects_in_image] Invalid confidence score for ${detection.object}: ${confidence}, clamping to 0-1 range`
          );
        }

        // Return detection object with confidence
        return {
          object: detection.object,
          label: detection.label,
          normalized_box_2d: detection.normalized_box_2d,
          confidence: Math.max(0, Math.min(1, confidence)),
        };
      })
      .filter(Boolean) as DetectedObject[];

    // Draw annotations on image
    const annotator = new ImageAnnotator();
    const annotatedImageBuffer = await annotator.drawAnnotations(
      originalImageBuffer,
      processedDetections,
      imageWidth,
      imageHeight
    );

    const annotatedImageSize = annotatedImageBuffer.length;

    // Determine output format from original image source (best-effort)
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

    // Annotator encodes PNG by default; align metadata with actual output.
    outputFormat = 'png';

    console.error(
      `[detect_objects_in_image] Annotated image size: ${annotatedImageSize} bytes`
    );

    // Generate human-readable text summary with percentage coordinates
    const imageMetadata = {
      width: imageWidth,
      height: imageHeight,
      size_bytes: originalImageBuffer.length,
      format: outputFormat,
    };
    const summary = generateDetectionSummary(
      processedDetections,
      imageMetadata,
      'AI Vision Model', // Use generic model name since result.model doesn't exist
      config.IMAGE_PROVIDER
    );

    console.error(
      `[detect_objects_in_image] Generated text summary (${summary.length} characters)`
    );

    // Create enhanced metadata from result
    const detectionMetadata: ObjectDetectionMetadata = {
      model: result.metadata?.model || 'unknown',
      provider: result.metadata?.provider || config.IMAGE_PROVIDER,
      usage: result.metadata?.usage,
      processingTime: result.metadata?.processingTime || 0,
      fileType: 'image/' + outputFormat,
      fileSize: originalImageBuffer.length,
      modelVersion: result.metadata?.modelVersion,
      responseId: result.metadata?.responseId,
      fileSaveStatus: 'saved', // Default, will be overridden if file save fails
      coordinateScale: 1000,
      coordinateFormat: '[ymin, xmin, ymax, xmax]',
      coordinateOrigin: 'top-left',
    };

    // 2-step workflow for image file handling
    if (args.outputFilePath) {
      // Step 1: Explicit outputFilePath provided → Save to exact path
      await annotator.saveToExplicitPath(
        args.outputFilePath,
        annotatedImageBuffer
      );
      console.error(
        `[detect_objects_in_image] Annotated image saved to: ${args.outputFilePath}`
      );

      const response: DetectionWithFile = {
        detections: processedDetections,
        file: {
          path: path.resolve(args.outputFilePath),
          size_bytes: annotatedImageSize,
          format: outputFormat,
        },
        image_metadata: {
          width: imageWidth,
          height: imageHeight,
          original_size: originalImageBuffer.length,
          viewport:
            args.viewportWidth && args.viewportHeight
              ? {
                  width: args.viewportWidth,
                  height: args.viewportHeight,
                }
              : undefined,
        },
        summary: summary,
        metadata: detectionMetadata,
      };

      return response;
    } else {
      // Step 2: No explicit path → Try temp file, skip on permission error
      const saveResult = await annotator.saveToTempFileOrSkip(
        annotatedImageBuffer,
        outputFormat
      );

      if (saveResult.method === 'temp_file') {
        // Success: Return temp file response
        console.error(
          `[detect_objects_in_image] Image saved to temp: ${saveResult.path}`
        );

        const response: DetectionWithTempFile = {
          detections: processedDetections,
          tempFile: {
            path: saveResult.path,
            size_bytes: annotatedImageSize,
            format: outputFormat,
          },
          image_metadata: {
            width: imageWidth,
            height: imageHeight,
            original_size: originalImageBuffer.length,
            viewport:
              args.viewportWidth && args.viewportHeight
                ? {
                    width: args.viewportWidth,
                    height: args.viewportHeight,
                  }
                : undefined,
          },
          summary: summary,
          metadata: detectionMetadata,
        };
        return response;
      } else {
        // Permission error: Return detection data only with updated metadata
        console.error(
          `[detect_objects_in_image] Returning detection results without file output due to permission error.`
        );

        const response: DetectionOnly = {
          detections: processedDetections,
          image_metadata: {
            width: imageWidth,
            height: imageHeight,
            original_size: originalImageBuffer.length,
            viewport:
              args.viewportWidth && args.viewportHeight
                ? {
                    width: args.viewportWidth,
                    height: args.viewportHeight,
                  }
                : undefined,
          },
          summary: summary,
          metadata: {
            ...detectionMetadata,
            fileSaveStatus: 'skipped_due_to_permissions',
          },
        };
        return response;
      }
    }
  } catch (error) {
    console.error('Error in detect_objects_in_image tool:', error);

    if (error instanceof VisionError) {
      throw error;
    }

    throw new VisionError(
      `Failed to detect objects in image: ${error instanceof Error ? error.message : String(error)}`,
      'DETECTION_ERROR',
      config.IMAGE_PROVIDER,
      error instanceof Error ? error : undefined
    );
  }
}
