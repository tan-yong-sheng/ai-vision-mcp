/**
 * MCP Tool: detect_objects_in_image
 * Detects objects in images using AI vision models with bounding box annotations.
 */

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
  DetectionWithInlineImage,
} from '../types/ObjectDetection.js';
import { ImageAnnotator } from '../utils/imageAnnotator.js';
import sharp from 'sharp';

// 2MB threshold for inline vs temp file
const INLINE_THRESHOLD = 2 * 1024 * 1024; // 2MB

// Default object detection prompt (can be overridden)
const DEFAULT_DETECTION_PROMPT = `
You are a precise visual detection assistant.

Your task is to detect all visible objects in the image and return results as a JSON array.
For each detected object, include:
- Output a JSON array of objects, where each entry has:
  {
    "object": "<short name of the detected object>",
    "label": "<short category or descriptive label>",
    "normalized_box_2d": [ymin, xmin, ymax, xmax],  // normalized coordinates (0-1000)
  }

Bounding box requirements:
- Each box must tightly enclose the object's visible area without shadows, whitespace, or background.
- Minimize box overlap when objects are clearly separated.
- When objects physically overlap, boxes should still accurately encompass each object's visible region.
- Ensure ymin < ymax and xmin < xmax for all bounding boxes.

If an object is present multiple times, label them according to unique traits (e.g., color, size, or position).
Return only valid JSON — no code fencing, no text outside the JSON.
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
    const metadata = await sharp(originalImageBuffer).metadata();
    // eslint-disable-next-line prefer-const
    imageWidth = metadata.width || 0;
    // eslint-disable-next-line prefer-const
    imageHeight = metadata.height || 0;

    if (imageWidth === 0 || imageHeight === 0) {
      throw new VisionError(
        'Unable to determine image dimensions',
        'INVALID_IMAGE'
      );
    }

    console.log(
      `[detect_objects_in_image] Image size: ${imageWidth}x${imageHeight}`
    );

    // Prepare detection prompt
    const detectionPrompt = args.prompt || DEFAULT_DETECTION_PROMPT;

    // Merge default options with provided options
    const options: AnalysisOptions = {
      temperature: 0, // Deterministic for object detection
      topP: 0.95,
      topK: 30,
      maxTokens: 8192,
      taskType: 'image',
      functionName: FUNCTION_NAMES.DETECT_OBJECTS_IN_IMAGE,
      // Add structured output configuration for object detection
      responseSchema: createDetectionSchema(config.IMAGE_PROVIDER),
    };

    console.log(
      '[detect_objects_in_image] Analyzing image for object detection...'
    );

    // Analyze the image for object detection
    const result = await imageProvider.analyzeImage(
      processedImageSource,
      detectionPrompt,
      options
    );

    // Parse detection results
    let detections: DetectedObject[];
    try {
      detections = JSON.parse(result.text);
    } catch (parseError) {
      throw new VisionError(
        `Failed to parse detection results as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        'PARSE_ERROR',
        config.IMAGE_PROVIDER,
        parseError instanceof Error ? parseError : undefined
      );
    }

    console.log(
      `[detect_objects_in_image] Detected ${detections.length} objects`
    );

    // Convert normalized coordinates to pixel coordinates
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

        const absY1 = Math.round((normY1 / 1000) * imageHeight);
        const absX1 = Math.round((normX1 / 1000) * imageWidth);
        const absY2 = Math.round((normY2 / 1000) * imageHeight);
        const absX2 = Math.round((normX2 / 1000) * imageWidth);

        // Ensure coordinates are valid (min < max)
        const xMin = Math.min(absX1, absX2);
        const xMax = Math.max(absX1, absX2);
        const yMin = Math.min(absY1, absY2);
        const yMax = Math.max(absY1, absY2);

        // Clamp to image boundaries
        const clampedXMin = Math.max(0, Math.min(xMin, imageWidth));
        const clampedXMax = Math.max(0, Math.min(xMax, imageWidth));
        const clampedYMin = Math.max(0, Math.min(yMin, imageHeight));
        const clampedYMax = Math.max(0, Math.min(yMax, imageHeight));

        // Only add if box has valid area
        if (clampedXMax > clampedXMin && clampedYMax > clampedYMin) {
          const boxInPx = [clampedXMin, clampedYMin, clampedXMax, clampedYMax];

          return {
            object: detection.object,
            label: detection.label,
            normalized_box_2d: detection.normalized_box_2d,
            box_2d_in_px: boxInPx as [number, number, number, number],
          };
        } else {
          console.warn(
            `[detect_objects_in_image] Skipping invalid box for '${detection.object}': [${absY1}, ${absX1}, ${absY2}, ${absX2}]`
          );
          return null;
        }
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
    const outputFormat = args.outputFormat || 'png';

    console.log(
      `[detect_objects_in_image] Annotated image size: ${annotatedImageSize} bytes`
    );

    // 3-step workflow for image file handling
    if (args.filePath) {
      // Step 1: Explicit filePath provided → Save to exact path
      await annotator.saveToExplicitPath(args.filePath, annotatedImageBuffer);
      console.log(
        `[detect_objects_in_image] Annotated image saved to: ${args.filePath}`
      );

      const response: DetectionWithFile = {
        detections: processedDetections,
        file: {
          path: args.filePath,
          size_bytes: annotatedImageSize,
          format: outputFormat,
        },
        image_metadata: {
          width: imageWidth,
          height: imageHeight,
          original_size: originalImageBuffer.length,
        },
      };

      return response;
    } else if (annotatedImageSize >= INLINE_THRESHOLD) {
      // Step 2: Large file (≥2MB) → Auto-save to temp directory
      const tempPath = await annotator.saveToTempFile(
        annotatedImageBuffer,
        outputFormat
      );
      console.log(
        `[detect_objects_in_image] Large image saved to temp: ${tempPath}`
      );

      const response: DetectionWithTempFile = {
        detections: processedDetections,
        tempFile: {
          path: tempPath,
          size_bytes: annotatedImageSize,
          format: outputFormat,
          cleanup_note:
            'This is a temporary file that may be cleaned up automatically.',
        },
        image_metadata: {
          width: imageWidth,
          height: imageHeight,
          original_size: originalImageBuffer.length,
        },
      };

      return response;
    } else {
      // Step 3: Small file (<2MB) → Return inline base64
      const base64Image = annotatedImageBuffer.toString('base64');
      const mimeType = `image/${outputFormat}`;

      console.log(
        `[detect_objects_in_image] Returning inline image (${annotatedImageSize} bytes)`
      );

      const response: DetectionWithInlineImage = {
        detections: processedDetections,
        image: {
          data: base64Image,
          mimeType: mimeType,
          size_bytes: annotatedImageSize,
        },
        image_metadata: {
          width: imageWidth,
          height: imageHeight,
          original_size: originalImageBuffer.length,
        },
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
