/**
 * Image annotation utilities using Sharp
 * Based on gemini_object_detection.js annotation logic
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import type { DetectedObject } from '../types/ObjectDetection.js';

export interface AnnotationOptions {
  lineColor?: string;
  lineWidth?: number;
  labelColor?: string;
  labelHeight?: number;
  // REMOVED: pointColor and pointRadius (corner circles no longer used)
}

export class ImageAnnotator {
  private options: Required<AnnotationOptions>;

  constructor(options: AnnotationOptions = {}) {
    this.options = {
      lineColor: options.lineColor || 'red',
      lineWidth: options.lineWidth || 3,
      labelColor: options.labelColor || 'red',
      labelHeight: options.labelHeight || 20,
      // REMOVED: pointColor and pointRadius initialization (corner circles no longer used)
    };
  }

  /**
   * Draw bounding boxes and labels on image using Sharp
   * Adapted from gemini_object_detection.js drawAnnotations function
   */
  async drawAnnotations(
    imageBuffer: Buffer,
    detections: DetectedObject[],
    imageWidth: number,
    imageHeight: number
  ): Promise<Buffer> {
    let sharpImage = sharp(imageBuffer);

    // Prepare overlays for bounding boxes, corners, and text
    const overlays = [];

    for (let idx = 0; idx < detections.length; idx++) {
      const detection = detections[idx];

      // Use normalized_box_2d coordinates (converted to pixels)
      if (
        !detection.normalized_box_2d ||
        detection.normalized_box_2d.length !== 4
      ) {
        console.warn(
          `[ImageAnnotator] Skipping detection without valid normalized_box_2d: ${detection.object}`
        );
        continue;
      }

      // Convert normalized coordinates to pixels
      const [normY1, normX1, normY2, normX2] = detection.normalized_box_2d;
      const x1 = Math.round((normX1 / 1000) * imageWidth); // left edge
      const y1 = Math.round((normY1 / 1000) * imageHeight); // top edge
      const x2 = Math.round((normX2 / 1000) * imageWidth); // right edge
      const y2 = Math.round((normY2 / 1000) * imageHeight); // bottom edge

      // Create rectangle overlay (bounding box)
      const rectOverlay = await this.createRectangleOverlay(
        imageWidth,
        imageHeight,
        x1,
        y1,
        x2,
        y2
      );
      overlays.push({
        input: rectOverlay,
        left: 0,
        top: 0,
      });

      // REMOVED: Corner circles (were causing "double boxing" visual clutter)
      // The 4 corner circles made it appear like buttons were boxed multiple times

      // Create text label
      const text = `${detection.object} - ${detection.label}`;
      const textOverlay = await this.createTextOverlay(text);

      // Calculate text position (above bounding box)
      const textX = x1;
      const textY = Math.max(y1 - this.options.labelHeight - 4, 0);

      overlays.push({
        input: textOverlay,
        left: textX,
        top: textY,
      });
    }

    // Composite all overlays onto the original image
    if (overlays.length > 0) {
      sharpImage = sharpImage.composite(overlays);
    }

    return sharpImage.toBuffer();
  }

  /**
   * Create a rectangle overlay using SVG
   * Adapted from gemini_object_detection.js createRectangleOverlay function
   */
  private async createRectangleOverlay(
    imageWidth: number,
    imageHeight: number,
    x1: number,
    y1: number,
    x2: number,
    y3: number
  ): Promise<Buffer> {
    const rectWidth = x2 - x1;
    const rectHeight = y3 - y1;

    const rectangleBuffer = await sharp({
      create: {
        width: imageWidth,
        height: imageHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="${imageWidth}" height="${imageHeight}">
        <rect x="${x1}" y="${y1}" width="${rectWidth}" height="${rectHeight}"
              fill="none" stroke="${this.options.lineColor}" stroke-width="${this.options.lineWidth}"/>
      </svg>`
          ),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

    return rectangleBuffer;
  }

  // REMOVED: createCircleOverlay method (no longer needed since corner circles removed)

  /**
   * Create a text overlay using Sharp
   * Adapted from gemini_object_detection.js createTextOverlay function
   */
  private async createTextOverlay(text: string): Promise<Buffer> {
    // Try to find a system font, fallback to default
    const fontPaths = [
      'C:/Windows/Fonts/arial.ttf', // Windows
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', // Linux
      '/System/Library/Fonts/Arial.ttf', // macOS
    ];

    let fontfile = undefined;
    for (const fontPath of fontPaths) {
      try {
        await fs.access(fontPath);
        fontfile = fontPath;
        break;
      } catch {
        // Font not found, try next
      }
    }

    // Calculate approximate text width (rough estimate: 8 pixels per character)
    // Add padding for better visual appearance
    const estimatedWidth = Math.max(text.length * 8 + 8, 50); // Minimum 50px width

    const textBuffer = await sharp({
      create: {
        width: estimatedWidth,
        height: this.options.labelHeight,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }, // Red background
      },
    })
      .composite([
        {
          input: {
            text: {
              text: text,
              font: fontfile ? 'Arial' : 'sans-serif',
              fontfile: fontfile,
              rgba: true,
              align: 'left',
            },
          },
          left: 2,
          top: 2,
        },
      ])
      .png()
      .toBuffer();

    return textBuffer;
  }

  /**
   * Save buffer to a temporary file with unique name
   */
  async saveToTempFile(
    buffer: Buffer,
    extension: string = 'png'
  ): Promise<string> {
    const tempDir = os.tmpdir();
    const randomId = crypto.randomBytes(8).toString('hex');
    const filename = `ai-vision-mcp-${randomId}.${extension}`;
    const tempPath = path.join(tempDir, filename);

    await fs.writeFile(tempPath, buffer);
    return tempPath;
  }

  /**
   * Save buffer to temp file, or gracefully skip if permission denied
   */
  async saveToTempFileOrSkip(
    buffer: Buffer,
    extension: string = 'png'
  ): Promise<{ path: string; method: 'temp_file' } | { method: 'skipped' }> {
    try {
      const tempDir = os.tmpdir();
      const randomId = crypto.randomBytes(8).toString('hex');
      const filename = `ai-vision-mcp-${randomId}.${extension}`;
      const tempPath = path.join(tempDir, filename);

      await fs.writeFile(tempPath, buffer);
      return { path: tempPath, method: 'temp_file' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`[ImageAnnotator] Skipped temp file creation due to permission error: ${errorMessage}. Detection results will be returned without file output.`);
      return { method: 'skipped' };
    }
  }

  /**
   * Save buffer to explicit path, ensuring directory exists
   */
  async saveToExplicitPath(filePath: string, buffer: Buffer): Promise<void> {
    const outputDir = path.dirname(filePath);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(filePath, buffer);
  }
}
