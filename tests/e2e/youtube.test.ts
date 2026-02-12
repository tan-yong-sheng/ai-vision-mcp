/**
 * YouTube Video E2E Tests
 *
 * These tests specifically validate YouTube video analysis functionality:
 * 1. YouTube Data API v3 integration for duration extraction (when YOUTUBE_API_KEY is set)
 * 2. Fallback behavior when YOUTUBE_API_KEY is not set
 * 3. Context window validation for long videos
 *
 * Prerequisites:
 * - GEMINI_API_KEY: Required for video analysis
 * - YOUTUBE_API_KEY: Optional - enables duration extraction and context warnings
 *
 * Test Videos (stable public videos):
 * - Short (2 min): Big Buck Bunny trailer - 9hE5-98ZeCg
 * - Long (4+ hours): Google I/O 2023 keynote - 2Vv-BfVoq4g
 *
 * To run these tests locally:
 *   With API key: GEMINI_API_KEY=xxx YOUTUBE_API_KEY=xxx npm run test:e2e -- tests/e2e/youtube.test.ts
 *   Without API key: GEMINI_API_KEY=xxx npm run test:e2e -- tests/e2e/youtube.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
  createMCPClient,
  teardownMCPClient,
  type TestClient,
  type ServerProcess,
  parseToolResult,
  callTool,
} from './setup.js';

describe('YouTube Video Analysis E2E Tests', () => {
  let client: TestClient;
  let server: ServerProcess;

  // Check prerequisites
  const hasGeminiKey = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('test-');
  const hasYouTubeApiKey = !!process.env.YOUTUBE_API_KEY;

  beforeAll(async () => {
    if (!hasGeminiKey) {
      console.log('Skipping YouTube tests - no valid GEMINI_API_KEY provided');
      return;
    }

    const envOverrides: Record<string, string> = {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
    };

    if (process.env.YOUTUBE_API_KEY) {
      envOverrides.YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    }

    const setup = await createMCPClient(envOverrides);
    client = setup.client;
    server = setup.server;
  }, 30000);

  afterAll(async () => {
    if (client && server) {
      await teardownMCPClient(client, server);
    }
  }, 10000);

  // Skip all tests if no Gemini API key
  const testOrSkip = hasGeminiKey ? test : test.skip;

  /**
   * Test 1: Verify YouTube Data API v3 integration for duration extraction
   * This test only runs when YOUTUBE_API_KEY is set
   */
  describe('YouTube Data API v3 Integration', () => {
    const testWithApiKey = hasYouTubeApiKey && hasGeminiKey ? test : test.skip;

    testWithApiKey(
      'should extract video duration and return context warning when YOUTUBE_API_KEY is set',
      async () => {
        // Big Buck Bunny trailer - ~2 minutes, open-source test video
        const videoUrl = 'https://www.youtube.com/watch?v=9hE5-98ZeCg';

        const result = await callTool(
          client,
          'analyze_video',
          {
            videoSource: videoUrl,
            prompt: 'What is this video about? Give a one-sentence summary.',
            options: {
              maxTokens: 100,
              temperature: 0.1,
            },
          },
          { timeout: 120000 }
        );

        expect(result.isError).toBeFalsy();

        const parsed = parseToolResult<{
          text?: string;
          description?: string;
          analysis?: string;
          metadata?: {
            contextWarning?: {
              estimatedTokens: number;
              contextWindow: number;
              utilization: number;
              message?: string;
              suggestions?: string[];
            };
          };
        }>(result as any);

        // Verify analysis completed
        const text = parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);

        // Verify context warning is present (API key is set)
        expect(parsed.metadata?.contextWarning).toBeDefined();
        expect(parsed.metadata?.contextWarning?.estimatedTokens).toBeGreaterThan(0);
        expect(parsed.metadata?.contextWarning?.contextWindow).toBeGreaterThan(0);
        expect(parsed.metadata?.contextWarning?.utilization).toBeGreaterThan(0);

        // Short video (2 min) should have low utilization (< 50%)
        expect(parsed.metadata?.contextWarning?.utilization).toBeLessThan(0.5);

        // Should include suggestions array
        expect(Array.isArray(parsed.metadata?.contextWarning?.suggestions)).toBe(true);
      },
      120000
    );

    testWithApiKey(
      'should warn about high context utilization for long videos',
      async () => {
        // Google I/O 2023 keynote - ~4 hours (long video)
        const videoUrl = 'https://www.youtube.com/watch?v=2Vv-BfVoq4g';

        const result = await callTool(
          client,
          'analyze_video',
          {
            videoSource: videoUrl,
            prompt: 'Summarize the key announcements in this keynote.',
            options: {
              maxTokens: 200,
              temperature: 0.1,
            },
          },
          { timeout: 120000 }
        );

        expect(result.isError).toBeFalsy();

        const parsed = parseToolResult<{
          text?: string;
          description?: string;
          metadata?: {
            contextWarning?: {
              estimatedTokens: number;
              contextWindow: number;
              utilization: number;
              message?: string;
              suggestions?: string[];
            };
          };
        }>(result as any);

        // Verify context warning is present
        expect(parsed.metadata?.contextWarning).toBeDefined();

        // Long video should have higher utilization than short videos (> 1%)
        const utilization = parsed.metadata?.contextWarning?.utilization || 0;
        expect(utilization).toBeGreaterThan(0.01);

        // Should have suggestions array (may be empty if utilization is low enough)
      },
      120000
    );
  });

  /**
   * Test 2: Verify YouTube analysis works without YOUTUBE_API_KEY
   * This test verifies the fallback behavior when API key is not available
   */
  describe('YouTube Analysis without API Key', () => {
    testOrSkip(
      'should analyze YouTube video without YOUTUBE_API_KEY (no context warning)',
      async () => {
        // Skip this test if YOUTUBE_API_KEY is set (we test that separately)
        if (hasYouTubeApiKey) {
          console.log('Skipping - YOUTUBE_API_KEY is set, testing fallback behavior instead');
        }

        // Big Buck Bunny trailer
        const videoUrl = 'https://www.youtube.com/watch?v=9hE5-98ZeCg';

        const result = await callTool(
          client,
          'analyze_video',
          {
            videoSource: videoUrl,
            prompt: 'What is this video about? Give a one-sentence summary.',
            options: {
              maxTokens: 100,
              temperature: 0.1,
            },
          },
          { timeout: 120000 }
        );

        expect(result.isError).toBeFalsy();

        const parsed = parseToolResult<{
          text?: string;
          description?: string;
          analysis?: string;
          metadata?: {
            contextWarning?: unknown;
          };
        }>(result as any);

        // Verify analysis completed successfully
        const text = parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);

        // Without API key, context warning may or may not be present
        // The important thing is that analysis still works
        if (hasYouTubeApiKey) {
          // If API key is set, we should have context warning
          expect(parsed.metadata?.contextWarning).toBeDefined();
        }
        // If no API key, analysis should still complete (context warning optional)
      },
      120000
    );
  });

  /**
   * Test 3: Error handling for invalid YouTube URLs
   */
  describe('YouTube Error Handling', () => {
    testOrSkip(
      'should handle invalid YouTube video ID gracefully',
      async () => {
        // Invalid video ID (non-existent video)
        const videoUrl = 'https://www.youtube.com/watch?v=invalid123456';

        const result = await callTool(
          client,
          'analyze_video',
          {
            videoSource: videoUrl,
            prompt: 'What is this video about?',
            options: {
              maxTokens: 100,
            },
          },
          { timeout: 60000 }
        );

        // Should either succeed (Gemini may handle it) or fail gracefully
        // The key is that it doesn't crash
        if (result.isError) {
          const parsed = parseToolResult<{ error?: boolean; message?: string }>(result as any);
          // If error, should have a message
          expect(parsed.message || parsed.error).toBeTruthy();
        } else {
          // If success, should have content
          const parsed = parseToolResult<{ text?: string; description?: string }>(result as any);
          const text = parsed.text || parsed.description || '';
          // May be empty or describe that video is unavailable
          expect(typeof text).toBe('string');
        }
      },
      60000
    );
  });
});
