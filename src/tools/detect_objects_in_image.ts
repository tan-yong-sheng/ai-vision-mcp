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
  ObjectDetectionMetadata,
} from '../types/ObjectDetection.js';
import { ImageAnnotator } from '../utils/imageAnnotator.js';
import sharp from 'sharp';

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
  (e.g., button, input, a, nav, header, section, h1–h6, p, img, video)
- Otherwise → use general object names based on visual meaning.

STEP 3 - OUTPUT FORMAT:
Return a valid JSON array (no text outside JSON) with:
{
  "object": "<name based on context>",
  "label": "<short description>",
  "normalized_box_2d": [ymin, xmin, ymax, xmax] // normalized (0-1000)
}

Bounding box rules:
- Tightly fit visible area (exclude shadows/whitespace)
- Avoid overlap when separable
- Maintain ymin < ymax and xmin < xmax
- Differentiate duplicates by traits (e.g., color, position)
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
        },
        required: ['object', 'label', 'normalized_box_2d'],
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
        },
        required: ['object', 'label', 'normalized_box_2d'],
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
      const nameHint = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
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
    const nameHint = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
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
  } else if (['nav', 'header', 'footer', 'main', 'section', 'article'].includes(object)) {
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
  imageMetadata: { width: number; height: number; size_bytes: number; format: string },
  model: string,
  provider: string
): string {
  const summary = [];

  // Header with image context
  summary.push(`🖼️ IMAGE ANALYSIS COMPLETE\n`);
  summary.push(`📏 Source Image: ${imageMetadata.width}×${imageMetadata.height} pixels (${imageMetadata.format.toUpperCase()}, ${(imageMetadata.size_bytes / 1024 / 1024).toFixed(1)}MB)`);
  summary.push(`🤖 Detection Model: ${model} (${provider})`);
  summary.push(`📊 Elements Found: ${detections.length} elements detected\n`);

  // Context-aware guidance based on detected elements
  const webElements = ['button', 'input', 'select', 'textarea', 'nav', 'header', 'footer', 'main', 'section', 'article', 'a', 'form', 'label', 'fieldset'];
  const hasWebElements = detections.some(d =>
    webElements.some(webEl => d.object === webEl || d.object.startsWith(webEl + '['))
  );

  if (hasWebElements) {
    // Show web automation guidance for web interfaces
    summary.push(`⚠️ FOR WEB AUTOMATION:`);
    summary.push(`- **RECOMMENDED**: Use CSS selectors for reliable automation (primary approach)`);
    summary.push(`- **REFERENCE ONLY**: Percentage coordinates for spatial context (secondary reference)`);
    summary.push(`- **AVOID**: Direct coordinate-based clicking for automation`);
    summary.push(`- **Technical Note**: Raw coordinates use normalized_box_2d format [ymin, xmin, ymax, xmax] on 0-1000 scale\n`);
  } else {
    // Show general object detection guidance for non-web content
    summary.push(`⚠️ OBJECT DETECTION RESULTS:`);
    summary.push(`- **SPATIAL REFERENCE**: Coordinates show relative positioning within image`);
    summary.push(`- **COORDINATE FORMAT**: normalized_box_2d format [ymin, xmin, ymax, xmax] on 0-1000 scale\n`);
  }

  // Element details with hybrid format
  summary.push(`## 🔍 DETECTED ELEMENTS:\n`);

  detections.forEach((detection, index) => {
    const [ymin, xmin, ymax, xmax] = detection.normalized_box_2d;

    // Convert normalized to percentage (0-1000 → 0-100)
    const centerX = (xmin + xmax) / 2 / 10;  // 78.5%
    const centerY = (ymin + ymax) / 2 / 10;  // 26.7%
    const widthPercent = (xmax - xmin) / 10; // 13.0%
    const heightPercent = (ymax - ymin) / 10; // 4.5%

    // Calculate pixel coordinates
    const pixelBox = {
      x: Math.round((xmin / 1000) * imageMetadata.width),
      y: Math.round((ymin / 1000) * imageMetadata.height),
      width: Math.round(((xmax - xmin) / 1000) * imageMetadata.width),
      height: Math.round(((ymax - ymin) / 1000) * imageMetadata.height),
      centerX: Math.round(((xmin + xmax) / 2 / 1000) * imageMetadata.width),
      centerY: Math.round(((ymin + ymax) / 2 / 1000) * imageMetadata.height)
    };

    // Element header
    summary.push(`### ${index + 1}. ${detection.object} - ${detection.label}`);

    // Only show automation guidance for web elements
    const isWebElement = webElements.some(webEl =>
      detection.object === webEl || detection.object.startsWith(webEl + '[')
    );

    if (isWebElement) {
      // Generate CSS selector suggestions for web elements
      const selectors = suggestCSSSelectors(detection);
      summary.push(`- **Automation**: ${selectors.map(s => `\`${s}\``).join(' or ')}`);
    }

    // Always show position for spatial reference
    summary.push(`- **Position**: ${centerX.toFixed(1)}% across, ${centerY.toFixed(1)}% down (${widthPercent.toFixed(1)}% × ${heightPercent.toFixed(1)}% size)`);

    // Always show pixel information
    summary.push(`- **Pixels**: ${pixelBox.width}×${pixelBox.height} at (${pixelBox.x}, ${pixelBox.y}), center (${pixelBox.centerX}, ${pixelBox.centerY})\n`);
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
    console.log(
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

    // Get image dimensions using Sharp
    const sharpMetadata = await sharp(originalImageBuffer).metadata();
    // eslint-disable-next-line prefer-const
    imageWidth = sharpMetadata.width || 0;
    // eslint-disable-next-line prefer-const
    imageHeight = sharpMetadata.height || 0;

    if (imageWidth === 0 || imageHeight === 0) {
      throw new VisionError(
        'Unable to determine image dimensions',
        'INVALID_IMAGE'
      );
    }

    console.log(
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

    console.log(
      '[detect_objects_in_image] Analyzing image for object detection...'
    );
    console.log(
      `[detect_objects_in_image] Configuration: temperature=${options.temperature}, topP=${options.topP}, topK=${options.topK}, maxTokens=${options.maxTokens}`
    );

    // Analyze the image for object detection
    const result = await imageProvider.analyzeImage(
      processedImageSource,
      detectionPrompt,
      options
    );

    console.log(
      `[detect_objects_in_image] Response length: ${result.text.length} characters`
    );
    console.log(
      `[detect_objects_in_image] Response ends with: "${result.text.slice(-50)}"`
    );

    // Parse detection results
    let detections: DetectedObject[];
    try {
      // Try to parse the result directly
      detections = JSON.parse(result.text);
    } catch (parseError) {
      console.log(
        `[detect_objects_in_image] Initial JSON parse failed, attempting cleanup...`
      );
      console.log(
        `[detect_objects_in_image] Raw response (first 500 chars): ${result.text.substring(0, 500)}`
      );
      console.log(
        `[detect_objects_in_image] Full response length: ${result.text.length} characters`
      );

      // Try to extract JSON from markdown code blocks if present
      let cleanedText = result.text.trim();

      // Remove markdown code fences if present
      if (cleanedText.startsWith('```')) {
        const lines = cleanedText.split('\n');
        // Remove first line (```json or ```)
        lines.shift();
        // Remove last line if it's closing fence
        if (lines[lines.length - 1].trim() === '```') {
          lines.pop();
        }
        cleanedText = lines.join('\n').trim();
      }

      // Try parsing the cleaned text
      try {
        detections = JSON.parse(cleanedText);
        console.log(
          `[detect_objects_in_image] Successfully parsed after cleanup`
        );
      } catch (secondError) {
        console.error(
          `[detect_objects_in_image] Failed to parse even after cleanup`
        );
        console.error(
          `[detect_objects_in_image] Cleaned text (first 1000 chars): ${cleanedText.substring(0, 1000)}`
        );

        // Try to fix truncated JSON arrays
        let fixedText = cleanedText;

        // Check if the JSON looks like a truncated array
        if (cleanedText.startsWith('[') && !cleanedText.endsWith(']')) {
          console.log(
            `[detect_objects_in_image] Attempting to fix truncated JSON array...`
          );

          // Find the last complete object by looking for the last complete "},"
          const lastCompleteObjectIndex = cleanedText.lastIndexOf('},');
          if (lastCompleteObjectIndex > 0) {
            // Truncate at the last complete object and close the array
            fixedText = cleanedText.substring(0, lastCompleteObjectIndex + 1) + '\n]';
            console.log(
              `[detect_objects_in_image] Fixed text ends with: "${fixedText.slice(-100)}"`
            );

            try {
              detections = JSON.parse(fixedText);
              console.log(
                `[detect_objects_in_image] Successfully parsed truncated JSON after fix. Objects found: ${detections.length}`
              );
            } catch (thirdError) {
              console.error(
                `[detect_objects_in_image] Failed to parse even after fixing truncated JSON`
              );
              throw new VisionError(
                `Failed to parse detection results as JSON (response appears truncated): ${parseError instanceof Error ? parseError.message : String(parseError)}. Raw response (first 500 chars): ${result.text.substring(0, 500)}. Consider increasing maxTokens parameter.`,
                'PARSE_ERROR',
                config.IMAGE_PROVIDER,
                parseError instanceof Error ? parseError : undefined
              );
            }
          } else {
            throw new VisionError(
              `Failed to parse detection results as JSON (response appears truncated): ${parseError instanceof Error ? parseError.message : String(parseError)}. Raw response (first 500 chars): ${result.text.substring(0, 500)}. Consider increasing maxTokens parameter.`,
              'PARSE_ERROR',
              config.IMAGE_PROVIDER,
              parseError instanceof Error ? parseError : undefined
            );
          }
        } else {
          throw new VisionError(
            `Failed to parse detection results as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Raw response (first 500 chars): ${result.text.substring(0, 500)}`,
            'PARSE_ERROR',
            config.IMAGE_PROVIDER,
            parseError instanceof Error ? parseError : undefined
          );
        }
      }
    }

    console.log(
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
          console.warn(
            `[detect_objects_in_image] Skipping detection with invalid coordinates: ${JSON.stringify(detection)}`
          );
          return null;
        }

        const [normY1, normX1, normY2, normX2] = detection.normalized_box_2d;

        // Validate coordinate ranges (should be 0-1000)
        if (normY1 < 0 || normX1 < 0 || normY2 > 1000 || normX2 > 1000 ||
            normY1 >= normY2 || normX1 >= normX2) {
          console.warn(
            `[detect_objects_in_image] Skipping detection with invalid coordinate ranges: ${detection.object} [${normY1}, ${normX1}, ${normY2}, ${normX2}]`
          );
          return null;
        }

        // Return simplified detection object
        return {
          object: detection.object,
          label: detection.label,
          normalized_box_2d: detection.normalized_box_2d,
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
    // Determine output format from original image
    const outputFormat = sharpMetadata.format || 'png';

    console.log(
      `[detect_objects_in_image] Annotated image size: ${annotatedImageSize} bytes`
    );

    // Generate human-readable text summary with percentage coordinates
    const imageMetadata = {
      width: imageWidth,
      height: imageHeight,
      size_bytes: originalImageBuffer.length,
      format: outputFormat
    };
    const summary = generateDetectionSummary(
      processedDetections,
      imageMetadata,
      'AI Vision Model', // Use generic model name since result.model doesn't exist
      config.IMAGE_PROVIDER
    );

    console.log(
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
    };

    // 2-step workflow for image file handling
    if (args.outputFilePath) {
      // Step 1: Explicit outputFilePath provided → Save to exact path
      await annotator.saveToExplicitPath(
        args.outputFilePath,
        annotatedImageBuffer
      );
      console.log(
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
        },
        summary: summary,
        metadata: detectionMetadata,
      };

      return response;
    } else {
      // Step 2: No explicit path → Auto-save to temp directory (all files)
      const tempPath = await annotator.saveToTempFile(
        annotatedImageBuffer,
        outputFormat
      );
      console.log(
        `[detect_objects_in_image] Image saved to temp: ${tempPath}`
      );

      const response: DetectionWithTempFile = {
        detections: processedDetections,
        tempFile: {
          path: tempPath,
          size_bytes: annotatedImageSize,
          format: outputFormat,
        },
        image_metadata: {
          width: imageWidth,
          height: imageHeight,
          original_size: originalImageBuffer.length,
        },
        summary: summary,
        metadata: detectionMetadata,
      };

      return response;
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
