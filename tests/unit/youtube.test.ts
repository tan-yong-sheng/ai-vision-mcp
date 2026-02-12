/**
 * Unit tests for YouTube helpers (no network).
 */

import { describe, test, expect } from 'vitest';
import { extractYouTubeVideoId, isYouTubeUrl, parseISODuration } from '../../src/utils/youtube.js';

describe('youtube utils', () => {
  test('extractYouTubeVideoId supports common formats', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=9hE5-98ZeCg')).toBe('9hE5-98ZeCg');
    expect(extractYouTubeVideoId('https://youtu.be/9hE5-98ZeCg')).toBe('9hE5-98ZeCg');
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/9hE5-98ZeCg')).toBe('9hE5-98ZeCg');
    expect(extractYouTubeVideoId('https://www.youtube.com/v/9hE5-98ZeCg')).toBe('9hE5-98ZeCg');
    expect(extractYouTubeVideoId('not a url')).toBeUndefined();
  });

  test('isYouTubeUrl detects youtube domains', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=9hE5-98ZeCg')).toBe(true);
    expect(isYouTubeUrl('https://youtu.be/9hE5-98ZeCg')).toBe(true);
    expect(isYouTubeUrl('https://example.com/watch?v=9hE5-98ZeCg')).toBe(false);
  });

  test('parseISODuration parses PT#H#M#S', () => {
    expect(parseISODuration('PT2M')).toBe(120);
    expect(parseISODuration('PT1M30S')).toBe(90);
    expect(parseISODuration('PT2H3M4S')).toBe(2 * 3600 + 3 * 60 + 4);
    expect(parseISODuration('')).toBe(0);
  });
});
