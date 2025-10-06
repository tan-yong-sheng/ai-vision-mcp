/**
 * Google Cloud Storage provider implementation using native GCS SDK
 */

import { Storage, Bucket, File } from '@google-cloud/storage';
import { StorageProvider, StorageFile } from '../../types/Storage.js';
import { StorageError } from '../../types/Errors.js';
import type { GCSConfig } from '../../types/Config.js';

export class GCSStorageProvider implements StorageProvider {
  private storage: Storage;
  private bucket: Bucket;
  private config: GCSConfig;

  constructor(config: GCSConfig) {
    this.config = config;

    // Initialize native GCS Storage client
    this.storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.credentials,
    });

    this.bucket = this.storage.bucket(config.bucketName);
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<StorageFile> {
    try {
      const key = this.generateKey(filename);
      const file: File = this.bucket.file(key);

      await file.save(buffer, {
        contentType: mimeType,
        metadata: {
          cacheControl: 'public, max-age=31536000', // 1 year
        },
      });

      // Get the file metadata
      const [metadata] = await file.getMetadata();

      return {
        id: key,
        filename,
        mimeType,
        size: buffer.length,
        url: `gs://${this.config.bucketName}/${key}`,
        lastModified: metadata.updated || new Date().toISOString(),
        etag: metadata.etag || this.generateETag(buffer),
      };
    } catch (error) {
      throw new StorageError(
        `Failed to upload file to GCS: ${error instanceof Error ? error.message : String(error)}`,
        'gcs',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const file: File = this.bucket.file(fileId);
      const [buffer] = await file.download();
      return buffer;
    } catch (error) {
      throw new StorageError(
        `Failed to download file from GCS: ${error instanceof Error ? error.message : String(error)}`,
        'gcs',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const file: File = this.bucket.file(fileId);
      await file.delete();
    } catch (error) {
      // Don't throw error if file doesn't exist (404)
      if (error instanceof Error && error.message.includes('No such object')) {
        return;
      }
      throw new StorageError(
        `Failed to delete file from GCS: ${error instanceof Error ? error.message : String(error)}`,
        'gcs',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async getPublicUrl(fileId: string): Promise<string> {
    // Return GCS URI format (gs://bucket/path)
    return `gs://${this.config.bucketName}/${fileId}`;
  }

  async getSignedUrl(fileId: string, expiresIn: number): Promise<string> {
    try {
      const file: File = this.bucket.file(fileId);
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresIn * 1000, // Convert seconds to milliseconds
      });
      return signedUrl;
    } catch (error) {
      throw new StorageError(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : String(error)}`,
        'gcs',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async listFiles(prefix?: string): Promise<StorageFile[]> {
    try {
      const [files] = await this.bucket.getFiles({ prefix });
      const storageFiles: StorageFile[] = [];

      for (const file of files) {
        const [metadata] = await file.getMetadata();
        const filename = file.name.split('/').pop() || file.name;

        storageFiles.push({
          id: file.name,
          filename,
          mimeType: metadata.contentType || 'application/octet-stream',
          size: parseInt(String(metadata.size || '0'), 10),
          url: `gs://${this.config.bucketName}/${file.name}`,
          lastModified: metadata.updated || new Date().toISOString(),
          etag: metadata.etag || '',
        });
      }

      return storageFiles;
    } catch (error) {
      throw new StorageError(
        `Failed to list files from GCS: ${error instanceof Error ? error.message : String(error)}`,
        'gcs',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Private helper methods

  private generateKey(filename: string): string {
    // Generate a unique key with timestamp and random UUID
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = filename.includes('.')
      ? `.${filename.split('.').pop()}`
      : '';

    // Organize files by date and type
    const type = this.getFileType(filename);
    return `${type}/${timestamp}/${randomId}${extension}`;
  }

  private getFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();

    if (
      [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'bmp',
        'webp',
        'tiff',
        'heic',
        'heif',
      ].includes(extension || '')
    ) {
      return 'images';
    } else if (
      ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'm4v'].includes(
        extension || ''
      )
    ) {
      return 'videos';
    } else {
      return 'files';
    }
  }

  private generateETag(buffer: Buffer): string {
    // Simple hash generation - in production, you might want to use a proper hash function
    const hash = Buffer.from(buffer).toString('base64').substring(0, 32);
    return `"${hash}"`;
  }

  // Configuration methods

  public getBucket(): string {
    return this.config.bucketName;
  }

  public getProjectId(): string {
    return this.config.projectId;
  }

  public getRegion(): string {
    return this.config.region;
  }
}
