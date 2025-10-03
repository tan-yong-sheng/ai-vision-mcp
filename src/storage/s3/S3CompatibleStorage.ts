/**
 * S3-compatible storage provider implementation
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  StorageProvider,
  StorageFile,
  StorageConfig,
} from '../../types/Storage.js';
import { StorageError } from '../../types/Errors.js';

export class S3CompatibleStorageProvider implements StorageProvider {
  private s3Client: S3Client;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
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
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'max-age=31536000', // 1 year
      });

      await this.s3Client.send(command);

      const url = await this.getPublicUrl(key);

      return {
        id: key,
        filename,
        mimeType,
        size: buffer.length,
        url,
        lastModified: new Date().toISOString(),
        etag: this.generateETag(buffer),
      };
    } catch (error) {
      throw new StorageError(
        `Failed to upload file to S3: ${error instanceof Error ? error.message : String(error)}`,
        's3',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: fileId,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new StorageError('File body is empty', 's3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new StorageError(
        `Failed to download file from S3: ${error instanceof Error ? error.message : String(error)}`,
        's3',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: fileId,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new StorageError(
        `Failed to delete file from S3: ${error instanceof Error ? error.message : String(error)}`,
        's3',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async getPublicUrl(fileId: string): Promise<string> {
    if (this.config.cdnUrl) {
      return `${this.config.cdnUrl}/${fileId}`;
    }

    // Generate S3 URL
    const protocol = this.config.endpoint.includes('https://')
      ? 'https'
      : 'http';
    const hostname = this.config.endpoint
      .replace(/https?:\/\//, '')
      .replace(/\/$/, '');
    const bucket = this.config.forcePathStyle ? `${this.config.bucket}/` : '';

    return `${protocol}://${hostname}/${bucket}${fileId}`;
  }

  async getSignedUrl(fileId: string, expiresIn: number): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: fileId,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });
      return signedUrl;
    } catch (error) {
      throw new StorageError(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : String(error)}`,
        's3',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async listFiles(prefix?: string): Promise<StorageFile[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: 1000, // Max results per page
      });

      const response = await this.s3Client.send(command);

      const files: StorageFile[] = [];

      for (const object of response.Contents || []) {
        if (object.Key) {
          const url = await this.getPublicUrl(object.Key);
          files.push({
            id: object.Key,
            filename: object.Key.split('/').pop() || object.Key,
            mimeType: 'application/octet-stream', // Default, would need to be determined from extension
            size: object.Size || 0,
            url,
            lastModified:
              object.LastModified?.toISOString() || new Date().toISOString(),
            etag: object.ETag?.replace(/"/g, ''),
          });
        }
      }

      return files;
    } catch (error) {
      throw new StorageError(
        `Failed to list files from S3: ${error instanceof Error ? error.message : String(error)}`,
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
    return this.config.bucket;
  }

  public getRegion(): string {
    return this.config.region;
  }

  public getEndpoint(): string {
    return this.config.endpoint;
  }

  public isUsingCDN(): boolean {
    return !!this.config.cdnUrl;
  }

  public getCDNUrl(): string | undefined {
    return this.config.cdnUrl;
  }
}
