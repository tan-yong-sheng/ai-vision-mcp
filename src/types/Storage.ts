/**
 * Storage types for S3-compatible storage providers
 */

export interface StorageProvider {
  uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<StorageFile>;
  downloadFile(fileId: string): Promise<Buffer>;
  deleteFile(fileId: string): Promise<void>;
  getPublicUrl(fileId: string): Promise<string>;
  getSignedUrl(fileId: string, expiresIn: number): Promise<string>;
  listFiles(prefix?: string): Promise<StorageFile[]>;
}

export interface StorageFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  lastModified: string;
  etag?: string;
  metadata?: Record<string, string>;
}

export interface StorageConfig {
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
  endpoint: string;
  cdnUrl?: string;
  forcePathStyle?: boolean;
  signatureVersion?: string;
}

export interface UploadOptions {
  metadata?: Record<string, string>;
  contentType?: string;
  cacheControl?: string;
  expires?: Date;
  tags?: Record<string, string>;
}

export interface ListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListResult {
  files: StorageFile[];
  isTruncated: boolean;
  nextContinuationToken?: string;
  count: number;
}

export interface SignedUrlOptions {
  expiresIn: number;
  method?: 'GET' | 'PUT' | 'DELETE';
  contentType?: string;
  checksum?: string;
}

export interface StorageError extends Error {
  code: string;
  statusCode?: number;
  region?: string;
  time: Date;
  request_id?: string;
}
