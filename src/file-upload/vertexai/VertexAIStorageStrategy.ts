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

    // For Vertex AI with native GCS, the URL is already in gs:// format
    const gcsUri = await this.storageProvider.getPublicUrl(uploadedFile.id);

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
}
