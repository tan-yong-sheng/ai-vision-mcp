/**
 * Main MCP Server implementation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ConfigService } from './services/ConfigService.js';
import { FileService } from './services/FileService.js';
import { VisionProviderFactory } from './providers/factory/ProviderFactory.js';
import { analyze_image, analyze_video } from './tools/index.js';
import type { VisionProvider } from './types/Providers.js';
import { VisionError } from './types/Errors.js';

// Create MCP server
const server = new McpServer({
  name: 'ai-vision-mcp',
  version: '0.0.1',
});

// Helper function to initialize services (lazy loading)
function getServices() {
  try {
    // Initialize configuration
    const config = ConfigService.load();

    // Create providers using factory
    const imageProvider = VisionProviderFactory.createProviderWithValidation(
      config,
      'image'
    );
    const videoProvider = VisionProviderFactory.createProviderWithValidation(
      config,
      'video'
    );

    // Create file services for handling file uploads
    const imageFileService = new FileService(config, 'image', imageProvider as any);
    const videoFileService = new FileService(config, 'video', videoProvider as any);

    return { config, imageProvider, videoProvider, imageFileService, videoFileService };
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

// Register analyze_image tool
server.registerTool(
  'analyze_image',
  {
    title: 'Analyze Image',
    description: 'Analyze an image using AI vision models. Supports URLs, base64 data, and local file paths.',
    inputSchema: {
      imageSource: z.string().describe('Image source - can be a URL, base64 data (data:image/...), or local file path'),
      prompt: z.string().describe('The prompt describing what you want to know about the image'),
      options: z.object({
        temperature: z.number().min(0).max(2).optional().describe('Controls randomness in the response (0.0 = deterministic, 2.0 = very random)'),
        maxTokens: z.number().int().min(1).max(8192).optional().describe('Maximum number of tokens to generate in the response'),
      }).optional(),
    },
  },
  async ({ imageSource, prompt, options }) => {
    try {
      const validatedArgs = {
        imageSource,
        prompt,
        options,
      };

      // Initialize services on-demand
      const { config, imageProvider, imageFileService } = getServices();

      const result = await analyze_image(validatedArgs, config, imageProvider, imageFileService);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error executing analyze_image tool:', error);

      let errorMessage = 'An unknown error occurred';
      if (error instanceof VisionError) {
        errorMessage = `${error.name}: ${error.message}`;
        if (error.provider) {
          errorMessage += ` (Provider: ${error.provider})`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: true,
                message: errorMessage,
                tool: 'analyze_image',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
);

// Register analyze_video tool
server.registerTool(
  'analyze_video',
  {
    title: 'Analyze Video',
    description: 'Analyze a video using AI vision models. Supports URLs and local file paths.',
    inputSchema: {
      videoSource: z.string().describe('Video source - can be a URL or local file path'),
      prompt: z.string().describe('The prompt describing what you want to know about the video'),
      options: z.object({
        temperature: z.number().min(0).max(2).optional().describe('Controls randomness in the response (0.0 = deterministic, 2.0 = very random)'),
        maxTokens: z.number().int().min(1).max(8192).optional().describe('Maximum number of tokens to generate in the response'),
      }).optional(),
    },
  },
  async ({ videoSource, prompt, options }) => {
    try {
      const validatedArgs = {
        videoSource,
        prompt,
        options,
      };

      // Initialize services on-demand
      const { config, videoProvider, videoFileService } = getServices();

      const result = await analyze_video(validatedArgs, config, videoProvider, videoFileService);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error executing analyze_video tool:', error);

      let errorMessage = 'An unknown error occurred';
      if (error instanceof VisionError) {
        errorMessage = `${error.name}: ${error.message}`;
        if (error.provider) {
          errorMessage += ` (Provider: ${error.provider})`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: true,
                message: errorMessage,
                tool: 'analyze_video',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down MCP server...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down MCP server...');
  await server.close();
  process.exit(0);
});

// Start server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('AI Vision MCP Server started successfully');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main();
