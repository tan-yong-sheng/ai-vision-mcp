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
import { ConfigService } from './ConfigService.js';
import {
  FileUploadError,
  UnsupportedFileTypeError,
  FileSizeExceededError,
} from '../types/Errors.js';

export class FileService {
  private uploadStrategy: FileUploadStrategy;
  private configService: ConfigService;

  constructor(
    configService: ConfigService,
    type: 'image' | 'video',
    visionProvider: GeminiProvider
  ) {
    this.configService = configService;
    this.uploadStrategy = FileUploadFactory.createStrategy(
      configService.getConfig(),
      type,
      visionProvider
    );
  }

  async handleImageSource(imageSource: string): Promise<string> {
    console.log(`[FileService] handleImageSource input: ${imageSource.substring(0, 100)}${imageSource.length > 100 ? '...' : ''}`);

    // If it's already a file reference, return as-is
    if (imageSource.startsWith('files/') || imageSource.includes('generativelanguage.googleapis.com')) {
      console.log(`[FileService] Returning existing file reference`);
      return imageSource;
    }

    // If it's a GCS URI, return as-is
    if (this.isGcsUri(imageSource)) {
      console.log(`[FileService] Returning GCS URI`);
      return imageSource;
    }

    // Get the image data and size regardless of source
    const { buffer, mimeType, filename } = await this.getImageData(imageSource);

    // Choose processing method based on size threshold
    const threshold = this.configService.getGeminiFilesApiThreshold();
    console.log(`[FileService] Buffer size: ${buffer.length}, Threshold: ${threshold}`);

    if (buffer.length <= threshold) {
      // Use inline data for small images
      const result = `data:${mimeType};base64,${buffer.toString('base64')}`;
      console.log(`[FileService] Returning inline data URL: ${result.substring(0, 100)}...`);
      return result;
    } else {
      // Use Files API for large images
      const result = await this.uploadFile(buffer, filename || `image.${this.getFileExtension(mimeType)}`, mimeType);
      console.log(`[FileService] Returning file URI: ${result}`);
      return result;
    }
  }

  async handleVideoSource(videoSource: string): Promise<string> {
    // If it's already a public URL or GCS URI, return as-is
    if (this.isPublicUrl(videoSource) || this.isGcsUri(videoSource)) {
      return videoSource;
    }

    // If it's a local file path, upload to storage
    if (this.isLocalFilePath(videoSource)) {
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

  private async getImageData(imageSource: string): Promise<{
    buffer: Buffer;
    mimeType: string;
    filename?: string;
  }> {
    if (imageSource.startsWith('data:image/')) {
      // Handle base64 data
      const matches = imageSource.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches) {
        throw new FileUploadError('Invalid base64 image format');
      }
      const mimeType = `image/${matches[1]}`;
      const buffer = Buffer.from(matches[2], 'base64');
      return { buffer, mimeType, filename: `image.${matches[1]}` };
    }

    if (this.isPublicUrl(imageSource)) {
      // Handle URL images
      try {
        // Decode URL-encoded characters to handle escaped sequences like \&
        const decodedUrl = imageSource.replace(/\\&/g, '&');
        console.log(`[FileService] Fetching URL: ${decodedUrl}`);

        const response = await fetch(decodedUrl);
        if (!response.ok) {
          throw new FileUploadError(`Failed to fetch image from URL: ${decodedUrl} (Status: ${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const filename = decodedUrl.split('/').pop() || 'image.jpg';
        const mimeType = this.getMimeType(filename, buffer);
        console.log(`[FileService] Successfully fetched image - size: ${buffer.length}, mimeType: ${mimeType}`);
        return { buffer, mimeType, filename };
      } catch (error) {
        console.error(`[FileService] Error fetching URL:`, error);
        throw new FileUploadError(
          `Failed to download image from URL: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (this.isLocalFilePath(imageSource)) {
      // Handle local files
      try {
        const normalizedPath = path.normalize(imageSource);
        await fs.access(normalizedPath);
        const buffer = await fs.readFile(normalizedPath);
        const filename = path.basename(normalizedPath);
        const mimeType = this.getMimeType(filename, buffer);
        return { buffer, mimeType, filename };
      } catch (error) {
        throw new FileUploadError(
          `Failed to read local file ${imageSource}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    throw new FileUploadError(`Invalid image source format: ${imageSource}`);
  }

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
    _type: 'image' | 'video'
  ): Promise<string> {
    try {
      // Normalize file path for cross-platform compatibility
      const normalizedPath = path.normalize(filePath);

      // Check if file exists
      await fs.access(normalizedPath);

      // Read file
      const buffer = await fs.readFile(normalizedPath);
      const filename = path.basename(normalizedPath);

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

  private isLocalFilePath(filePath: string): boolean {
    // Unix/Linux paths
    if (filePath.startsWith('/') || filePath.startsWith('./') || filePath.startsWith('../')) {
      return true;
    }

    // Windows paths
    // Check for drive letter pattern (e.g., "C:\", "D:/", etc.)
    if (/^[a-zA-Z]:[\\/]/.test(filePath)) {
      return true;
    }

    // Check for UNC paths (e.g., "\\server\share")
    if (filePath.startsWith('\\\\')) {
      return true;
    }

    // Check for relative paths with backslashes (Windows-style)
    if (filePath.includes('\\') && (filePath.startsWith('.\\') || filePath.startsWith('..\\'))) {
      return true;
    }

    return false;
  }

  
  private isSupportedFileType(mimeType: string): boolean {
    const allowedImageTypes = this.configService.getAllowedImageFormats();
    const allowedVideoTypes = this.configService.getAllowedVideoFormats();

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
    const imageTypes = this.configService.getAllowedImageFormats();
    const videoTypes = this.configService.getAllowedVideoFormats();
    return [...imageTypes, ...videoTypes];
  }

  private getMaxFileSize(mimeType: string): number {
    if (mimeType.startsWith('image/')) {
      return this.configService.getMaxImageSize();
    }

    if (mimeType.startsWith('video/')) {
      return this.configService.getMaxVideoSize();
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
    // Check PNG signature
    if (buffer.length >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
      return 'image/png';
    }

    // Check JPEG signature
    if (buffer.length >= 3 &&
        buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }

    // Check GIF signatures
    if (buffer.length >= 6) {
      const header = buffer.slice(0, 6).toString('ascii');
      if (header === 'GIF87a' || header === 'GIF89a') {
        return 'image/gif';
      }
    }

    // Check WebP signature (RIFF....WEBP)
    if (buffer.length >= 12 && buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
        buffer.slice(8, 12).toString('ascii') === 'WEBP') {
      return 'image/webp';
    }

    // Check for video formats
    if (buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === 'RIFF') {
      // This could be AVI or WebM, default to WebM
      return 'video/webm';
    }

    // Check for MP4/MOV (ftyp box)
    if (buffer.length >= 8 && buffer.slice(4, 8).toString('ascii') === 'ftyp') {
      return 'video/mp4';
    }

    return 'application/octet-stream';
  }

  private getFileExtension(mimeType: string): string {
    return FileService.getFileExtension(mimeType);
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
