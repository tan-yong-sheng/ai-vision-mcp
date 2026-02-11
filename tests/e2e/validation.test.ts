/**
 * Input Validation E2E Tests
 *
 * Tests verify proper error handling for invalid inputs:
 * - Missing required parameters
 * - Invalid formats
 * - Type checking
 *
 * These tests mock external APIs to avoid actual calls.
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  setupMCPClient,
  teardownMCPClient,
  type TestClient,
  type ServerProcess,
  parseToolResult,
} from './setup.js';

describe.skip('Input Validation Tests', () => {
  let client: TestClient;
  let server: ServerProcess;

  beforeAll(async () => {
    const setup = await setupMCPClient({
      GEMINI_API_KEY: 'test-api-key-for-validation-tests',
    });
    client = setup.client;
    server = setup.server;
  }, 10000);

  afterAll(async () => {
    await teardownMCPClient(client, server);
  }, 10000);

  describe('analyze_image - Missing Parameters', () => {
    test('should return error for missing imageSource', async () => {
      const result = await client.callTool('analyze_image', {
        prompt: 'Describe this image',
        // imageSource is missing
      });

      expect(result.isError).toBe(true);

      const parsed = parseToolResult<{ error: boolean; message: string }>(result);
      expect(parsed.error).toBe(true);
      expect(parsed.message).toMatch(/imageSource/i);
    });

    test('should return error for missing prompt', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'https://example.com/image.jpg',
        // prompt is missing
      });

      expect(result.isError).toBe(true);

      const parsed = parseToolResult<{ error: boolean; message: string }>(result);
      expect(parsed.error).toBe(true);
      expect(parsed.message).toMatch(/prompt/i);
    });

    test('should return error for empty imageSource', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: '',
        prompt: 'Describe this',
      });

      expect(result.isError).toBe(true);

      const parsed = parseToolResult<{ error: boolean; message: string }>(result);
      expect(parsed.error).toBe(true);
    });

    test('should return error for empty prompt', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'https://example.com/image.jpg',
        prompt: '',
      });

      expect(result.isError).toBe(true);

      const parsed = parseToolResult<{ error: boolean; message: string }>(result);
      expect(parsed.error).toBe(true);
    });
  });

  describe('analyze_image - Invalid Image Source Format', () => {
    test('should return error for invalid URL format', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'not-a-valid-url-or-path',
        prompt: 'Describe this',
      });

      expect(result.isError).toBe(true);

      const parsed = parseToolResult<{ error: boolean; message: string }>(result);
      expect(parsed.error).toBe(true);
    });

    test('should return error for malformed base64 data', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'data:image/jpeg;base64,invalid!!!base64',
        prompt: 'Describe this',
      });

      expect(result.isError).toBe(true);

      const parsed = parseToolResult<{ error: boolean; message: string }>(result);
      expect(parsed.error).toBe(true);
    });

    test('should return error for non-existent local file', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: '/nonexistent/path/to/image.jpg',
        prompt: 'Describe this',
      });

      expect(result.isError).toBe(true);

      const parsed = parseToolResult<{ error: boolean; message: string }>(result);
      expect(parsed.error).toBe(true);
    });
  });

  describe('analyze_image - Options Validation', () => {
    test('should return error for temperature out of range (negative)', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        prompt: 'Describe this',
        options: {
          temperature: -0.5,
        },
      });

      expect(result.isError).toBe(true);
    });

    test('should return error for temperature out of range (too high)', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        prompt: 'Describe this',
        options: {
          temperature: 3.0,
        },
      });

      expect(result.isError).toBe(true);
    });

    test('should return error for maxTokens out of range', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        prompt: 'Describe this',
        options: {
          maxTokens: 10000, // Above max of 8192
        },
      });

      expect(result.isError).toBe(true);
    });

    test('should return error for non-integer maxTokens', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        prompt: 'Describe this',
        options: {
          maxTokens: 100.5,
        },
      });

      expect(result.isError).toBe(true);
    });

    test('should return error for topP out of range', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        prompt: 'Describe this',
        options: {
          topP: 1.5,
        },
      });

      expect(result.isError).toBe(true);
    });

    test('should return error for topK out of range', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        prompt: 'Describe this',
        options: {
          topK: 101,
        },
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('compare_images - Validation', () => {
    test('should return error when fewer than 2 images provided', async () => {
      const result = await client.callTool('compare_images', {
        imageSources: ['https://example.com/image1.jpg'],
        prompt: 'Compare these',
      });

      expect(result.isError).toBe(true);
    });

    test('should return error when exceeding max images (default 4)', async () => {
      const result = await client.callTool('compare_images', {
        imageSources: [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
          'https://example.com/4.jpg',
          'https://example.com/5.jpg',
        ],
        prompt: 'Compare these',
      });

      expect(result.isError).toBe(true);

      const parsed = parseToolResult<{ error: boolean; message: string }>(result);
      expect(parsed.error).toBe(true);
      expect(parsed.message).toMatch(/maximum|4 images/i);
    });

    test('should return error for empty imageSources array', async () => {
      const result = await client.callTool('compare_images', {
        imageSources: [],
        prompt: 'Compare these',
      });

      expect(result.isError).toBe(true);
    });

    test('should return error when imageSources is not an array', async () => {
      const result = await client.callTool('compare_images', {
        imageSources: 'not-an-array',
        prompt: 'Compare these',
      });

      expect(result.isError).toBe(true);
    });

    test('should return error for missing prompt', async () => {
      const result = await client.callTool('compare_images', {
        imageSources: [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
        ],
        // prompt is missing
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('detect_objects_in_image - Validation', () => {
    test('should return error for missing imageSource', async () => {
      const result = await client.callTool('detect_objects_in_image', {
        prompt: 'Detect people',
        // imageSource is missing
      });

      expect(result.isError).toBe(true);
    });

    test('should return error for missing prompt', async () => {
      const result = await client.callTool('detect_objects_in_image', {
        imageSource: 'https://example.com/image.jpg',
        // prompt is missing
      });

      expect(result.isError).toBe(true);
    });

    test('should accept valid input with optional outputFilePath', async () => {
      // This will fail at the API level but schema validation should pass
      const result = await client.callTool('detect_objects_in_image', {
        imageSource: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        prompt: 'Detect people',
        outputFilePath: '/tmp/output.jpg',
      });

      // Should fail due to invalid API key or image, not schema validation
      expect(result.isError).toBe(true);
    });
  });

  describe('analyze_video - Validation', () => {
    test('should return error for missing videoSource', async () => {
      const result = await client.callTool('analyze_video', {
        prompt: 'Summarize this video',
        // videoSource is missing
      });

      expect(result.isError).toBe(true);
    });

    test('should return error for missing prompt', async () => {
      const result = await client.callTool('analyze_video', {
        videoSource: 'https://youtube.com/watch?v=test',
        // prompt is missing
      });

      expect(result.isError).toBe(true);
    });

    test('should return error for empty videoSource', async () => {
      const result = await client.callTool('analyze_video', {
        videoSource: '',
        prompt: 'Summarize this',
      });

      expect(result.isError).toBe(true);
    });

    test('should validate video options similar to image options', async () => {
      const result = await client.callTool('analyze_video', {
        videoSource: 'https://youtube.com/watch?v=test',
        prompt: 'Summarize this',
        options: {
          temperature: 2.5, // Out of range
        },
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Type Validation', () => {
    test('should return error when options is not an object', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        prompt: 'Describe this',
        options: 'not-an-object',
      });

      expect(result.isError).toBe(true);
    });

    test('should return error when imageSources array contains non-strings', async () => {
      const result = await client.callTool('compare_images', {
        imageSources: [123, 456],
        prompt: 'Compare these',
      });

      expect(result.isError).toBe(true);
    });

    test('should return error for non-string prompt', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'https://example.com/image.jpg',
        prompt: 12345,
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Error Response Structure', () => {
    test('should include tool name in error response', async () => {
      const result = await client.callTool('analyze_image', {
        prompt: 'Missing image source',
      });

      expect(result.isError).toBe(true);

      const parsed = parseToolResult<{ tool: string }>(result);
      expect(parsed.tool).toBe('analyze_image');
    });

    test('should return JSON-parseable error content', async () => {
      const result = await client.callTool('analyze_image', {
        imageSource: 'invalid-source',
        prompt: 'Describe this',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      // Should be valid JSON
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('error');
      expect(parsed).toHaveProperty('message');
    });
  });
});
