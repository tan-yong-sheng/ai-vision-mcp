/**
 * Shared image source handling utilities for providers
 * Eliminates duplication between GeminiProvider and VertexAIProvider
 */

import fs from 'fs/promises';
import fetch from 'node-fetch';
import { NetworkError } from '../types/Errors.js';

export interface ProcessedImageSource {
  fileUri: string;
  mimeType: string;
  isInlineData: boolean;
  processingDuration: number;
}

/**
 * Get image MIME type from URL extension
 */
export function getImageMimeTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
  };
  return mimeTypes[extension || ''] || 'image/jpeg';
}

/**
 * Detect image MIME type from buffer (file signature)
 */
export function getImageMimeType(source: string, buffer?: Buffer): string {
  // Handle data URIs
  if (source.startsWith('data:image/')) {
    return source.split(':')[1].split(';')[0];
  }

  if (buffer) {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47) {
      return 'image/png';
    }

    // JPEG signature: FF D8 FF
    if (buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // GIF signature: 47 49 46 38 (GIF8)
    if (buffer.length >= 4 &&
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38) {
      return 'image/gif';
    }

    // WebP signature: RIFF ... WEBP
    if (buffer.length >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50) {
      return 'image/webp';
    }
  }

  // Fall back to extension-based detection
  return getImageMimeTypeFromUrl(source);
}

/**
 * Read a local image file
 */
export async function readLocalImageFile(
  filePath: string
): Promise<{ buffer: Buffer; duration: number }> {
  const startTime = Date.now();
  try {
    const buffer = await fs.readFile(filePath);
    const duration = Date.now() - startTime;
    return { buffer, duration };
  } catch (error) {
    throw new NetworkError(
      `Failed to read local image file: ${filePath}`
    );
  }
}

/**
 * Download a remote image file
 */
export async function downloadRemoteImageFile(
  url: string
): Promise<{ buffer: Buffer; duration: number }> {
  const startTime = Date.now();
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new NetworkError(
        `Failed to fetch image from URL: ${url}`
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const duration = Date.now() - startTime;
    return { buffer, duration };
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError(
      `Failed to download image from URL: ${url}`
    );
  }
}

/**
 * Process an image source and return standardized format
 * Handles: data URIs, GCS URIs, HTTP URLs, file references, generativelanguage.googleapis.com URIs, and local files
 * Does NOT handle provider-specific uploads (caller decides)
 */
export async function processImageSource(
  imageSource: string
): Promise<ProcessedImageSource> {
  // Validate input
  if (!imageSource || typeof imageSource !== 'string') {
    throw new Error('Invalid image source: must be a non-empty string');
  }

  let processingDuration = 0;

  // Inline data URI - pass through directly
  if (imageSource.startsWith('data:image/')) {
    const matches = imageSource.match(/^data:image\/([a-zA-Z0-9\-+.]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid data URI format: must be data:image/type;base64,<base64-data>');
    }

    const mimeType = `image/${matches[1]}`;
    return {
      fileUri: imageSource,
      mimeType,
      isInlineData: true,
      processingDuration: 0,
    };
  }

  // GCS URI - pass through directly
  if (imageSource.startsWith('gs://')) {
    return {
      fileUri: imageSource,
      mimeType: getImageMimeTypeFromUrl(imageSource),
      isInlineData: false,
      processingDuration: 0,
    };
  }

  // File reference (Gemini Files API)
  if (imageSource.startsWith('files/')) {
    return {
      fileUri: imageSource,
      mimeType: 'image/jpeg',
      isInlineData: false,
      processingDuration: 0,
    };
  }

  // generativelanguage.googleapis.com URI
  if (imageSource.includes('generativelanguage.googleapis.com')) {
    return {
      fileUri: imageSource,
      mimeType: 'image/jpeg',
      isInlineData: false,
      processingDuration: 0,
    };
  }

  // HTTP URL
  if (imageSource.startsWith('http')) {
    const { buffer, duration } = await downloadRemoteImageFile(imageSource);
    const mimeType = getImageMimeType(imageSource, buffer);
    processingDuration = duration;

    return {
      fileUri: `data:${mimeType};base64,${buffer.toString('base64')}`,
      mimeType,
      isInlineData: true,
      processingDuration,
    };
  }

  // Local file - read and inline as base64
  const { buffer, duration } = await readLocalImageFile(imageSource);
  const mimeType = getImageMimeType(imageSource, buffer);
  processingDuration = duration;

  return {
    fileUri: `data:${mimeType};base64,${buffer.toString('base64')}`,
    mimeType,
    isInlineData: true,
    processingDuration,
  };
}
