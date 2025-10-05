/**
 * Google Cloud Storage provider implementation using S3-compatible API
 */

import { S3StorageProvider } from '../base/S3StorageProvider.js';
import {
  StorageProvider,
  StorageFile,
} from '../../types/Storage.js';
import { StorageError } from '../../types/Errors.js';
import type { GCSConfig } from '../../types/Config.js';

export class GCSStorageProvider implements StorageProvider {
  private s3Provider: S3StorageProvider;
  private config: GCSConfig;

  constructor(config: GCSConfig) {
    this.config = config;

    // Initialize S3-compatible provider for GCS
    // GCS S3 Interoperability requires forcePathStyle: true
    this.s3Provider = new S3StorageProvider({
      bucket: config.bucketName,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true, // Required for GCS S3 compatibility
    });
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<StorageFile> {
    try {
      return await this.s3Provider.uploadFile(buffer, filename, mimeType);
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
      return await this.s3Provider.downloadFile(fileId);
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
      await this.s3Provider.deleteFile(fileId);
    } catch (error) {
      throw new StorageError(
        `Failed to delete file from GCS: ${error instanceof Error ? error.message : String(error)}`,
        'gcs',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async getPublicUrl(fileId: string): Promise<string> {
    try {
      return await this.s3Provider.getPublicUrl(fileId);
    } catch (error) {
      throw new StorageError(
        `Failed to get public URL from GCS: ${error instanceof Error ? error.message : String(error)}`,
        'gcs',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async getSignedUrl(fileId: string, expiresIn: number): Promise<string> {
    try {
      return await this.s3Provider.getSignedUrl(fileId, expiresIn);
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
      return await this.s3Provider.listFiles(prefix);
    } catch (error) {
      throw new StorageError(
        `Failed to list files from GCS: ${error instanceof Error ? error.message : String(error)}`,
        'gcs',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Configuration methods

  public getBucket(): string {
    return this.config.bucketName;
  }

  public getEndpoint(): string {
    return this.config.endpoint;
  }

  public getRegion(): string {
    return this.config.region;
  }
}