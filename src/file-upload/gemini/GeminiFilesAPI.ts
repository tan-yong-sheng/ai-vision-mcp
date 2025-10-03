/**
 * Gemini Files API upload strategy
 */

import type {
  FileUploadStrategy,
  UploadedFile,
  FileReference,
} from '../../types/Providers.js';
import { GeminiProvider } from '../../providers/gemini/GeminiProvider.js';
import { FileUploadError } from '../../types/Errors.js';

export class GeminiFilesAPI implements FileUploadStrategy {
  constructor(private geminiProvider: GeminiProvider) {}

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadedFile> {
    try {
      return await this.geminiProvider.uploadFile(buffer, filename, mimeType);
    } catch (error) {
      throw new FileUploadError(
        `Failed to upload file to Gemini Files API: ${error instanceof Error ? error.message : String(error)}`,
        'gemini',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async getFileForAnalysis(uploadedFile: UploadedFile): Promise<FileReference> {
    if (!uploadedFile.uri) {
      throw new FileUploadError(
        'Uploaded file does not have a URI for analysis',
        'gemini'
      );
    }

    return {
      type: 'file_uri',
      uri: uploadedFile.uri,
      mimeType: uploadedFile.mimeType,
    };
  }

  async cleanup(fileId: string): Promise<void> {
    try {
      await this.geminiProvider.deleteFile(fileId);
    } catch (error) {
      // Log error but don't throw - cleanup failures shouldn't block the main flow
      console.warn(`Failed to cleanup Gemini file ${fileId}:`, error);
    }
  }
}
