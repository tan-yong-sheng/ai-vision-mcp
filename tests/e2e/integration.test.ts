/**
 * Integration E2E Tests
 *
 * These tests make actual API calls and require a valid GEMINI_API_KEY.
 * They should only be run in CI with secrets or locally with proper setup.
 *
 * To run these tests:
 *   GEMINI_API_KEY=your_key npm run test:e2e
 *
 * These tests are skipped by default to avoid accidental API calls.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
  setupMCPClient,
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

    const setup = await setupMCPClient({
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
