import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FileService } from '../../src/services/FileService.js';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

vi.mock('node-fetch', () => ({
  default: fetchMock,
}));

const configService = {
  getConfig: () => ({
    IMAGE_PROVIDER: 'google',
    VIDEO_PROVIDER: 'google',
    GEMINI_FILES_API_THRESHOLD: 10 * 1024 * 1024,
    VERTEX_AI_FILES_API_THRESHOLD: 0,
  }),
  getAllowedImageFormats: () => ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp'],
  getAllowedVideoFormats: () => [
    'mp4',
    'mov',
    'avi',
    'x-flv',
    'webm',
    'mpeg',
    'mpg',
    'wmv',
    '3gp',
  ],
  getMaxImageSize: () => 20 * 1024 * 1024,
  getMaxVideoSize: () => 2 * 1024 * 1024 * 1024,
  getGeminiFilesApiThreshold: () => 10 * 1024 * 1024,
} as any;

const visionProvider = {
  uploadFile: vi.fn(),
  waitForFileProcessing: vi.fn(),
  deleteFile: vi.fn(),
  analyzeVideo: vi.fn(),
  analyzeImage: vi.fn(),
  compareImages: vi.fn(),
  downloadFile: vi.fn(),
  setModel: vi.fn(),
  getImageModel: vi.fn(),
  getVideoModel: vi.fn(),
  getSupportedFormats: vi.fn(),
  getModelCapabilities: vi.fn(),
  getProviderInfo: vi.fn(),
  healthCheck: vi.fn(),
  supportsVideo: vi.fn(),
} as any;

function createResponse({
  ok = true,
  contentLength,
  contentType = 'video/mp4',
  bodyChunks = [Buffer.from('small-video-data')],
}: {
  ok?: boolean;
  contentLength?: string;
  contentType?: string;
  bodyChunks?: Buffer[];
}) {
  const destroy = vi.fn();
  const body = {
    ok,
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-length') {
          return contentLength ?? null;
        }
        if (name.toLowerCase() === 'content-type') {
          return contentType;
        }
        return null;
      },
    },
    body: Readable.from(bodyChunks),
    destroy,
  };

  return body;
}

describe('FileService.handleVideoSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('accepts gemini-supported image and video mime aliases', () => {
    const service = new FileService(configService, 'video', visionProvider);

    expect((service as any).isSupportedFileType('image/bmp')).toBe(true);
    expect((service as any).isSupportedFileType('video/mpeg')).toBe(true);
    expect((service as any).isSupportedFileType('video/mpg')).toBe(true);
    expect((service as any).isSupportedFileType('video/mov')).toBe(true);
    expect((service as any).isSupportedFileType('video/avi')).toBe(true);
    expect((service as any).isSupportedFileType('video/wmv')).toBe(true);
    expect((service as any).isSupportedFileType('video/x-flv')).toBe(true);
  });

  test('downloads small remote videos and returns inline base64 data', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        contentLength: '16',
        contentType: 'video/mp4',
        bodyChunks: [Buffer.from('small-video-data')],
      })
    );

    const service = new FileService(configService, 'video', visionProvider);
    vi.spyOn(service as any, 'readVideoStreamWithLimit').mockResolvedValue(
      Buffer.from('small-video-data')
    );

    const result = await service.handleVideoSource(
      'https://example.com/video.mp4'
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/video.mp4',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result.startsWith('data:video/mp4;base64,')).toBe(true);
    expect(result).toContain(Buffer.from('small-video-data').toString('base64'));
  });

  test('destroys the remote response stream when the inline threshold is exceeded', async () => {
    const firstResponse = createResponse({
      contentLength: String(50 * 1024 * 1024 + 1),
      contentType: 'video/mp4',
      bodyChunks: [Buffer.alloc(1024, 1)],
    });
    const secondResponse = createResponse({
      contentType: 'video/mp4',
      bodyChunks: [Buffer.from('upload-fallback')],
    });

    fetchMock.mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(secondResponse);

    const service = new FileService(configService, 'video', visionProvider);
    vi.spyOn(service as any, 'uploadFile').mockResolvedValue('files/abc123');
    vi.spyOn(service as any, 'readVideoStreamWithLimit').mockResolvedValue(null);

    const result = await service.handleVideoSource(
      'https://example.com/huge-video.mp4'
    );

    expect(result).toBe('files/abc123');
  });

  test('normalizes remote video filename before upload fallback', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createResponse({
          contentLength: String(50 * 1024 * 1024 + 1),
          contentType: 'video/quicktime',
          bodyChunks: [Buffer.from('large-video')],
        })
      )
      .mockResolvedValueOnce(
        createResponse({
          contentType: 'video/quicktime',
          bodyChunks: [Buffer.from('large-video')],
        })
      );

    const service = new FileService(configService, 'video', visionProvider);
    vi.spyOn(service as any, 'uploadFile').mockResolvedValue('files/abc123');
    vi.spyOn(service as any, 'readVideoStreamWithLimit').mockResolvedValue(null);

    const result = await service.handleVideoSource(
      'https://example.com/path/to/video.mov?download=1'
    );

    expect(result).toBe('files/abc123');
    expect((service as any).uploadFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      'video.mov',
      'video/quicktime'
    );
  });

  test('returns the remote url unchanged for large videos', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        contentLength: String(50 * 1024 * 1024 + 1),
        contentType: 'video/mp4',
        bodyChunks: [Buffer.from('too-large')],
      })
    );

    const service = new FileService(configService, 'video', visionProvider);
    vi.spyOn(service as any, 'uploadRemoteVideoStream').mockResolvedValue(
      'https://example.com/large-video.mp4'
    );

    const result = await service.handleVideoSource(
      'https://example.com/large-video.mp4'
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toBe('https://example.com/large-video.mp4');
  });

  test('falls back to inline data when content-length is missing', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        bodyChunks: [Buffer.from('tiny-video')],
      })
    );

    const service = new FileService(configService, 'video', visionProvider);
    vi.spyOn(service as any, 'readVideoStreamWithLimit').mockResolvedValue(
      Buffer.from('tiny-video')
    );

    const result = await service.handleVideoSource(
      'https://example.com/no-content-length.mp4'
    );

    expect(result.startsWith('data:video/mp4;base64,')).toBe(true);
  });

  test('keeps youtube urls unchanged', async () => {
    const service = new FileService(configService, 'video', visionProvider);

    const result = await service.handleVideoSource(
      'https://www.youtube.com/watch?v=9hE5-98ZeCg'
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toBe('https://www.youtube.com/watch?v=9hE5-98ZeCg');
  });

  test('processes local mpeg videos with Gemini-supported mime types', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-vision-mpeg-'));
    const filePath = path.join(dir, 'sample.mpeg');
    await fs.writeFile(filePath, Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]));

    const service = new FileService(configService, 'video', visionProvider);
    const result = await service.handleVideoSource(filePath);

    expect(result.startsWith('data:video/mpeg;base64,')).toBe(true);
  });

  test('returns Gemini-compatible file extensions for supported mime types', () => {
    expect(FileService.getFileExtension('image/bmp')).toBe('bmp');
    expect(FileService.getFileExtension('video/mov')).toBe('mov');
    expect(FileService.getFileExtension('video/avi')).toBe('avi');
    expect(FileService.getFileExtension('video/mpeg')).toBe('mpeg');
    expect(FileService.getFileExtension('video/mpg')).toBe('mpg');
    expect(FileService.getFileExtension('video/wmv')).toBe('wmv');
    expect(FileService.getFileExtension('video/x-flv')).toBe('flv');
  });
});
