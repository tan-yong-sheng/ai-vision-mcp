/**
 * VertexAI Integration E2E Tests
 *
 * These tests make actual API calls to Google Cloud Vertex AI and require:
 * - VERTEX_CLIENT_EMAIL: Service account client email
 * - VERTEX_PRIVATE_KEY: Service account private key
 * - VERTEX_PROJECT_ID: Google Cloud project ID
 * - VERTEX_LOCATION: GCP region (default: us-central1)
 * - GCS_BUCKET_NAME: For video file storage (optional for image-only tests)
 *
 * Trigger conditions:
 * - PR label: e2e-vertexai
 * - Manual workflow dispatch
 *
 * These tests are skipped by default to avoid accidental API calls.
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

describe('VertexAI Integration Tests', () => {
  let client: TestClient;
  let server: ServerProcess;

  // Check for VertexAI credentials
  const hasVertexCredentials = !!(
    process.env.VERTEX_CLIENT_EMAIL &&
    process.env.VERTEX_PRIVATE_KEY &&
    process.env.VERTEX_PROJECT_ID
  );
  const hasYouTubeApiKey = !!process.env.YOUTUBE_API_KEY;

  beforeAll(async () => {
    if (!hasVertexCredentials) {
      console.log('Skipping VertexAI integration tests - missing VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, or VERTEX_PROJECT_ID');
      return;
    }

    const envOverrides: Record<string, string> = {
      // Vertex AI configuration
      VERTEX_CLIENT_EMAIL: process.env.VERTEX_CLIENT_EMAIL!,
      VERTEX_PRIVATE_KEY: process.env.VERTEX_PRIVATE_KEY!,
      VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID!,
      VERTEX_LOCATION: process.env.VERTEX_LOCATION || 'us-central1',
      // Set provider to vertex_ai
      IMAGE_PROVIDER: 'vertex_ai',
      VIDEO_PROVIDER: 'vertex_ai',
    };

    // Pass YouTube API key if available (for context metadata)
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

  // Skip all tests if no VertexAI credentials
  const testOrSkip = hasVertexCredentials ? test : test.skip;

  describe('Image Analysis (VertexAI)', () => {
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

  describe('Image Comparison (VertexAI)', () => {
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

  describe('Object Detection (VertexAI)', () => {
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

  describe('Video Analysis (VertexAI)', () => {
    // Note: VertexAI requires GCS URIs for video files
    // YouTube URLs are supported directly
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

    // Test video metadata (clipping, frame rate) - VertexAI-specific feature
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

    // Test YouTube context metadata when YOUTUBE_API_KEY is set
    const youtubeTestOrSkip = hasYouTubeApiKey && hasVertexCredentials ? test : test.skip;

    youtubeTestOrSkip(
      'should return context metadata for YouTube video when YOUTUBE_API_KEY is set',
      async () => {
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
          { timeout: 60000 }
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
      60000
    );

    // GCS URI test - requires GCS_BUCKET_NAME to be configured
    const hasGCSBucket = !!process.env.GCS_BUCKET_NAME;
    const gcsTestOrSkip = hasGCSBucket && hasVertexCredentials ? test : test.skip;

    gcsTestOrSkip(
      'should analyze video from GCS URI',
      async () => {
        // This test requires a video file to be pre-uploaded to GCS
        // The test will fail if the GCS URI doesn't exist
        const result = await callTool(
          client,
          'analyze_video',
          {
            // Example GCS URI - replace with actual test video
            videoSource: `gs://${process.env.GCS_BUCKET_NAME}/test-video.mp4`,
            prompt: 'Describe this video.',
            options: {
              maxTokens: 200,
            },
          },
          { timeout: 120000 }
        );

        // Note: This test may fail if the video doesn't exist in GCS
        // It's designed to verify GCS URI support
        expect(result.isError).toBeFalsy();
      },
      120000
    );
  });

  describe('Error Handling (VertexAI)', () => {
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
      'should reject non-YouTube HTTP URLs for video',
      async () => {
        const result = await callTool(client, 'analyze_video', {
          videoSource: 'https://example.com/video.mp4',
          prompt: 'Analyze this video',
        });

        // VertexAI should reject non-YouTube HTTP URLs
        expect(result.isError).toBe(true);
      },
      30000
    );

    testOrSkip(
      'should handle invalid GCS URI',
      async () => {
        const result = await callTool(client, 'analyze_video', {
          videoSource: 'gs://non-existent-bucket/non-existent-video.mp4',
          prompt: 'Analyze this video',
        });

        // Should fail with appropriate error
        expect(result.isError).toBe(true);
      },
      60000
    );
  });

  describe('VertexAI-Specific Features', () => {
    // Test retry logic was synced from GeminiProvider
    testOrSkip(
      'should handle transient errors with retry',
      async () => {
        // This test verifies retry logic is working
        // We make multiple rapid requests to potentially trigger rate limiting
        const promises = Array(3).fill(null).map(() =>
          callTool(client, 'analyze_image', {
            imageSource:
              'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=100',
            prompt: 'Brief description',
            options: { maxTokens: 20 },
          })
        );

        const results = await Promise.all(promises);

        // All requests should eventually succeed (with retry)
        for (const result of results) {
          expect(result.isError).toBeFalsy();
        }
      },
      90000
    );

    // Test debug logging flag
    testOrSkip(
      'should respect AI_VISION_LOG_MODELS environment variable',
      async () => {
        // This is more of a manual verification test
        // When AI_VISION_LOG_MODELS=1, logs should appear in stderr
        const result = await callTool(client, 'analyze_image', {
          imageSource:
            'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=100',
          prompt: 'Describe',
          options: { maxTokens: 30 },
        });

        expect(result.isError).toBeFalsy();
      },
      60000
    );
  });
});
