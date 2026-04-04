/**
 * Media source classification helpers
 */

import { isYouTubeUrl } from './youtube.js';

const MIME_ALIASES: Record<string, string> = {
  'video/quicktime': 'video/mov',
  'video/x-msvideo': 'video/avi',
  'video/x-ms-wmv': 'video/wmv',
  'video/x-mpeg': 'video/mpeg',
  'video/x-mpg': 'video/mpg',
  'video/x-flv': 'video/x-flv',
};

export { isYouTubeUrl };

export function isFileReferenceSource(source: string): boolean {
  return (
    source.startsWith('files/') ||
    source.includes('generativelanguage.googleapis.com')
  );
}

export function isHttpUrl(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

export function isGcsUri(source: string): boolean {
  return source.startsWith('gs://');
}

export function isInlineImageSource(source: string): boolean {
  return source.startsWith('data:image/');
}

export function isInlineVideoSource(source: string): boolean {
  return source.startsWith('data:video/');
}

export function isRemoteVideoUrl(source: string): boolean {
  return isHttpUrl(source) && !isYouTubeUrl(source);
}

export function normalizeMimeType(mimeType: string): string {
  return MIME_ALIASES[mimeType] || mimeType;
}

export function describeMediaSource(source: string): string {
  if (isInlineImageSource(source)) {
    return 'inline-image';
  }

  if (isInlineVideoSource(source)) {
    return 'inline-video';
  }

  if (isFileReferenceSource(source)) {
    return 'file-reference';
  }

  if (isGcsUri(source)) {
    return 'gcs-uri';
  }

  if (isRemoteVideoUrl(source)) {
    return 'remote-http-video';
  }

  if (isHttpUrl(source)) {
    return 'http-url';
  }

  return 'local-file';
}
