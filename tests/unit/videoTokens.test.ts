/**
 * Unit tests for videoTokens utility functions
 *
 * Tests video token estimation and context window validation logic.
 * These are pure unit tests that don't require API calls.
 */

import { describe, test, expect } from 'vitest';
import {
  calculateVideoTokens,
  getContextWindowForModel,
  validateVideoContext,
  formatDuration,
  CONTEXT_WARNING_THRESHOLD,
  CONTEXT_CRITICAL_THRESHOLD,
} from '../../src/utils/videoTokens.js';

describe('calculateVideoTokens', () => {
  test('should calculate tokens for basic video', () => {
    const tokens = calculateVideoTokens(60, 1, 'low'); // 1 minute at 1 FPS, low res
    expect(tokens).toBe(6000); // 60 seconds * 100 tokens/sec * 1 FPS factor
  });

  test('should handle zero duration', () => {
    const tokens = calculateVideoTokens(0, 1, 'low');
    expect(tokens).toBe(0);
  });

  test('should scale with resolution', () => {
    const duration = 60;
    const fps = 1;

    const lowTokens = calculateVideoTokens(duration, fps, 'low');
    const mediumTokens = calculateVideoTokens(duration, fps, 'medium');
    const highTokens = calculateVideoTokens(duration, fps, 'high');

    expect(mediumTokens).toBeGreaterThan(lowTokens);
    expect(highTokens).toBeGreaterThan(mediumTokens);

    // Verify exact ratios (medium is 1.8x low, high is 3x low)
    expect(mediumTokens / lowTokens).toBe(1.8);
    expect(highTokens / lowTokens).toBe(3);
  });

  test('should scale with FPS', () => {
    const duration = 60;

    const tokens1fps = calculateVideoTokens(duration, 1, 'low');
    const tokens2fps = calculateVideoTokens(duration, 2, 'low');
    const tokens05fps = calculateVideoTokens(duration, 0.5, 'low');

    expect(tokens2fps).toBe(tokens1fps * 2);
    expect(tokens05fps).toBe(Math.ceil(tokens1fps * 0.5));
  });

  test('should cap FPS at 30', () => {
    // FPS above 30 should be capped
    const tokens30fps = calculateVideoTokens(60, 30, 'low');
    const tokens60fps = calculateVideoTokens(60, 60, 'low');

    expect(tokens60fps).toBe(tokens30fps);
  });

  test('should throw error for negative or zero FPS', () => {
    expect(() => calculateVideoTokens(60, 0, 'low')).toThrow('FPS must be positive');
    expect(() => calculateVideoTokens(60, -1, 'low')).toThrow('FPS must be positive');
  });
});

describe('getContextWindowForModel', () => {
  test('should return 1M tokens for Gemini 2.5 models', () => {
    expect(getContextWindowForModel('gemini-2.5-flash')).toBe(1_048_576);
    expect(getContextWindowForModel('gemini-2.5-pro')).toBe(1_048_576);
    expect(getContextWindowForModel('gemini-2.5-flash-lite')).toBe(1_048_576);
  });

  test('should return 1M tokens for Gemini 2.0 models', () => {
    expect(getContextWindowForModel('gemini-2.0-flash')).toBe(1_048_576);
    expect(getContextWindowForModel('gemini-2.0-pro')).toBe(1_048_576);
  });

  test('should return default context window for unknown models', () => {
    expect(getContextWindowForModel('unknown-model')).toBe(1_000_000);
    expect(getContextWindowForModel('')).toBe(1_000_000);
  });

  test('should handle model names with different cases', () => {
    expect(getContextWindowForModel('GEMINI-2.5-FLASH')).toBe(1_048_576);
    expect(getContextWindowForModel('Gemini-2.5-Flash')).toBe(1_048_576);
    expect(getContextWindowForModel('gemini 2.5 flash')).toBe(1_048_576);
  });
});

