/**
 * S3-compatible storage provider implementation
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import {
  StorageProvider,
  StorageFile,
} from '../../types/Storage.js';
import { StorageError } from '../../types/Errors.js';
import { Readable } from 'stream';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private config: {
    accessKey: string;
    secretKey: string;
    region: string;
    endpoint: string;
    forcePathStyle?: boolean;
  };

  constructor(config: {
    bucket: string;
    accessKey: string;
    secretKey: string;
    region: string;
    endpoint: string;
    forcePathStyle?: boolean;
  }) {
    this.config = config;
    this.bucket = config.bucket;

    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: config.forcePathStyle || false,
    });
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<StorageFile> {
    try {
      const key = this.generateKey(filename);
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000', // 1 year
      });

      await this.client.send(command);

      return {
        id: key,
        filename,
        mimeType,
        size: buffer.length,
        url: await this.getPublicUrl(key),
        lastModified: new Date().toISOString(),
        etag: this.generateETag(buffer),
      };
    } catch (error) {
      throw new StorageError(
        `Failed to upload file to S3-compatible storage: ${error instanceof Error ? error.message : String(error)}`,
        's3',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileId,
      });

      const response: GetObjectCommandOutput = await this.client.send(command);

      if (!response.Body) {
        throw new StorageError('Empty response body from S3', 's3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as Readable;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new StorageError(
        `Failed to download file from S3-compatible storage: ${error instanceof Error ? error.message : String(error)}`,
        's3',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileId,
      });

      await this.client.send(command);
    } catch (error) {
      // Don't throw error if file doesn't exist (404)
      if (error instanceof Error && error.message.includes('NoSuchKey')) {
        return;
      }
      throw new StorageError(
        `Failed to delete file from S3-compatible storage: ${error instanceof Error ? error.message : String(error)}`,
        's3',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async getPublicUrl(fileId: string): Promise<string> {
    // For S3-compatible storage, construct the URL based on the endpoint
    const { endpoint, forcePathStyle } = this.config;

    if (forcePathStyle) {
      // Path style: https://endpoint/bucket/key
      return `${endpoint}/${this.bucket}/${fileId}`;
    } else {
      // Virtual host style: https://bucket.endpoint/key
      const url = new URL(endpoint);
      return `${url.protocol}//${this.bucket}.${url.host}/${fileId}`;
    }
  }

  async getSignedUrl(fileId: string, _expiresIn: number): Promise<string> {
    // For basic S3-compatible storage, we'll return the public URL
    // In a full implementation, you would use @aws-sdk/s3-request-presigner
    return await this.getPublicUrl(fileId);
  }

  async listFiles(prefix?: string): Promise<StorageFile[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const response = await this.client.send(command);
      const storageFiles: StorageFile[] = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key) {
            const filename = object.Key.split('/').pop() || object.Key;
            const url = await this.getPublicUrl(object.Key);

            storageFiles.push({
              id: object.Key,
              filename,
              mimeType: 'application/octet-stream', // S3 doesn't always store mime type
              size: object.Size || 0,
              url,
              lastModified: object.LastModified?.toISOString() || new Date().toISOString(),
              etag: object.ETag?.replace(/"/g, ''), // Remove quotes from ETag
            });
          }
        }
      }

      return storageFiles;
    } catch (error) {
      throw new StorageError(
        `Failed to list files from S3-compatible storage: ${error instanceof Error ? error.message : String(error)}`,
        's3',
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
    return this.bucket;
  }

  public getEndpoint(): string {
    return this.config.endpoint;
  }

  public getRegion(): string {
    return this.config.region;
  }

  public isPathStyle(): boolean {
    return !!this.config.forcePathStyle;
  }
}