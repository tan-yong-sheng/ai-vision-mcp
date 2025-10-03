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
    // Convert Google Cloud Storage URL to GCS URI
    // Example: https://storage.googleapis.com/bucket-name/path/to/file -> gs://bucket-name/path/to/file

    if (url.startsWith('gs://')) {
      return url; // Already a GCS URI
    }

    try {
      const urlObj = new URL(url);

      if (url.includes('storage.googleapis.com')) {
        // Extract bucket and path from Google Cloud Storage URL
        const pathMatch = urlObj.pathname.match(/^\/([^\/]+)\/(.*)$/);
        if (pathMatch) {
          return `gs://${pathMatch[1]}/${pathMatch[2]}`;
        }
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
