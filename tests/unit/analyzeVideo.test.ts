import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import type { VisionProvider } from '../../src/types/Providers.js';
import type { Config } from '../../src/types/Config.js';
import { analyze_video } from '../../src/tools/analyze_video.js';
import { VisionError } from '../../src/types/Errors.js';
import * as youtubeUtils from '../../src/utils/youtube.js';

class PassThroughFileService {
  async handleVideoSource(source: string): Promise<string> {
    return source;
  }
}

describe('analyze_video', () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const originalError = console.error;

  beforeEach(() => {
    globalThis.fetch = vi.fn() as any;
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as any;
    console.warn = originalWarn;
    console.error = originalError;
    vi.restoreAllMocks();
  });

  test('throws when videoSource is missing', async () => {
    const provider = {
      analyzeVideo: vi.fn(),
    } as unknown as VisionProvider;

    await expect(
      analyze_video(
        { videoSource: '', prompt: 'hello' },
        {} as Config,
        provider,
        new PassThroughFileService() as any
      )
    ).rejects.toMatchObject({
      code: 'MISSING_ARGUMENT',
      message: 'videoSource is required',
    });
  });

  test('throws when prompt is missing', async () => {
    const provider = {
      analyzeVideo: vi.fn(),
    } as unknown as VisionProvider;

    await expect(
      analyze_video(
        { videoSource: '/tmp/test.mp4', prompt: '' },
        {} as Config,
        provider,
        new PassThroughFileService() as any
      )
    ).rejects.toMatchObject({
      code: 'MISSING_ARGUMENT',
      message: 'prompt is required',
    });
  });

  test('attaches context warning when youtube duration lookup succeeds and provider metadata is preserved', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ contentDetails: { duration: 'PT2M' } }],
      }),
    });

    const provider: VisionProvider = {
      analyzeImage: vi.fn(),
      analyzeVideo: vi.fn().mockResolvedValue({
        text: 'ok',
        metadata: { fromProvider: true },
      }),
      compareImages: vi.fn(),
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      setModel: vi.fn(),
      getImageModel: vi.fn(),
      getVideoModel: vi.fn().mockReturnValue('gemini-2.5-flash'),
      getSupportedFormats: vi.fn(),
      getModelCapabilities: vi.fn(),
      getProviderInfo: vi.fn(),
      healthCheck: vi.fn(),
      supportsVideo: vi.fn(),
    } as unknown as VisionProvider;

    const config: Config = {
      YOUTUBE_API_KEY: 'yt-key',
      VIDEO_MODEL: 'gemini-2.5-flash',
    } as any;

    const result = await analyze_video(
      {
        videoSource: 'https://www.youtube.com/watch?v=9hE5-98ZeCg',
        prompt: 'hello',
        options: { maxTokens: 10 },
      },
      config,
      provider,
      new PassThroughFileService() as any
    );

    expect(result.metadata?.fromProvider).toBe(true);
    expect(result.metadata?.contextWarning).toBeDefined();
    expect(result.metadata?.contextWarning?.estimatedTokens).toBeGreaterThan(0);
    expect(result.metadata?.contextWarning?.contextWindow).toBeGreaterThan(0);
  });

  test('merges analyze-video defaults with user options by precedence', async () => {
    const provider: VisionProvider = {
      analyzeImage: vi.fn(),
      analyzeVideo: vi.fn().mockResolvedValue({
        text: 'ok',
        metadata: { fromProvider: true },
      }),
      compareImages: vi.fn(),
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      setModel: vi.fn(),
      getImageModel: vi.fn(),
      getVideoModel: vi.fn().mockReturnValue('gemini-2.5-flash'),
      getSupportedFormats: vi.fn(),
      getModelCapabilities: vi.fn(),
      getProviderInfo: vi.fn(),
      healthCheck: vi.fn(),
      supportsVideo: vi.fn(),
    } as unknown as VisionProvider;

    const config: Config = {
      TEMPERATURE: 0.1,
      TEMPERATURE_FOR_VIDEO: 0.2,
      TEMPERATURE_FOR_ANALYZE_VIDEO: 0.3,
      TOP_P: 0.4,
      TOP_P_FOR_VIDEO: 0.5,
      TOP_K: 6,
      TOP_K_FOR_VIDEO: 7,
      TOP_K_FOR_ANALYZE_VIDEO: 8,
      MAX_TOKENS: 50,
      MAX_TOKENS_FOR_VIDEO: 60,
      MAX_TOKENS_FOR_ANALYZE_VIDEO: 70,
    } as any;

    await analyze_video(
      {
        videoSource: '/tmp/test.mp4',
        prompt: 'hello',
        options: { temperature: 0.9 },
      },
      config,
      provider,
      new PassThroughFileService() as any
    );

    expect(provider.analyzeVideo).toHaveBeenCalledWith(
      '/tmp/test.mp4',
      'hello',
      expect.objectContaining({
        temperature: 0.9,
        topP: 0.5,
        topK: 8,
        maxTokens: 70,
        taskType: 'video',
        functionName: 'analyze_video',
      })
    );
  });

  test('preserves provider metadata for non-YouTube sources without context warning', async () => {
    const provider: VisionProvider = {
      analyzeImage: vi.fn(),
      analyzeVideo: vi.fn().mockResolvedValue({
        text: 'ok',
        metadata: { fromProvider: true, nested: { value: 1 } },
      }),
      compareImages: vi.fn(),
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      setModel: vi.fn(),
      getImageModel: vi.fn(),
      getVideoModel: vi.fn().mockReturnValue('gemini-2.5-flash'),
      getSupportedFormats: vi.fn(),
      getModelCapabilities: vi.fn(),
      getProviderInfo: vi.fn(),
      healthCheck: vi.fn(),
      supportsVideo: vi.fn(),
    } as unknown as VisionProvider;

    const result = await analyze_video(
      {
        videoSource: '/tmp/test.mp4',
        prompt: 'hello',
      },
      { VIDEO_MODEL: 'gemini-2.5-flash' } as any,
      provider,
      new PassThroughFileService() as any
    );

    expect(result.metadata?.fromProvider).toBe(true);
    expect(result.metadata?.nested).toEqual({ value: 1 });
    expect(result.metadata?.contextWarning).toBeUndefined();
  });

  test('logs a warning when YouTube duration lookup fails', async () => {
    const durationSpy = vi
      .spyOn(youtubeUtils, 'fetchYouTubeDuration')
      .mockRejectedValue(new Error('lookup failed'));

    const provider: VisionProvider = {
      analyzeImage: vi.fn(),
      analyzeVideo: vi.fn().mockResolvedValue({
        text: 'ok',
        metadata: { fromProvider: true },
      }),
      compareImages: vi.fn(),
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      setModel: vi.fn(),
      getImageModel: vi.fn(),
      getVideoModel: vi.fn().mockReturnValue('gemini-2.5-flash'),
      getSupportedFormats: vi.fn(),
      getModelCapabilities: vi.fn(),
      getProviderInfo: vi.fn(),
      healthCheck: vi.fn(),
      supportsVideo: vi.fn(),
    } as unknown as VisionProvider;

    const result = await analyze_video(
      {
        videoSource: 'https://www.youtube.com/watch?v=9hE5-98ZeCg',
        prompt: 'hello',
      },
      { YOUTUBE_API_KEY: 'yt-key', VIDEO_MODEL: 'gemini-2.5-flash' } as any,
      provider,
      new PassThroughFileService() as any
    );

    expect(durationSpy).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      'Failed to validate video context:',
      expect.any(Error)
    );
    expect(result.metadata?.contextWarning).toBeUndefined();
  });

  test('does not attach context warning when YouTube duration lookup returns no duration', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const provider: VisionProvider = {
      analyzeImage: vi.fn(),
      analyzeVideo: vi.fn().mockResolvedValue({
        text: 'ok',
        metadata: { fromProvider: true },
      }),
      compareImages: vi.fn(),
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      setModel: vi.fn(),
      getImageModel: vi.fn(),
      getVideoModel: vi.fn().mockReturnValue('gemini-2.5-flash'),
      getSupportedFormats: vi.fn(),
      getModelCapabilities: vi.fn(),
      getProviderInfo: vi.fn(),
      healthCheck: vi.fn(),
      supportsVideo: vi.fn(),
    } as unknown as VisionProvider;

    const result = await analyze_video(
      {
        videoSource: 'https://www.youtube.com/watch?v=9hE5-98ZeCg',
        prompt: 'hello',
      },
      { YOUTUBE_API_KEY: 'yt-key', VIDEO_MODEL: 'gemini-2.5-flash' } as any,
      provider,
      new PassThroughFileService() as any
    );

    expect(result.metadata?.contextWarning).toBeUndefined();
  });

  test('does not attach context warning when youtube key is missing', async () => {
    const provider: VisionProvider = {
      analyzeImage: vi.fn(),
      analyzeVideo: vi.fn().mockResolvedValue({
        text: 'ok',
        metadata: { fromProvider: true },
      }),
      compareImages: vi.fn(),
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      setModel: vi.fn(),
      getImageModel: vi.fn(),
      getVideoModel: vi.fn().mockReturnValue('gemini-2.5-flash'),
      getSupportedFormats: vi.fn(),
      getModelCapabilities: vi.fn(),
      getProviderInfo: vi.fn(),
      healthCheck: vi.fn(),
      supportsVideo: vi.fn(),
    } as unknown as VisionProvider;

    const result = await analyze_video(
      {
        videoSource: 'https://www.youtube.com/watch?v=9hE5-98ZeCg',
        prompt: 'hello',
      },
      { VIDEO_MODEL: 'gemini-2.5-flash' } as any,
      provider,
      new PassThroughFileService() as any
    );

    expect(result.metadata?.contextWarning).toBeUndefined();
  });

  test('logs and rethrows VisionError from provider', async () => {
    const provider: VisionProvider = {
      analyzeImage: vi.fn(),
      analyzeVideo: vi.fn().mockRejectedValue(new VisionError('provider failed', 'PROVIDER_ERROR')),
      compareImages: vi.fn(),
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      setModel: vi.fn(),
      getImageModel: vi.fn(),
      getVideoModel: vi.fn(),
      getSupportedFormats: vi.fn(),
      getModelCapabilities: vi.fn(),
      getProviderInfo: vi.fn(),
      healthCheck: vi.fn(),
      supportsVideo: vi.fn(),
    } as unknown as VisionProvider;

    await expect(
      analyze_video(
        { videoSource: '/tmp/test.mp4', prompt: 'hello' },
        {} as Config,
        provider,
        new PassThroughFileService() as any
      )
    ).rejects.toBeInstanceOf(VisionError);

    expect(console.error).toHaveBeenCalled();
  });

  test('wraps non-VisionError failures', async () => {
    const provider: VisionProvider = {
      analyzeImage: vi.fn(),
      analyzeVideo: vi.fn().mockRejectedValue('boom'),
      compareImages: vi.fn(),
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      setModel: vi.fn(),
      getImageModel: vi.fn(),
      getVideoModel: vi.fn(),
      getSupportedFormats: vi.fn(),
      getModelCapabilities: vi.fn(),
      getProviderInfo: vi.fn(),
      healthCheck: vi.fn(),
      supportsVideo: vi.fn(),
    } as unknown as VisionProvider;

    await expect(
      analyze_video(
        { videoSource: '/tmp/test.mp4', prompt: 'hello' },
        {} as Config,
        provider,
        new PassThroughFileService() as any
      )
    ).rejects.toMatchObject({
      code: 'ANALYSIS_ERROR',
      provider: 'gemini',
      originalError: undefined,
    });
  });
});
