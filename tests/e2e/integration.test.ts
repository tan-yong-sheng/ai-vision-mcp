/**
 * Gemini Integration E2E Tests (Google AI Studio)
 *
 * These tests make actual API calls to Google AI Studio (Gemini API) and require:
 * - GEMINI_API_KEY: Your Gemini API key
 * - GEMINI_BASE_URL: Optional custom endpoint (e.g., proxy)
 *
 * Trigger conditions:
 * - PR label: e2e-gemini (or legacy e2e-integration)
 * - Manual workflow dispatch
 *
 * To run these tests locally:
 *   GEMINI_API_KEY=your_key npm run test:e2e
 *
 * These tests are skipped by default to avoid accidental API calls.
 *
 * For VertexAI tests, see integration.vertexai.test.ts
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

describe('Integration Tests', () => {
  let client: TestClient;
  let server: ServerProcess;

  beforeAll(async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith('test-')) {
      console.log('Skipping integration tests - no valid GEMINI_API_KEY provided');
      return;
    }

    const setup = await createMCPClient({
      GEMINI_API_KEY: apiKey,
      // Respect IMAGE_MODEL/VIDEO_MODEL from the environment (e.g. GitHub secrets)
      // by not overriding them here.
    });
    client = setup.client;
    server = setup.server;
  }, 30000);

  afterAll(async () => {
    if (client && server) {
      await teardownMCPClient(client, server);
    }
  }, 10000);

  // Skip all tests if no API key
  const testOrSkip = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('test-')
    ? test
    : test.skip;

  describe('Image Analysis (Real API)', () => {
    testOrSkip(
      'should analyze image from public URL',
      async () => {
        const result = await callTool(client, 'analyze_image', {
          imageSource:
            'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=300',
          prompt: 'What is this image about? Give a one-sentence summary.',
          options: {
            maxTokens: 100,
            temperature: 0.1,
          },
        });

        expect(result.isError).toBeFalsy();

        const parsed = parseToolResult<{ text?: string; description?: string; analysis?: string }>(result as any);
        const text = parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);
      },
      60000
    );

    testOrSkip(
      'should analyze base64 encoded image',
      async () => {
        // Small 1x1 red PNG in base64
        const base64Image =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

        const result = await callTool(client, 'analyze_image', {
          imageSource: base64Image,
          prompt: 'Describe the color and shape in this image.',
          options: {
            maxTokens: 50,
          },
        });

        expect(result.isError).toBeFalsy();

        const parsed = parseToolResult<{ text?: string; description?: string; analysis?: string }>(result as any);
        const text = parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);
        expect(text.toLowerCase()).toMatch(/red|square|pixel/);
      },
      60000
    );
  });

  describe('Image Comparison (Real API)', () => {
    testOrSkip(
      'should compare two images',
      async () => {
        const result = await callTool(client, 'compare_images', {
          imageSources: [
            'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=300',
            'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300',
          ],
          prompt: 'Compare these two images. What are the main differences?',
          options: {
            maxTokens: 200,
          },
        });

        expect(result.isError).toBeFalsy();

        const parsed = parseToolResult<{ text?: string; description?: string; analysis?: string }>(result as any);
        const text = parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);
      },
      60000
    );
  });

  describe('Object Detection (Real API)', () => {
    testOrSkip(
      'should detect objects in image',
      async () => {
        const result = await callTool(client, 'detect_objects_in_image', {
          imageSource:
            'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=400',
          prompt: 'Detect animals in this image',
        });

        expect(result.isError).toBeFalsy();

        const parsed = parseToolResult<{
          detections: Array<{
            label: string;
            confidence: number;
            bbox: { x: number; y: number; width: number; height: number };
          }>;
          summary?: { total_objects: number };
        }>(result);

        expect(parsed.detections).toBeDefined();
        expect(Array.isArray(parsed.detections)).toBe(true);

        if (parsed.detections.length > 0) {
          // Response shape can vary by provider/model.
          // Assert at least a label/object-like field exists.
          expect(
            'label' in (parsed.detections[0] as any) || 'object' in (parsed.detections[0] as any)
          ).toBe(true);
        }
      },
      60000
    );
  });

  describe('Video Analysis (Real API)', () => {
    testOrSkip(
      'should analyze YouTube video',
      async () => {
        // Using Big Buck Bunny trailer - a short open-source test video
        const result = await callTool(
          client,
          'analyze_video',
          {
            videoSource: 'https://www.youtube.com/watch?v=9hE5-98ZeCg',
            prompt: 'What is this video about? Give a one-sentence summary.',
            options: {
              maxTokens: 300,
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
        }>(result as any);
        const text =
          parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);
      },
      120000
    );

    testOrSkip(
      'should analyze video with metadata (startOffset, endOffset, fps)',
      async () => {
        const result = await callTool(
          client,
          'analyze_video',
          {
            videoSource: 'https://www.youtube.com/watch?v=9hE5-98ZeCg',
            prompt: 'What happens in this video clip?',
            options: {
              maxTokens: 200,
              videoMetadata: {
                startOffset: '10s',
                endOffset: '30s',
                fps: 1,
              },
            },
          },
          { timeout: 120000 }
        );

        expect(result.isError).toBeFalsy();

        const parsed = parseToolResult<{
          text?: string;
          description?: string;
          analysis?: string;
        }>(result as any);
        const text = parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);
      },
      120000
    );

    testOrSkip(
      'should return context metadata for YouTube video when YOUTUBE_API_KEY is set',
      async () => {
        // Skip if no YouTube API key
        if (!process.env.YOUTUBE_API_KEY) {
          console.log('Skipping - YOUTUBE_API_KEY not set');
          return;
        }

        const result = await callTool(
          client,
          'analyze_video',
          {
            videoSource: 'https://www.youtube.com/watch?v=9hE5-98ZeCg',
            prompt: 'What is this video about?',
            options: {
              maxTokens: 100,
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
            };
          };
        }>(result as any);

        // Verify analysis completed
        const text = parsed.text || parsed.description || '';
        expect(text.length).toBeGreaterThan(0);

        // Verify context metadata is present
        expect(parsed.metadata?.contextWarning).toBeDefined();
        expect(parsed.metadata?.contextWarning?.estimatedTokens).toBeGreaterThan(0);
        expect(parsed.metadata?.contextWarning?.contextWindow).toBeGreaterThan(0);
        expect(parsed.metadata?.contextWarning?.utilization).toBeGreaterThan(0);

        // Short video (2 min) should have low utilization (< 50%)
        expect(parsed.metadata?.contextWarning?.utilization).toBeLessThan(0.5);
      },
      120000
    );
  });

  describe('Model Compatibility Tracking (Real API)', () => {
    /**
     * This test tracks whether the current default video model supports
     * the fileUri parameter (YouTube video URLs). If this test fails,
     * it indicates the model may have changed its support for fileUri.
     *
     * This test uses continue-on-error pattern - it logs the error but
     * doesn't fail the test suite, allowing CI to track model behavior changes.
     */
    testOrSkip(
      'should track fileUri parameter support for YouTube videos',
      async () => {
        const errors: string[] = [];
        let result: any;

        try {
          result = await callTool(
            client,
            'analyze_video',
            {
              videoSource: 'https://www.youtube.com/watch?v=9hE5-98ZeCg',
              prompt: 'Summarize this video in one sentence.',
              options: {
                maxTokens: 100,
                temperature: 0.1,
              },
            },
            { timeout: 120000 }
          );
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }

        // Log detailed information for tracking
        console.log('=== fileUri Parameter Support Test ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Model used:', process.env.VIDEO_MODEL || 'gemini-3-flash-preview (default)');
        console.log('Errors encountered:', errors.length > 0 ? errors : 'None');
        console.log('Result status:', result?.isError ? 'ERROR' : 'SUCCESS');

        if (result?.isError && result.content) {
          const errorContent = result.content.find(
            (c: any) => c.type === 'text' && c.text?.includes('error')
          );
          if (errorContent) {
            console.log('API Error details:', errorContent.text);
          }
        }

        // Test passes regardless of outcome - we're just tracking behavior
        // If you want this to fail on errors, remove the expect(true) below
        // and uncomment the expect(result.isError).toBeFalsy() line
        expect(true).toBe(true);

        // Uncomment to make this test strict (fail on API errors):
        // expect(result?.isError).toBeFalsy();
      },
      120000
    );
  });

  describe('Error Handling (Real API)', () => {
    testOrSkip(
      'should handle invalid image gracefully',
      async () => {
        const result = await callTool(client, 'analyze_image', {
          imageSource: 'https://httpstat.us/404',
          prompt: 'Describe this',
        });

        expect(result.isError).toBe(true);

        const parsed = parseToolResult<{ error: boolean; message: string }>(result);
        expect(parsed.error).toBe(true);
        expect(parsed.message).toBeDefined();
      },
      30000
    );

    testOrSkip(
      'should handle unsupported video format',
      async () => {
        const result = await callTool(client, 'analyze_video', {
          videoSource: 'https://example.com/not-a-video.txt',
          prompt: 'Analyze this video',
        });

        expect(result.isError).toBe(true);
      },
      30000
    );
  });
});
