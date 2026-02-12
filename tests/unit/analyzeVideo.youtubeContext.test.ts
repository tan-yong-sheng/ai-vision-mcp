/**
 * Unit-ish test for analyze_video() YouTube contextWarning plumbing.
 *
 * This avoids any real provider calls by stubbing the VisionProvider.
 * It also mocks YouTube Data API duration fetching via global fetch.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VisionProvider } from '../../src/types/Providers.js';
import type { Config } from '../../src/types/Config.js';
import { analyze_video } from '../../src/tools/analyze_video.js';

class StubFileService {
  async handleVideoSource(source: string): Promise<string> {
    return source;
  }
}

describe('analyze_video YouTube context metadata', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn() as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as any;
    vi.restoreAllMocks();
  });

  test('attaches metadata.contextWarning when YOUTUBE_API_KEY is set and duration is available', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ contentDetails: { duration: 'PT2M' } }],
      }),
    });

    const provider: VisionProvider = {
      analyzeImage: async () => ({ text: 'n/a' } as any),
      analyzeVideo: async () => ({ text: 'ok', metadata: { fromProvider: true } } as any),
      compareImages: async () => ({ text: 'n/a' } as any),
      uploadFile: async () => ({ name: 'x' } as any),
      downloadFile: async () => Buffer.from(''),
      deleteFile: async () => {},
      setModel: () => {},
      getImageModel: () => 'x',
      getVideoModel: () => 'gemini-2.5-flash',
      getSupportedFormats: () => ({ images: [], videos: [] } as any),
      getModelCapabilities: () => ({} as any),
      getProviderInfo: () => ({ name: 'stub', version: '0', description: '' } as any),
      healthCheck: async () => ({ status: 'ok' } as any),
      supportsVideo: () => true,
    };

    const config: Config = {
      // Only fields used by analyze_video's option merging + youtube key.
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
      new StubFileService() as any
    );

    const metadata = (result as any).metadata as any;

    expect(metadata?.fromProvider).toBe(true);
    expect(metadata?.contextWarning).toBeDefined();

    const cw = metadata.contextWarning;
    expect(cw.estimatedTokens).toBeGreaterThan(0);
    expect(cw.contextWindow).toBeGreaterThan(0);
    expect(cw.utilization).toBeGreaterThan(0);
    expect(Array.isArray(cw.suggestions)).toBe(true);
  });

  test('does not attach contextWarning when YOUTUBE_API_KEY is missing', async () => {
    const provider: VisionProvider = {
      analyzeImage: async () => ({ text: 'n/a' } as any),
      analyzeVideo: async () => ({ text: 'ok', metadata: { fromProvider: true } } as any),
      compareImages: async () => ({ text: 'n/a' } as any),
      uploadFile: async () => ({ name: 'x' } as any),
      downloadFile: async () => Buffer.from(''),
      deleteFile: async () => {},
      setModel: () => {},
      getImageModel: () => 'x',
      getVideoModel: () => 'gemini-2.5-flash',
      getSupportedFormats: () => ({ images: [], videos: [] } as any),
      getModelCapabilities: () => ({} as any),
      getProviderInfo: () => ({ name: 'stub', version: '0', description: '' } as any),
      healthCheck: async () => ({ status: 'ok' } as any),
      supportsVideo: () => true,
    };

    const config: Config = {
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
      new StubFileService() as any
    );

    const metadata = (result as any).metadata as any;
    expect(metadata?.fromProvider).toBe(true);
    expect(metadata?.contextWarning).toBeUndefined();
  });
});
