/**
 * Shared image source handling utilities for providers
 * Eliminates duplication between GeminiProvider and VertexAIProvider
 */

import fs from 'fs/promises';
import fetch from 'node-fetch';
import { NetworkError } from '../types/Errors.js';

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

  // Simple detection based on file signature
  const signatures: Record<string, string> = {
    'image/png': '\x89PNG\r\n\x1a\n',
    'image/jpeg': '\xff\xd8\xff',
    'image/gif': 'GIF87a',
    'image/webp': 'RIFF',
  };

  if (buffer) {
    for (const [mimeType, signature] of Object.entries(signatures)) {
      if (buffer.slice(0, signature.length).toString() === signature) {
        return mimeType;
      }
    }
  }

  return 'image/jpeg'; // Default fallback
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
