/**
 * Vertex AI storage upload strategy using external storage
 */

import type {
  FileUploadStrategy,
  UploadedFile,
  FileReference,
} from '../../types/Providers.js';
import type { StorageProvider } from '../../types/Storage.js';
import { FileUploadError } from '../../types/Errors.js';

export class VertexAIStorageStrategy implements FileUploadStrategy {
  constructor(private storageProvider: StorageProvider) {}

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadedFile> {
    try {
      return await this.storageProvider.uploadFile(buffer, filename, mimeType);
    } catch (error) {
      throw new FileUploadError(
        `Failed to upload file to external storage: ${error instanceof Error ? error.message : String(error)}`,
        'vertex_ai',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async getFileForAnalysis(uploadedFile: UploadedFile): Promise<FileReference> {
    if (!uploadedFile.id) {
      throw new FileUploadError(
        'Uploaded file does not have an ID for analysis',
        'vertex_ai'
      );
    }

    // For Vertex AI, we need to convert the GCS URL to a GCS URI
    const publicUrl = await this.storageProvider.getPublicUrl(uploadedFile.id);
    const gcsUri = this.convertToGcsUri(publicUrl);

    return {
      type: 'file_uri',
      uri: gcsUri,
      mimeType: uploadedFile.mimeType,
    };
  }

  async cleanup(fileId: string): Promise<void> {
    try {
      await this.storageProvider.deleteFile(fileId);
    } catch (error) {
      // Log error but don't throw - cleanup failures shouldn't block the main flow
      console.warn(`Failed to cleanup storage file ${fileId}:`, error);
    }
  }

  private convertToGcsUri(url: string): string {
    // Convert S3-compatible GCS URL to GCS URI
    // Examples:
    // - https://storage.googleapis.com/bucket-name/path/to/file -> gs://bucket-name/path/to/file
    // - https://endpoint/bucket-name/path/to/file -> gs://bucket-name/path/to/file (path style)

    if (url.startsWith('gs://')) {
      return url; // Already a GCS URI
    }

    try {
      const urlObj = new URL(url);

      // Handle path-style URLs (most common for GCS S3 compatibility)
      // https://endpoint/bucket-name/path/to/file
      const pathMatch = urlObj.pathname.match(/^\/([^\/]+)\/(.*)$/);
      if (pathMatch) {
        return `gs://${pathMatch[1]}/${pathMatch[2]}`;
      }

      // Handle virtual-host style URLs (less common for GCS)
      // https://bucket-name.endpoint/path/to/file
      const hostMatch = urlObj.hostname.match(/^([^.]+)\.(.*)$/);
      if (hostMatch) {
        const path = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
        return `gs://${hostMatch[1]}/${path}`;
      }
    } catch (error) {
      throw new FileUploadError(
        `Failed to convert URL to GCS URI: ${url}`,
        'vertex_ai',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    throw new FileUploadError(
      `Unable to convert URL to GCS URI format: ${url}`,
      'vertex_ai'
    );
  }
}
