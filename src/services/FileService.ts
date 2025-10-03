/**
 * File service for handling image and video sources
 */

import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import type { Config } from '../types/Config.js';
import type { FileUploadStrategy } from '../types/Providers.js';
import { FileUploadFactory } from '../file-upload/factory/FileUploadFactory.js';
import { GeminiProvider } from '../providers/gemini/GeminiProvider.js';
import {
  FileUploadError,
  UnsupportedFileTypeError,
  FileSizeExceededError,
} from '../types/Errors.js';

export class FileService {
  private uploadStrategy: FileUploadStrategy;
  private config: Config;

  constructor(
    config: Config,
    type: 'image' | 'video',
    visionProvider: GeminiProvider
  ) {
    this.config = config;
    this.uploadStrategy = FileUploadFactory.createStrategy(
      config,
      type,
      visionProvider
    );
  }

  async handleImageSource(imageSource: string): Promise<string> {
    // If it's already a public URL or GCS URI, return as-is
    if (this.isPublicUrl(imageSource) || this.isGcsUri(imageSource)) {
      return imageSource;
    }

    // If it's base64 data, process it
    if (imageSource.startsWith('data:image/')) {
      return await this.handleBase64Image(imageSource);
    }

    // If it's a local file path, upload to storage
    if (
      imageSource.startsWith('/') ||
      imageSource.startsWith('./') ||
      imageSource.startsWith('../')
    ) {
      return await this.handleLocalFile(imageSource, 'image');
    }

    // If it's a file reference (files/...), return as-is
    if (imageSource.startsWith('files/')) {
      return imageSource;
    }

    throw new FileUploadError(`Invalid image source format: ${imageSource}`);
  }

  async handleVideoSource(videoSource: string): Promise<string> {
    // If it's already a public URL or GCS URI, return as-is
    if (this.isPublicUrl(videoSource) || this.isGcsUri(videoSource)) {
      return videoSource;
    }

    // If it's a local file path, upload to storage
    if (
      videoSource.startsWith('/') ||
      videoSource.startsWith('./') ||
      videoSource.startsWith('../')
    ) {
      return await this.handleLocalFile(videoSource, 'video');
    }

    // If it's a file reference (files/...), return as-is
    if (videoSource.startsWith('files/')) {
      return videoSource;
    }

    throw new FileUploadError(`Invalid video source format: ${videoSource}`);
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<string> {
    // Validate file size
    const maxSize = this.getMaxFileSize(mimeType);
    if (buffer.length > maxSize) {
      throw new FileSizeExceededError(buffer.length, maxSize);
    }

    // Validate file type
    if (!this.isSupportedFileType(mimeType)) {
      throw new UnsupportedFileTypeError(
        mimeType,
        this.getSupportedFileTypes()
      );
    }

    const uploadedFile = await this.uploadStrategy.uploadFile(
      buffer,
      filename,
      mimeType
    );
    const fileReference =
      await this.uploadStrategy.getFileForAnalysis(uploadedFile);

    return fileReference.type === 'file_uri'
      ? fileReference.uri || ''
      : fileReference.url || '';
  }

  async cleanup(fileId: string): Promise<void> {
    if (this.uploadStrategy.cleanup) {
      await this.uploadStrategy.cleanup(fileId);
    }
  }

  // Private helper methods

  private async handleBase64Image(base64Data: string): Promise<string> {
    try {
      // Extract the base64 content and MIME type
      const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches) {
        throw new FileUploadError('Invalid base64 image format');
      }

      const mimeType = `image/${matches[1]}`;
      const buffer = Buffer.from(matches[2], 'base64');

      return await this.uploadFile(buffer, `image.${matches[1]}`, mimeType);
    } catch (error) {
      throw new FileUploadError(
        `Failed to process base64 image: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async handleLocalFile(
    filePath: string,
    type: 'image' | 'video'
  ): Promise<string> {
    try {
      // Check if file exists
      await fs.access(filePath);

      // Read file
      const buffer = await fs.readFile(filePath);
      const filename = path.basename(filePath);

      // Determine MIME type
      const mimeType = this.getMimeType(filename, buffer);

      return await this.uploadFile(buffer, filename, mimeType);
    } catch (error) {
      if (error instanceof FileUploadError) {
        throw error;
      }
      throw new FileUploadError(
        `Failed to process local file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private isPublicUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  private isGcsUri(uri: string): boolean {
    return uri.startsWith('gs://');
  }

  
  private isSupportedFileType(mimeType: string): boolean {
    const allowedImageTypes = this.config.ALLOWED_IMAGE_FORMATS || [];
    const allowedVideoTypes = this.config.ALLOWED_VIDEO_FORMATS || [];

    if (mimeType.startsWith('image/')) {
      const extension = mimeType.split('/')[1];
      return allowedImageTypes.includes(extension);
    }

    if (mimeType.startsWith('video/')) {
      const extension = mimeType.split('/')[1];
      return allowedVideoTypes.includes(extension);
    }

    return false;
  }

  private getSupportedFileTypes(): string[] {
    const imageTypes = this.config.ALLOWED_IMAGE_FORMATS || [];
    const videoTypes = this.config.ALLOWED_VIDEO_FORMATS || [];
    return [...imageTypes, ...videoTypes];
  }

  private getMaxFileSize(mimeType: string): number {
    if (mimeType.startsWith('image/')) {
      return this.config.MAX_IMAGE_SIZE || 20 * 1024 * 1024; // 20MB default
    }

    if (mimeType.startsWith('video/')) {
      return this.config.MAX_VIDEO_SIZE || 2 * 1024 * 1024 * 1024; // 2GB default
    }

    return 10 * 1024 * 1024; // 10MB default for other types
  }

  private getMimeType(filename: string, buffer?: Buffer): string {
    // Try to determine MIME type from file extension first
    const extension = path.extname(filename).toLowerCase().substring(1);
    const mimeTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      heic: 'image/heic',
      heif: 'image/heif',
      // Videos
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
      flv: 'video/x-flv',
      wmv: 'video/x-ms-wmv',
      '3gp': 'video/3gpp',
      m4v: 'video/x-m4v',
    };

    const mimeType = mimeTypes[extension];
    if (mimeType) {
      return mimeType;
    }

    // If buffer is available, try to determine from file signature
    if (buffer) {
      return this.getMimeTypeFromBuffer(buffer);
    }

    // Default fallback
    return extension.includes('jpg') || extension.includes('jpeg')
      ? 'image/jpeg'
      : 'application/octet-stream';
  }

  private getMimeTypeFromBuffer(buffer: Buffer): string {
    const signatures: Record<string, string> = {
      '\x89PNG\r\n\x1a\n': 'image/png',
      '\xff\xd8\xff': 'image/jpeg',
      GIF87a: 'image/gif',
      GIF89a: 'image/gif',
      RIFF: 'video/webm', // WebM files start with RIFF
      ftyp: 'video/mp4', // MP4 files contain ftyp box
    };

    for (const [signature, mimeType] of Object.entries(signatures)) {
      if (buffer.slice(0, signature.length).toString() === signature) {
        return mimeType;
      }
    }

    return 'application/octet-stream';
  }

  // Static utility methods

  static isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  static isVideoFile(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  static getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff',
      'image/heic': 'heic',
      'image/heif': 'heif',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/x-matroska': 'mkv',
      'video/webm': 'webm',
      'video/x-flv': 'flv',
      'video/x-ms-wmv': 'wmv',
      'video/3gpp': '3gp',
      'video/x-m4v': 'm4v',
    };

    return extensions[mimeType] || 'bin';
  }
}