describe('validateVideoContext', () => {
  test('should return validation result for short video', () => {
    const result = validateVideoContext({
      durationSeconds: 120, // 2 minutes
      fps: 1,
      resolution: 'low',
      model: 'gemini-2.5-flash',
      promptTokens: 100,
    });

    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.contextWindow).toBe(1_048_576);
    expect(result.fits).toBe(true);
    expect(result.utilization).toBeLessThan(0.1); // Should be < 10%
    expect(result.suggestions).toHaveLength(0);
    expect(result.warning).toBeUndefined();
  });

  test('should return warning for video exceeding 80% threshold', () => {
    // Calculate duration that would exceed 80% threshold
    // At 1 FPS low res: 100 tokens/sec
    // 80% of 1,048,576 tokens (Gemini 2.5) = ~838,861 tokens
    // 838,861 / 100 = ~8389 seconds (~2.3 hours)
    const result = validateVideoContext({
      durationSeconds: 8500, // ~2.36 hours - should exceed 80%
      fps: 1,
      resolution: 'low',
      model: 'gemini-2.5-flash',
      promptTokens: 0,
    });

    expect(result.utilization).toBeGreaterThan(CONTEXT_WARNING_THRESHOLD);
    expect(result.warning).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  test('should return critical warning for video exceeding 95% threshold', () => {
    // 95% of 1,048,576 tokens at 100 tokens/sec = ~996,147 tokens = ~9961 seconds (~2.77 hours)
    const result = validateVideoContext({
      durationSeconds: 10000, // ~2.78 hours - should exceed 95%
      fps: 1,
      resolution: 'low',
      model: 'gemini-2.5-flash',
      promptTokens: 0,
    });

    expect(result.utilization).toBeGreaterThan(CONTEXT_CRITICAL_THRESHOLD);
    expect(result.warning).toBeDefined();
    expect(result.warning).toMatch(/critical/i);
    expect(result.suggestions.length).toBeGreaterThanOrEqual(4); // Critical has more suggestions
  });

  test('should report fits=false when exceeding context window', () => {
    // Exceed 1M tokens: at 100 tokens/sec, need > 10000 seconds
    const result = validateVideoContext({
      durationSeconds: 11000, // ~3 hours
      fps: 1,
      resolution: 'low',
      model: 'gemini-2.5-flash',
      promptTokens: 0,
    });

    expect(result.fits).toBe(false);
    expect(result.utilization).toBeGreaterThan(1);
    expect(result.warning).toMatch(/exceeds|error/i);
  });

  test('should include prompt tokens in estimation', () => {
    const resultWithoutPrompt = validateVideoContext({
      durationSeconds: 60,
      fps: 1,
      resolution: 'low',
      model: 'gemini-2.5-flash',
      promptTokens: 0,
    });

    const resultWithPrompt = validateVideoContext({
      durationSeconds: 60,
      fps: 1,
      resolution: 'low',
      model: 'gemini-2.5-flash',
      promptTokens: 500,
    });

    expect(resultWithPrompt.estimatedTokens).toBe(resultWithoutPrompt.estimatedTokens + 500);
  });

  test('should provide relevant suggestions based on utilization', () => {
    const result = validateVideoContext({
      durationSeconds: 8000,
      fps: 2,
      resolution: 'high',
      model: 'gemini-2.5-flash',
      promptTokens: 1000,
    });

    expect(result.suggestions.length).toBeGreaterThan(0);

    // Suggestions should mention relevant optimizations
    const suggestionText = result.suggestions.join(' ').toLowerCase();
    expect(suggestionText).toMatch(/fps|resolution|duration|prompt/i);
  });

  test('should use default values when optional params omitted', () => {
    const result = validateVideoContext({
      durationSeconds: 60,
    });

    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.contextWindow).toBe(1_000_000); // Default
    expect(result.fits).toBe(true);
  });
});

describe('formatDuration', () => {
  test('should format seconds only', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  test('should format minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2m 5s');
  });

  test('should format hours and minutes', () => {
    expect(formatDuration(7200)).toBe('2h'); // 2 hours exactly
    expect(formatDuration(7320)).toBe('2h 2m'); // 2 hours 2 minutes
  });

  test('should handle zero', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  test('should handle negative values', () => {
    expect(formatDuration(-10)).toBe('0s');
  });

  test('should handle sub-second values', () => {
    expect(formatDuration(0.5)).toBe('<1s');
  });

  test('should not show seconds when hours are present', () => {
    // When there are hours, only show hours and minutes
    expect(formatDuration(3665)).toBe('1h 1m'); // 1h 1m 5s -> shows 1h 1m
  });
});
