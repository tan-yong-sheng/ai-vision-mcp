/**
 * Unit tests for fetchYouTubeDuration() with mocked fetch.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchYouTubeDuration } from '../../src/utils/youtube.js';

describe('fetchYouTubeDuration', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn() as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as any;
    vi.restoreAllMocks();
  });

  test('returns seconds when API responds with ISO duration', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ contentDetails: { duration: 'PT1M30S' } }],
      }),
    });

    const seconds = await fetchYouTubeDuration(
      'https://www.youtube.com/watch?v=9hE5-98ZeCg',
      'test-key'
    );

    expect(seconds).toBe(90);
  });

  test('returns null when URL has no video id', async () => {
    const seconds = await fetchYouTubeDuration('https://example.com', 'test-key');
    expect(seconds).toBeNull();
  });

  test('returns null when API returns no items', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const seconds = await fetchYouTubeDuration(
      'https://www.youtube.com/watch?v=9hE5-98ZeCg',
      'test-key'
    );

    expect(seconds).toBeNull();
  });

  test('returns null on non-OK response', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      text: async () => 'quota exceeded',
    });

    const seconds = await fetchYouTubeDuration(
      'https://www.youtube.com/watch?v=9hE5-98ZeCg',
      'test-key'
    );

    expect(seconds).toBeNull();
  });
});
