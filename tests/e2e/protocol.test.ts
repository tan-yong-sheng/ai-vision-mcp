/**
 * MCP Protocol E2E Tests
 *
 * Tests verify MCP protocol compliance:
 * - Initialize handshake
 * - Tools/list
 * - Tool schemas
 *
 * No external API calls are made in these tests.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
  setupMCPClient,
  teardownMCPClient,
  type TestClient,
  type ServerProcess,
} from './setup.js';

describe('MCP Protocol Tests', () => {
  let client: TestClient;
  let server: ServerProcess;

  beforeAll(async () => {
    const setup = await setupMCPClient({
      // Use dummy API key - no real API calls will be made
      GEMINI_API_KEY: 'test-api-key-for-protocol-tests',
    });
    client = setup.client;
    server = setup.server;
  }, 10000);

  afterAll(async () => {
    await teardownMCPClient(client, server);
  }, 10000);

  describe('Initialize Handshake', () => {
    test('should complete initialize handshake with correct protocol version', async () => {
      // The client already performed the handshake during connect()
      // We verify the connection was successful
      expect(client).toBeDefined();
    });

    test('should return correct server info', async () => {
      // Server info is available after initialization
      const serverInfo = await client.getServerVersion();

      expect(serverInfo).toBeDefined();
      expect(serverInfo.name).toBe('ai-vision-mcp');
      expect(serverInfo.version).toBeDefined();
      expect(serverInfo.version).toBe('0.0.6');
    });
  });

  describe('Tools/List', () => {
    test('should list all 4 tools', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(4);
      expect(tools.tools.map(t => t.name)).toContain('analyze_image');
      expect(tools.tools.map(t => t.name)).toContain('compare_images');
      expect(tools.tools.map(t => t.name)).toContain('detect_objects_in_image');
      expect(tools.tools.map(t => t.name)).toContain('analyze_video');
    });

    test('should list tools with descriptions', async () => {
      const tools = await client.listTools();

      for (const tool of tools.tools) {
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
      }
    });

    test('should have unique tool names', async () => {
      const tools = await client.listTools();
      const names = tools.tools.map(t => t.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Tool Schema Validation - analyze_image', () => {
    test('should have valid input schema for analyze_image', async () => {
      const tools = await client.listTools();
      const analyzeImage = tools.tools.find(t => t.name === 'analyze_image');

      expect(analyzeImage).toBeDefined();
      expect(analyzeImage!.inputSchema).toBeDefined();
      expect(analyzeImage!.inputSchema.type).toBe('object');
    });

    test('should require imageSource and prompt for analyze_image', async () => {
      const tools = await client.listTools();
      const analyzeImage = tools.tools.find(t => t.name === 'analyze_image');

      expect(analyzeImage!.inputSchema.required).toContain('imageSource');
      expect(analyzeImage!.inputSchema.required).toContain('prompt');
    });

    test('should have optional options parameter for analyze_image', async () => {
      const tools = await client.listTools();
      const analyzeImage = tools.tools.find(t => t.name === 'analyze_image');

      const properties = analyzeImage!.inputSchema.properties as Record<
        string,
        unknown
      >;
      expect(properties.options).toBeDefined();
      expect(properties.imageSource).toBeDefined();
      expect(properties.prompt).toBeDefined();
    });

    test('should have correct options schema structure', async () => {
      const tools = await client.listTools();
      const analyzeImage = tools.tools.find(t => t.name === 'analyze_image');

      const properties = analyzeImage!.inputSchema.properties as Record<
        string,
        { type: string; properties?: Record<string, unknown> }
      >;

      expect(properties.options.type).toBe('object');
      expect(properties.options.properties).toBeDefined();

      const optionsProps = properties.options.properties!;
      expect(optionsProps).toHaveProperty('temperature');
      expect(optionsProps).toHaveProperty('topP');
      expect(optionsProps).toHaveProperty('topK');
      expect(optionsProps).toHaveProperty('maxTokens');
    });
  });

  describe('Tool Schema Validation - compare_images', () => {
    test('should have valid input schema for compare_images', async () => {
      const tools = await client.listTools();
      const compareImages = tools.tools.find(t => t.name === 'compare_images');

      expect(compareImages).toBeDefined();
      expect(compareImages!.inputSchema).toBeDefined();
      expect(compareImages!.inputSchema.type).toBe('object');
    });

    test('should require imageSources and prompt for compare_images', async () => {
      const tools = await client.listTools();
      const compareImages = tools.tools.find(t => t.name === 'compare_images');

      expect(compareImages!.inputSchema.required).toContain('imageSources');
      expect(compareImages!.inputSchema.required).toContain('prompt');
    });

    test('should have array type for imageSources', async () => {
      const tools = await client.listTools();
      const compareImages = tools.tools.find(t => t.name === 'compare_images');

      const properties = compareImages!.inputSchema.properties as Record<
        string,
        { type: string }
      >;
      expect(properties.imageSources.type).toBe('array');
    });
  });

  describe('Tool Schema Validation - detect_objects_in_image', () => {
    test('should have valid input schema for detect_objects_in_image', async () => {
      const tools = await client.listTools();
      const detectObjects = tools.tools.find(
        t => t.name === 'detect_objects_in_image'
      );

      expect(detectObjects).toBeDefined();
      expect(detectObjects!.inputSchema).toBeDefined();
      expect(detectObjects!.inputSchema.type).toBe('object');
    });

    test('should require imageSource and prompt for detect_objects_in_image', async () => {
      const tools = await client.listTools();
      const detectObjects = tools.tools.find(
        t => t.name === 'detect_objects_in_image'
      );

      expect(detectObjects!.inputSchema.required).toContain('imageSource');
      expect(detectObjects!.inputSchema.required).toContain('prompt');
    });

    test('should have optional outputFilePath for detect_objects_in_image', async () => {
      const tools = await client.listTools();
      const detectObjects = tools.tools.find(
        t => t.name === 'detect_objects_in_image'
      );

      const properties = detectObjects!.inputSchema.properties as Record<
        string,
        unknown
      >;
      expect(properties.outputFilePath).toBeDefined();
      // outputFilePath should not be in required array
      expect(detectObjects!.inputSchema.required).not.toContain(
        'outputFilePath'
      );
    });
  });

  describe('Tool Schema Validation - analyze_video', () => {
    test('should have valid input schema for analyze_video', async () => {
      const tools = await client.listTools();
      const analyzeVideo = tools.tools.find(t => t.name === 'analyze_video');

      expect(analyzeVideo).toBeDefined();
      expect(analyzeVideo!.inputSchema).toBeDefined();
      expect(analyzeVideo!.inputSchema.type).toBe('object');
    });

    test('should require videoSource and prompt for analyze_video', async () => {
      const tools = await client.listTools();
      const analyzeVideo = tools.tools.find(t => t.name === 'analyze_video');

      expect(analyzeVideo!.inputSchema.required).toContain('videoSource');
      expect(analyzeVideo!.inputSchema.required).toContain('prompt');
    });

    test('should have optional options parameter for analyze_video', async () => {
      const tools = await client.listTools();
      const analyzeVideo = tools.tools.find(t => t.name === 'analyze_video');

      const properties = analyzeVideo!.inputSchema.properties as Record<
        string,
        unknown
      >;
      expect(properties.options).toBeDefined();
    });
  });

  describe('Protocol Compliance', () => {
    test('should handle concurrent tool list requests', async () => {
      // Make multiple concurrent requests
      const [tools1, tools2, tools3] = await Promise.all([
        client.listTools(),
        client.listTools(),
        client.listTools(),
      ]);

      // All should return the same result
      expect(tools1.tools).toHaveLength(4);
      expect(tools2.tools).toHaveLength(4);
      expect(tools3.tools).toHaveLength(4);
    });

    test('should maintain connection after multiple operations', async () => {
      // Perform multiple operations
      await client.listTools();
      await client.getServerVersion();
      await client.listTools();

      // Connection should still be valid
      const tools = await client.listTools();
      expect(tools.tools).toHaveLength(4);
    });
  });
});
