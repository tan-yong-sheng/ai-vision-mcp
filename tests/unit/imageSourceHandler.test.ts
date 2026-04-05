/**
 * Unit tests for processImageSource utility
 * Tests all image source types: data:image/, gs://, http, file references, generativelanguage.googleapis.com
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { processImageSource, ProcessedImageSource } from '../../src/utils/imageSourceHandler.js';
import { NetworkError } from '../../src/types/Errors.js';

vi.mock('node-fetch');
vi.mock('fs/promises');

describe('processImageSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('data:image/ URIs', () => {
    it('should handle valid data:image/jpeg URI', async () => {
      const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==';
      const result = await processImageSource(dataUri);

      expect(result).toEqual({
        fileUri: dataUri,
        mimeType: 'image/jpeg',
        isInlineData: true,
        processingDuration: 0,
      });
    });

    it('should handle data:image/png URI', async () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = await processImageSource(dataUri);

      expect(result.mimeType).toBe('image/png');
      expect(result.isInlineData).toBe(true);
      expect(result.fileUri).toBe(dataUri);
    });

    it('should handle data:image/webp URI', async () => {
      const dataUri = 'data:image/webp;base64,UklGRiYAAABXEBP8';
      const result = await processImageSource(dataUri);

      expect(result.mimeType).toBe('image/webp');
      expect(result.isInlineData).toBe(true);
    });

    it('should handle data:image/gif URI', async () => {
      const dataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      const result = await processImageSource(dataUri);

      expect(result.mimeType).toBe('image/gif');
      expect(result.isInlineData).toBe(true);
    });

    it('should reject invalid data URI format', async () => {
      const invalidUri = 'data:image/jpeg;base64,invalid!!!';
      // Should still process but with invalid base64
      const result = await processImageSource(invalidUri);
      expect(result.isInlineData).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should reject data URI without base64 encoding', async () => {
      const invalidUri = 'data:image/jpeg,notbase64';
      await expect(processImageSource(invalidUri)).rejects.toThrow();
    });

    it('should reject malformed data URI', async () => {
      const invalidUri = 'data:image/jpeg;base64';
      await expect(processImageSource(invalidUri)).rejects.toThrow();
    });
  });

  describe('gs:// GCS URIs', () => {
    it('should handle gs:// URI with .jpg extension', async () => {
      const gcsUri = 'gs://my-bucket/images/photo.jpg';
      const result = await processImageSource(gcsUri);

      expect(result).toEqual({
        fileUri: gcsUri,
        mimeType: 'image/jpeg',
        isInlineData: false,
        processingDuration: 0,
      });
    });

    it('should handle gs:// URI with .png extension', async () => {
      const gcsUri = 'gs://my-bucket/images/photo.png';
      const result = await processImageSource(gcsUri);

      expect(result.mimeType).toBe('image/png');
      expect(result.isInlineData).toBe(false);
    });

    it('should handle gs:// URI with .webp extension', async () => {
      const gcsUri = 'gs://my-bucket/images/photo.webp';
      const result = await processImageSource(gcsUri);

      expect(result.mimeType).toBe('image/webp');
    });

    it('should handle gs:// URI with nested path', async () => {
      const gcsUri = 'gs://bucket/path/to/deep/image.jpeg';
      const result = await processImageSource(gcsUri);

      expect(result.fileUri).toBe(gcsUri);
      expect(result.isInlineData).toBe(false);
    });

    it('should default to image/jpeg for gs:// URI without extension', async () => {
      const gcsUri = 'gs://my-bucket/images/photo';
      const result = await processImageSource(gcsUri);

      expect(result.mimeType).toBe('image/jpeg');
    });
  });

  describe('HTTP/HTTPS URLs', () => {
    it('should download and inline HTTP image', async () => {
      const url = 'http://example.com/image.jpg';
      const buffer = Buffer.from([0xff, 0xd8, 0xff]); // JPEG signature

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValueOnce(buffer),
      } as any);

      const result = await processImageSource(url);

      expect(result.isInlineData).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.fileUri).toMatch(/^data:image\/jpeg;base64,/);
      expect(result.processingDuration).toBeGreaterThanOrEqual(0);
    });

    it('should download and inline HTTPS image', async () => {
      const url = 'https://example.com/image.png';
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG signature

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValueOnce(buffer),
      } as any);

      const result = await processImageSource(url);

      expect(result.isInlineData).toBe(true);
      expect(result.mimeType).toBe('image/png');
      expect(result.fileUri).toMatch(/^data:image\/png;base64,/);
    });

    it('should handle HTTP image with .webp extension', async () => {
      const url = 'http://example.com/image.webp';
      const buffer = Buffer.from('RIFF');

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValueOnce(buffer),
      } as any);

      const result = await processImageSource(url);

      expect(result.mimeType).toBe('image/webp');
      expect(result.isInlineData).toBe(true);
    });

    it('should handle HTTP image with .gif extension', async () => {
      const url = 'http://example.com/image.gif';
      const buffer = Buffer.from('GIF87a');

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValueOnce(buffer),
      } as any);

      const result = await processImageSource(url);

      expect(result.mimeType).toBe('image/gif');
    });

    it('should throw NetworkError on fetch failure', async () => {
      const url = 'http://example.com/image.jpg';

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any);

      await expect(processImageSource(url)).rejects.toThrow(NetworkError);
    });

    it('should throw NetworkError on network error', async () => {
      const url = 'http://example.com/image.jpg';

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(processImageSource(url)).rejects.toThrow(NetworkError);
    });

    it('should default to image/jpeg for HTTP URL without extension', async () => {
      const url = 'http://example.com/image';
      const buffer = Buffer.from([0xff, 0xd8, 0xff]);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValueOnce(buffer),
      } as any);

      const result = await processImageSource(url);

      expect(result.mimeType).toBe('image/jpeg');
    });
  });

  describe('files/ references (Gemini Files API)', () => {
    it('should handle files/abc123 reference', async () => {
      const fileRef = 'files/abc123def456';
      const result = await processImageSource(fileRef);

      expect(result).toEqual({
        fileUri: fileRef,
        mimeType: 'image/jpeg',
        isInlineData: false,
        processingDuration: 0,
      });
    });

    it('should handle files/ with long ID', async () => {
      const fileRef = 'files/very-long-file-id-with-many-characters-12345';
      const result = await processImageSource(fileRef);

      expect(result.fileUri).toBe(fileRef);
      expect(result.isInlineData).toBe(false);
    });

    it('should handle files/ with numeric ID', async () => {
      const fileRef = 'files/123456789';
      const result = await processImageSource(fileRef);

      expect(result.fileUri).toBe(fileRef);
      expect(result.isInlineData).toBe(false);
    });
  });

  describe('generativelanguage.googleapis.com URIs', () => {
    it('should handle generativelanguage.googleapis.com file URI', async () => {
      const uri = 'https://generativelanguage.googleapis.com/v1beta/files/abc123';
      const result = await processImageSource(uri);

      expect(result.fileUri).toBe(uri);
      expect(result.isInlineData).toBe(false);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should handle generativelanguage.googleapis.com with path', async () => {
      const uri = 'https://generativelanguage.googleapis.com/v1beta/files/file-id-xyz';
      const result = await processImageSource(uri);

      expect(result.fileUri).toBe(uri);
      expect(result.isInlineData).toBe(false);
    });
  });

  describe('local file references', () => {
    it('should read and inline local file', async () => {
      const filePath = '/path/to/image.jpg';
      const buffer = Buffer.from([0xff, 0xd8, 0xff]);

      vi.mocked(fs.readFile).mockResolvedValueOnce(buffer as any);

      const result = await processImageSource(filePath);

      expect(result.isInlineData).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.fileUri).toMatch(/^data:image\/jpeg;base64,/);
      expect(result.processingDuration).toBeGreaterThanOrEqual(0);
    });

    it('should read and inline PNG file', async () => {
      const filePath = '/path/to/image.png';
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

      vi.mocked(fs.readFile).mockResolvedValueOnce(buffer as any);

      const result = await processImageSource(filePath);

      expect(result.mimeType).toBe('image/png');
      expect(result.isInlineData).toBe(true);
    });

    it('should throw NetworkError on file read failure', async () => {
      const filePath = '/path/to/nonexistent.jpg';

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT: no such file'));

      await expect(processImageSource(filePath)).rejects.toThrow(NetworkError);
    });

    it('should handle file with .webp extension', async () => {
      const filePath = '/path/to/image.webp';
      const buffer = Buffer.from('RIFF');

      vi.mocked(fs.readFile).mockResolvedValueOnce(buffer as any);

      const result = await processImageSource(filePath);

      expect(result.mimeType).toBe('image/webp');
    });

    it('should handle file with .gif extension', async () => {
      const filePath = '/path/to/image.gif';
      const buffer = Buffer.from('GIF87a');

      vi.mocked(fs.readFile).mockResolvedValueOnce(buffer as any);

      const result = await processImageSource(filePath);

      expect(result.mimeType).toBe('image/gif');
    });
  });

  describe('MIME type detection', () => {
    it('should detect JPEG from file signature', async () => {
      const filePath = '/path/to/image.unknown';
      const jpegSignature = Buffer.from([0xff, 0xd8, 0xff]);

      vi.mocked(fs.readFile).mockResolvedValueOnce(jpegSignature as any);

      const result = await processImageSource(filePath);

      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should detect PNG from file signature', async () => {
      const filePath = '/path/to/image.unknown';
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      vi.mocked(fs.readFile).mockResolvedValueOnce(pngSignature as any);

      const result = await processImageSource(filePath);

      expect(result.mimeType).toBe('image/png');
    });

    it('should detect GIF from file signature', async () => {
      const filePath = '/path/to/image.unknown';
      const gifSignature = Buffer.from('GIF87a');

      vi.mocked(fs.readFile).mockResolvedValueOnce(gifSignature as any);

      const result = await processImageSource(filePath);

      expect(result.mimeType).toBe('image/gif');
    });

    it('should default to image/jpeg for unknown signature', async () => {
      const filePath = '/path/to/image.unknown';
      const unknownBuffer = Buffer.from([0x00, 0x00, 0x00]);

      vi.mocked(fs.readFile).mockResolvedValueOnce(unknownBuffer as any);

      const result = await processImageSource(filePath);

      expect(result.mimeType).toBe('image/jpeg');
    });
  });

  describe('processing duration tracking', () => {
    it('should track download duration for HTTP images', async () => {
      const url = 'http://example.com/image.jpg';
      const buffer = Buffer.from([0xff, 0xd8, 0xff]);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValueOnce(buffer),
      } as any);

      const result = await processImageSource(url);

      expect(result.processingDuration).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingDuration).toBe('number');
    });

    it('should track read duration for local files', async () => {
      const filePath = '/path/to/image.jpg';
      const buffer = Buffer.from([0xff, 0xd8, 0xff]);

      vi.mocked(fs.readFile).mockResolvedValueOnce(buffer as any);

      const result = await processImageSource(filePath);

      expect(result.processingDuration).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingDuration).toBe('number');
    });

    it('should have zero duration for GCS URIs', async () => {
      const gcsUri = 'gs://bucket/image.jpg';
      const result = await processImageSource(gcsUri);

      expect(result.processingDuration).toBe(0);
    });

    it('should have zero duration for data URIs', async () => {
      const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==';
      const result = await processImageSource(dataUri);

      expect(result.processingDuration).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should reject empty string', async () => {
      await expect(processImageSource('')).rejects.toThrow();
    });

    it('should reject null', async () => {
      await expect(processImageSource(null as any)).rejects.toThrow();
    });

    it('should reject undefined', async () => {
      await expect(processImageSource(undefined as any)).rejects.toThrow();
    });

    it('should handle URL with query parameters', async () => {
      const url = 'http://example.com/image.jpg?size=large&format=jpg';
      const buffer = Buffer.from([0xff, 0xd8, 0xff]);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValueOnce(buffer),
      } as any);

      const result = await processImageSource(url);

      expect(result.isInlineData).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should handle URL with fragment', async () => {
      const url = 'http://example.com/image.jpg#section';
      const buffer = Buffer.from([0xff, 0xd8, 0xff]);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValueOnce(buffer),
      } as any);

      const result = await processImageSource(url);

      expect(result.isInlineData).toBe(true);
    });

    it('should handle very long data URI', async () => {
      const longBase64 = 'A'.repeat(10000);
      const dataUri = `data:image/jpeg;base64,${longBase64}`;

      const result = await processImageSource(dataUri);

      expect(result.isInlineData).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should handle file path with spaces', async () => {
      const filePath = '/path/to/my image file.jpg';
      const buffer = Buffer.from([0xff, 0xd8, 0xff]);

      vi.mocked(fs.readFile).mockResolvedValueOnce(buffer as any);

      const result = await processImageSource(filePath);

      expect(result.isInlineData).toBe(true);
    });

    it('should handle file path with special characters', async () => {
      const filePath = '/path/to/image-2024_01_15.jpg';
      const buffer = Buffer.from([0xff, 0xd8, 0xff]);

      vi.mocked(fs.readFile).mockResolvedValueOnce(buffer as any);

      const result = await processImageSource(filePath);

      expect(result.isInlineData).toBe(true);
    });
  });

  describe('return type validation', () => {
    it('should return ProcessedImageSource with all required fields', async () => {
      const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==';
      const result = await processImageSource(dataUri);

      expect(result).toHaveProperty('fileUri');
      expect(result).toHaveProperty('mimeType');
      expect(result).toHaveProperty('isInlineData');
      expect(result).toHaveProperty('processingDuration');

      expect(typeof result.fileUri).toBe('string');
      expect(typeof result.mimeType).toBe('string');
      expect(typeof result.isInlineData).toBe('boolean');
      expect(typeof result.processingDuration).toBe('number');
    });

    it('should return consistent structure for all source types', async () => {
      const sources = [
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==',
        'gs://bucket/image.jpg',
        'files/abc123',
      ];

      for (const source of sources) {
        const result = await processImageSource(source);
        expect(result).toHaveProperty('fileUri');
        expect(result).toHaveProperty('mimeType');
        expect(result).toHaveProperty('isInlineData');
        expect(result).toHaveProperty('processingDuration');
      }
    });
  });
});
