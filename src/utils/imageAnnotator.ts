/**
 * Image annotation utilities using ImageScript
 * Based on gemini_object_detection.js annotation logic
 */

import { Image, TextLayout } from 'imagescript';
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
   * Draw bounding boxes and labels on image using ImageScript
   */
  async drawAnnotations(
    imageBuffer: Buffer,
    detections: DetectedObject[],
    imageWidth: number,
    imageHeight: number
  ): Promise<Buffer> {
    const image = await Image.decode(imageBuffer);

    // If caller passed dimensions, sanity-check in debug situations; trust decoded image.
    // (We keep the args for backward-compat with existing call sites.)
    void imageWidth;
    void imageHeight;

    for (let idx = 0; idx < detections.length; idx++) {
      const detection = detections[idx];

      if (
        !detection.normalized_box_2d ||
        detection.normalized_box_2d.length !== 4
      ) {
        console.error(
          `[ImageAnnotator] Skipping detection without valid normalized_box_2d: ${detection.object}`
        );
        continue;
      }

      const [normY1, normX1, normY2, normX2] = detection.normalized_box_2d;
      const x1 = Math.round((normX1 / 1000) * image.width);
      const y1 = Math.round((normY1 / 1000) * image.height);
      const x2 = Math.round((normX2 / 1000) * image.width);
      const y2 = Math.round((normY2 / 1000) * image.height);

      // Clamp to image bounds
      const left = Math.max(0, Math.min(x1, image.width - 1));
      const top = Math.max(0, Math.min(y1, image.height - 1));
      const right = Math.max(0, Math.min(x2, image.width));
      const bottom = Math.max(0, Math.min(y2, image.height));

      // Draw rectangle outline by painting 4 thin filled rectangles
      this.drawRectOutline(
        image,
        left,
        top,
        Math.max(1, right - left),
        Math.max(1, bottom - top),
        this.options.lineWidth,
        this.parseColor(this.options.lineColor)
      );

      // Label text (requires a font buffer)
      const labelText = `${detection.object} - ${detection.label}`;
      await this.drawLabel(image, labelText, left, top);
    }

    // Encode as PNG for consistent output
    return Buffer.from(await image.encode());
  }

  private parseColor(color: string): number {
    // ImageScript expects 0xRRGGBBAA
    switch (color.toLowerCase()) {
      case 'red':
        return 0xff0000ff;
      case 'green':
        return 0x00ff00ff;
      case 'blue':
        return 0x0000ffff;
      case 'yellow':
        return 0xffff00ff;
      case 'black':
        return 0x000000ff;
      case 'white':
        return 0xffffffff;
      default:
        // Best-effort fallback
        return 0xff0000ff;
    }
  }

  private drawRectOutline(
    image: Image,
    x: number,
    y: number,
    w: number,
    h: number,
    thickness: number,
    color: number
  ) {
    const t = Math.max(1, thickness);

    // top
    image.drawBox(x, y, w, t, color);
    // left
    image.drawBox(x, y, t, h, color);
    // right
    image.drawBox(Math.max(0, x + w - t), y, t, h, color);
    // bottom
    image.drawBox(x, Math.max(0, y + h - t), w, t, color);
  }

  private async drawLabel(image: Image, text: string, x1: number, y1: number) {
    const fontBuffer = await this.loadFontBuffer();
    if (!fontBuffer) {
      // Graceful degradation: boxes only.
      console.error(
        '[ImageAnnotator] No font available for label rendering; drawing boxes only. Set ANNOTATION_FONT_PATH or install bundled font.'
      );
      return;
    }

    const scale = 16; // px font size
    const paddingX = 6;
    const paddingY = 4;

    const layout = new TextLayout({
      maxWidth: Math.min(600, image.width - x1),
      maxHeight: this.options.labelHeight,
      wrapStyle: 'word',
      // NOTE: ImageScript's types invert the naming here:
      // - verticalAlign controls left/center/right
      // - horizontalAlign controls top/middle/bottom
      verticalAlign: 'left',
      horizontalAlign: 'top',
      wrapHardBreaks: true,
    });

    const textImage = await Image.renderText(
      fontBuffer,
      scale,
      text,
      0xffffffff,
      layout
    );

    const bgColor = this.parseColor(this.options.labelColor);
    const labelW = Math.min(
      image.width - x1,
      textImage.width + paddingX * 2
    );
    const labelH = Math.min(
      image.height,
      Math.max(this.options.labelHeight, textImage.height + paddingY * 2)
    );

    const labelX = x1;
    const labelY = Math.max(y1 - labelH - 4, 0);

    image.drawBox(labelX, labelY, labelW, labelH, bgColor);

    // Composite text with padding
    image.composite(textImage, labelX + paddingX, labelY + paddingY);
  }

  private async loadFontBuffer(): Promise<Buffer | null> {
    const candidates: string[] = [];

    // 1) Explicit env
    if (process.env.ANNOTATION_FONT_PATH) {
      candidates.push(process.env.ANNOTATION_FONT_PATH);
    }

    // 2) Bundled font (to be added)
    candidates.push(path.join(process.cwd(), 'assets', 'fonts', 'Roboto-Regular.ttf'));

    // 3) System fallbacks (best effort)
    candidates.push('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
    candidates.push('/System/Library/Fonts/Arial.ttf');
    candidates.push('C:/Windows/Fonts/arial.ttf');

    for (const fontPath of candidates) {
      try {
        const buf = await fs.readFile(fontPath);
        return buf;
      } catch {
        // try next
      }
    }

    return null;
  }

  // Legacy overlay helpers removed

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
      console.error(
        `[ImageAnnotator] Skipped temp file creation due to permission error: ${errorMessage}. Detection results will be returned without file output.`
      );
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
