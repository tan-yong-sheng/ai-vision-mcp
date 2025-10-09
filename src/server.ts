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
  version: '0.0.2',
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
          'The prompt describing what you want to know about the image. If the task is **front-end code replication**, the prompt you provide must be: "Describe in detail the layout structure, color style, main components, and interactive elements of the website in this image to facilitate subsequent code generation by the model." + your additional requirements. \ For **other tasks**, the prompt you provide must clearly describe what to analyze, extract, or understand from the image.'
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
            .describe('Maximum number of tokens to generate in the response'),
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
        .max(4)
        .describe(
          'Array of image sources (URLs, base64 data, or file paths) - minimum 2, maximum 4 images'
        ),
      prompt: z
        .string()
        .describe('The prompt describing how you want to compare the images.'),
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
            .describe('Maximum number of tokens to generate in the response'),
        })
        .optional(),
    },
  },
  async ({ imageSources, prompt, options }) => {
    try {
      const validatedArgs = {
        imageSources,
        prompt,
        options,
      };

      // Initialize services on-demand
      const { config, imageProvider, imageFileService } = getServices();

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
      'Detect objects in an image using AI vision models and generate annotated images with bounding boxes. Supports URLs, base64 data, and local file paths. File handling rule as follows: explicit filePath → exact path, large files (≥2MB) → temp directory, small files → inline base64.',
    inputSchema: {
      imageSource: z
        .string()
        .describe(
          'Image source - can be a URL, base64 data (data:image/...), or local file path'
        ),
      prompt: z
        .string()
        .describe(
          'Detection prompt describing what objects to detect. The response will be structured JSON with fields: "object" (object category), "label" (descriptive label), and "normalized_box_2d" ([ymin, xmin, ymax, xmax] in 0-1000 scale). Your prompt should align with these fields. Example: "Detect all buttons. For each, return object as \'button\', label as button text or description, and normalized_box_2d coordinates."'
        ),
      outputFilePath: z
        .string()
        .optional()
        .describe(
          "Optional explicit output path for the annotated image. If provided, the image is saved to this exact path. Relative paths are resolved against the MCP server's current working directory."
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
            .describe('Maximum number of tokens to generate in the response'),
        })
        .optional(),
  },
  },
  async ({ imageSource, prompt, outputFilePath, options }) => {
    try {
      const validatedArgs = {
        imageSource,
        prompt,
        outputFilePath,
        options,
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
                  note: 'Annotated image saved to specified path.',
                },
                null,
                2
              ),
            },
          ],
        };
      } else if ('tempFile' in result) {
        // Case 2: Large file auto-saved to temp
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  detections: result.detections,
                  tempFile: result.tempFile,
                  image_metadata: result.image_metadata,
                  note: 'Large annotated image automatically saved to temporary directory.',
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        // Case 3: Small image returned inline
        const responseContent = [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                detections: result.detections,
                image_metadata: result.image_metadata,
                note: 'Annotated image returned inline (base64 encoded).',
              },
              null,
              2
            ),
          },
        ];

        // Add inline image if available
        if (result.image) {
          responseContent.push({
            type: 'text' as const,
            text: `data:${result.image.mimeType};base64,${result.image.data}`,
          });
        }

        return {
          content: responseContent,
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
            .describe('Maximum number of tokens to generate in the response'),
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
