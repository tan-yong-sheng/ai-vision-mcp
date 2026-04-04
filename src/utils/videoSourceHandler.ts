/**
 * Shared video source handling utilities for providers
 * Eliminates duplication between GeminiProvider and VertexAIProvider
 */

import fs from 'fs/promises';
import fetch from 'node-fetch';
import { isYouTubeUrl } from './youtube.js';
import { NetworkError } from '../types/Errors.js';

export interface ProcessedVideoSource {
  fileUri: string;
  mimeType: string;
  uploadDuration: number;
  isInlineData: boolean;
}

/**
 * Get video MIME type from URL extension
 */
export function getVideoMimeTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv',
    '3gp': 'video/3gpp',
    m4v: 'video/mp4',
  };
  return mimeTypes[extension || ''] || 'video/mp4';
}

/**
 * Detect video MIME type from buffer (file signature)
 */
export function getVideoMimeType(source: string, buffer: Buffer): string {
  // Try to detect from file extension
  const extension = source.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv',
    '3gp': 'video/3gpp',
    m4v: 'video/mp4',
  };

  if (extension && mimeTypes[extension]) {
    return mimeTypes[extension];
  }

  // Simple detection based on file signature
  const signatures: Record<string, string> = {
    'video/mp4': '\x00\x00\x00\x18ftypmp42',
    'video/webm': '\x1a\x45\xdf\xa3',
    'video/avi': 'RIFF',
    'video/mov': '\x00\x00\x00\x14ftyp',
  };

  for (const [mimeType, signature] of Object.entries(signatures)) {
    if (buffer.slice(0, signature.length).toString() === signature) {
      return mimeType;
    }
  }

  return 'video/mp4'; // Default fallback
}

/**
 * Read a local video file
 */
export async function readLocalVideoFile(
  filePath: string
): Promise<{ buffer: Buffer; duration: number }> {
  const startTime = Date.now();
  try {
    const buffer = await fs.readFile(filePath);
    const duration = Date.now() - startTime;
    return { buffer, duration };
  } catch (error) {
    throw new NetworkError(
      `Failed to read local video file: ${filePath}`
    );
  }
}

/**
 * Download a remote video file
 */
export async function downloadRemoteVideoFile(
  url: string
): Promise<{ buffer: Buffer; duration: number }> {
  const startTime = Date.now();
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new NetworkError(
        `Failed to fetch video from URL: ${url}`
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
      `Failed to download video from URL: ${url}`
    );
  }
}

/**
 * Process a video source and return standardized format
 * Handles: GCS URIs, HTTP URLs, YouTube URLs, local files, inline data, and data URIs
 */
export async function processVideoSource(
  videoSource: string
): Promise<ProcessedVideoSource> {
  let uploadDuration = 0;

  // Inline data URI - pass through directly
  if (videoSource.startsWith('data:video/')) {
    const matches = videoSource.match(/^data:video\/([a-zA-Z0-9\-+.]+);base64,(.+)$/);
    if (matches) {
      const mimeType = `video/${matches[1]}`;
      return {
        fileUri: videoSource,
        mimeType,
        uploadDuration: 0,
        isInlineData: true,
      };
    }
  }

  // GCS URI - pass through directly
  if (videoSource.startsWith('gs://')) {
    return {
      fileUri: videoSource,
      mimeType: getVideoMimeTypeFromUrl(videoSource),
      uploadDuration: 0,
      isInlineData: false,
    };
  }

  // File reference (Gemini Files API)
  if (videoSource.startsWith('files/')) {
    return {
      fileUri: videoSource,
      mimeType: 'video/mp4',
      uploadDuration: 0,
      isInlineData: false,
    };
  }

  // HTTP URL
  if (videoSource.startsWith('http')) {
    // YouTube URLs can be passed directly
    if (isYouTubeUrl(videoSource)) {
      return {
        fileUri: videoSource,
        mimeType: 'video/mp4',
        uploadDuration: 0,
        isInlineData: false,
      };
    }

    // Other HTTP URLs - download and inline as base64
    const { buffer, duration } = await downloadRemoteVideoFile(videoSource);
    const mimeType = getVideoMimeType(videoSource, buffer);
    uploadDuration = duration;

    return {
      fileUri: `data:${mimeType};base64,${buffer.toString('base64')}`,
      mimeType,
      uploadDuration,
      isInlineData: true,
    };
  }

  // Local file - read and inline as base64
  const { buffer, duration } = await readLocalVideoFile(videoSource);
  const mimeType = getVideoMimeType(videoSource, buffer);
  uploadDuration = duration;

  return {
    fileUri: `data:${mimeType};base64,${buffer.toString('base64')}`,
    mimeType,
    uploadDuration,
    isInlineData: true,
  };
}
