/**
 * YouTube Video E2E Tests (Vertex AI)
 *
 * These tests validate the same YouTube behavior as the Gemini YouTube suite,
 * but using Vertex AI (service account) authentication.
 *
 * Prerequisites:
 * - VERTEX_CLIENT_EMAIL
 * - VERTEX_PRIVATE_KEY
 * - VERTEX_PROJECT_ID
 * - (optional) VERTEX_LOCATION
 * - (optional but recommended for metadata) YOUTUBE_API_KEY
 *
 * Notes:
 * - Keep the “true” LLM-calling test minimal (short video) to reduce cost/flakiness.
 * - Context warning metadata is computed from YouTube Data API duration, not from
 *   the LLM response itself.
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

describe('YouTube Video Analysis E2E Tests (VertexAI)', () => {
  let client: TestClient;
  let server: ServerProcess;

  const hasVertexCredentials = !!(
    process.env.VERTEX_CLIENT_EMAIL &&
    process.env.VERTEX_PRIVATE_KEY &&
    process.env.VERTEX_PROJECT_ID
  );
  const hasYouTubeApiKey = !!process.env.YOUTUBE_API_KEY;

  beforeAll(async () => {
    if (!hasVertexCredentials) {
      console.log(
        'Skipping VertexAI YouTube tests - missing VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, or VERTEX_PROJECT_ID'
      );
      return;
    }

    const envOverrides: Record<string, string> = {
      VERTEX_CLIENT_EMAIL: process.env.VERTEX_CLIENT_EMAIL!,
      VERTEX_PRIVATE_KEY: process.env.VERTEX_PRIVATE_KEY!,
      VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID!,
      VERTEX_LOCATION: process.env.VERTEX_LOCATION || 'us-central1',
      IMAGE_PROVIDER: 'vertex_ai',
      VIDEO_PROVIDER: 'vertex_ai',
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

  const testOrSkip = hasVertexCredentials ? test : test.skip;

  describe('YouTube Data API v3 Integration (VertexAI)', () => {
    const testWithApiKey = hasYouTubeApiKey && hasVertexCredentials ? test : test.skip;

    testWithApiKey(
      'should return context metadata for YouTube video when YOUTUBE_API_KEY is set',
      async () => {
        // Big Buck Bunny trailer - ~2 minutes
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

        const text = parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);

        expect(parsed.metadata?.contextWarning).toBeDefined();
        expect(parsed.metadata?.contextWarning?.estimatedTokens).toBeGreaterThan(0);
        expect(parsed.metadata?.contextWarning?.contextWindow).toBeGreaterThan(0);
        expect(parsed.metadata?.contextWarning?.utilization).toBeGreaterThan(0);
        expect(parsed.metadata?.contextWarning?.utilization).toBeLessThan(0.5);
        expect(Array.isArray(parsed.metadata?.contextWarning?.suggestions)).toBe(true);
      },
      120000
    );
  });

  describe('YouTube Analysis without API Key (VertexAI)', () => {
    testOrSkip(
      'should analyze YouTube video without YOUTUBE_API_KEY',
      async () => {
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

        const text = parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);

        // If key is present, ensure it's returned; otherwise don't require it.
        if (hasYouTubeApiKey) {
          expect(parsed.metadata?.contextWarning).toBeDefined();
        }
      },
      120000
    );
  });
});
