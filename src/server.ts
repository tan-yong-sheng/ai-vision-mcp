/**
 * Main MCP Server implementation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ConfigService } from './services/ConfigService.js';
import { FileService } from './services/FileService.js';
import { VisionProviderFactory } from './providers/factory/ProviderFactory.js';
import {
  analyze_image,
  compare_images,
  analyze_video,
  detect_objects_in_image,
} from './tools/index.js';
import { VisionError } from './types/Errors.js';

// Create MCP server
const server = new McpServer({
  name: 'ai-vision-mcp',
  version: '0.0.3',
});

// Helper function to initialize services (lazy loading)
function getServices() {
  try {
    // Initialize configuration
    const configService = ConfigService.getInstance();
    const config = configService.getConfig();

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
    const imageFileService = new FileService(
      configService,
      'image',
      imageProvider as any
    );
    const videoFileService = new FileService(
      configService,
      'video',
      videoProvider as any
    );

    return {
      config,
      configService,
      imageProvider,
      videoProvider,
      imageFileService,
      videoFileService,
    };
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
    description:
      'Analyze an image using AI vision models. Supports URLs, base64 data, and local file paths.',
    inputSchema: {
      imageSource: z
        .string()
        .describe(
          'Image source - can be a URL, base64 data (data:image/...), or local file path'
        ),
      prompt: z
        .string()
        .describe(
          'The prompt describing how you want to compare the images. If the task is **front-end or UI comparison**, the prompt you provide must be: "Compare the given screenshots and describe differences in layout structure, component arrangement, color scheme, typography, and visual hierarchy. Pay attention to common sections such as the navbar, header, footer, and main content areas to identify style or layout inconsistencies." + your additional requirements. \ For **other tasks**, the prompt you provide must clearly describe what to compare, identify, or analyze between the images.'
        ),
      options: z
        .object({
          temperature: z
            .number()
            .min(0)
            .max(2)
            .optional()
            .describe(
              'Controls randomness in the response (0.0 = deterministic, 2.0 = very random)'
            ),
          topP: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Nucleus sampling parameter (0.0-1.0)'),
          topK: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe('Top-k sampling parameter (1-100)'),
          maxTokens: z
            .number()
            .int()
            .min(1)
            .max(8192)
            .optional()
            .describe(
              'Maximum number of tokens to generate in the response. For detailed image analysis, 1000-2000 tokens typically sufficient.'
            ),
        })
        .optional(),
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

      const result = await analyze_image(
        validatedArgs,
        config,
        imageProvider,
        imageFileService
      );

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

// Register compare_images tool
server.registerTool(
  'compare_images',
  {
    title: 'Compare Images',
    description:
      'Compare multiple images using AI vision models. Supports URLs, base64 data, and local file paths.',
    inputSchema: {
      imageSources: z
        .array(z.string())
        .min(2)
        .describe(
          'Array of image sources (URLs, base64 data, or file paths) - minimum 2 images. Maximum determined by MAX_IMAGES_FOR_COMPARISON environment variable (default: 4)'
        ),
      prompt: z
        .string()
        .describe('The prompt describing how you want to compare the images. If the task is **front-end or UI consistency**, the prompt you provide must specify what to evaluate — such as layout alignment, component structure, spacing, typography, color consistency, and visual hierarchy. Pay special attention to shared sections like the **navbar**, **header**, **footer**, and **main content areas** to identify layout shifts or inconsistent styles between versions. \ For **other tasks**, the prompt you provide must clearly describe what aspects to compare or analyze — such as visual differences, content changes, design variations, or quality degradation.'),
      options: z
        .object({
          temperature: z
            .number()
            .min(0)
            .max(2)
            .optional()
            .describe(
              'Controls randomness in the response (0.0 = deterministic, 2.0 = very random)'
            ),
          topP: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Nucleus sampling parameter (0.0-1.0)'),
          topK: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe('Top-k sampling parameter (1-100)'),
          maxTokens: z
            .number()
            .int()
            .min(1)
            .max(8192)
            .optional()
            .describe(
              'Maximum number of tokens to generate in the response. For comparing multiple images, recommend 1500-3000 tokens for comprehensive analysis.'
            ),
        })
        .optional(),
    },
  },
  async ({ imageSources, prompt, options }) => {
    try {
      // Initialize services on-demand to get config
      const { config, imageProvider, imageFileService } = getServices();

      // Dynamic validation using config
      const maxImages = config.MAX_IMAGES_FOR_COMPARISON || 4;
      if (imageSources.length > maxImages) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: true,
                  message: `Maximum ${maxImages} images allowed for comparison, received ${imageSources.length}. Configure MAX_IMAGES_FOR_COMPARISON environment variable to change this limit.`,
                  tool: 'compare_images',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const validatedArgs = {
        imageSources,
        prompt,
        options,
      };

      const result = await compare_images(
        validatedArgs,
        config,
        imageProvider,
        imageFileService
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error executing compare_images tool:', error);

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
                tool: 'compare_images',
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

// Register detect_objects_in_image tool
server.registerTool(
  'detect_objects_in_image',
  {
    title: 'Detect Objects in Image',
    description:
      'Detect objects in an image using AI vision models and generate annotated images with bounding boxes. Supports URLs, base64 data, and local file paths. File handling: explicit filePath → exact path, otherwise → temp directory. Uses optimized default parameters for object detection.',
    inputSchema: {
      imageSource: z
        .string()
        .describe(
          'Image source - can be a URL, base64 data (data:image/...), or local file path'
        ),
      prompt: z
        .string()
        .describe(
          'Text prompt describing what to detect or recognize in the image. Avoid including any instructions about output structure or formatting — these are automatically managed by the workflow.'
        ),
      outputFilePath: z
        .string()
        .optional()
        .describe(
          "Optional explicit output path for the annotated image. If provided, the image is saved to this exact path. Relative paths are resolved against the MCP server's current working directory."
        ),
    },
  },
  async ({ imageSource, prompt, outputFilePath }) => {
    try {
      const validatedArgs = {
        imageSource,
        prompt,
        outputFilePath,
        // Remove options parameter - use environment variable configuration instead
      };

      // Initialize services on-demand
      const { config, imageProvider, imageFileService } = getServices();

      const result = await detect_objects_in_image(
        validatedArgs,
        config,
        imageProvider,
        imageFileService
      );

      // Handle different response types
      if ('file' in result) {
        // Case 1: Explicit file path provided
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  detections: result.detections,
                  file: result.file,
                  image_metadata: result.image_metadata,
                  summary: result.summary,
                  metadata: result.metadata,
                },
                null,
                2
              ),
            },
          ],
        };
      } else if ('tempFile' in result) {
        // Case 2: Auto-saved to temp directory
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  detections: result.detections,
                  tempFile: result.tempFile,
                  image_metadata: result.image_metadata,
                  summary: result.summary,
                  metadata: result.metadata,
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        // Case 3: File saving skipped due to permission error
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  detections: result.detections,
                  image_metadata: result.image_metadata,
                  summary: result.summary,
                  metadata: result.metadata,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    } catch (error) {
      console.error('Error executing detect_objects_in_image tool:', error);

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
            type: 'text' as const,
            text: JSON.stringify(
              {
                error: true,
                message: errorMessage,
                tool: 'detect_objects_in_image',
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
    description:
      'Analyze a video using AI vision models. Supports URLs and local file paths.',
    inputSchema: {
      videoSource: z
        .string()
        .describe('Video source - can be a URL or local file path'),
      prompt: z
        .string()
        .describe(
          'The prompt describing what you want to know about the video.'
        ),
      options: z
        .object({
          temperature: z
            .number()
            .min(0)
            .max(2)
            .optional()
            .describe(
              'Controls randomness in the response (0.0 = deterministic, 2.0 = very random)'
            ),
          topP: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Nucleus sampling parameter (0.0-1.0)'),
          topK: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe('Top-k sampling parameter (1-100)'),
          maxTokens: z
            .number()
            .int()
            .min(1)
            .max(8192)
            .optional()
            .describe(
              'Maximum number of tokens to generate in the response. For video analysis, recommend 2000-4000 tokens for comprehensive temporal understanding.'
            ),
        })
        .optional(),
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

      const result = await analyze_video(
        validatedArgs,
        config,
        videoProvider,
        videoFileService
      );

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
