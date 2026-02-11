/**
 * Mock Utilities for Gemini SDK and HTTP Fetch
 *
 * Provides mocks for:
 * - @google/genai SDK
 * - node-fetch for image URLs
 * - File system operations (optional)
 *
 * Use these mocks to test file handling without making actual API calls.
 */

import { vi } from 'vitest';
import type { AnalysisResult, DetectionResult } from '../types/Providers.js';

// Re-export types for convenience
export type { AnalysisResult, DetectionResult };

// ============================================================================
// Gemini SDK Mocks
// ============================================================================

export interface MockGeminiModel {
  generateContent: ReturnType<typeof vi.fn>;
  generateContentStream: ReturnType<typeof vi.fn>;
}

export interface MockGeminiClient {
  models: {
    generateContent: ReturnType<typeof vi.fn>;
    generateContentStream: ReturnType<typeof vi.fn>;
  };
  files?: {
    upload: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

/**
 * Create a mock Gemini client with canned responses
 */
export function createMockGeminiClient(
  overrides: Partial<MockGeminiClient> = {}
): MockGeminiClient {
  const defaultAnalysisResponse: AnalysisResult = {
    description: 'This is a test image showing a sample scene.',
    metadata: {
      model: 'gemini-2.0-flash',
      provider: 'google',
      total_tokens: 150,
    },
  };

  const defaultDetectionResponse = {
    detections: [
      {
        label: 'person',
        confidence: 0.95,
        bbox: { x: 100, y: 100, width: 200, height: 300 },
      },
      {
        label: 'car',
        confidence: 0.87,
        bbox: { x: 400, y: 200, width: 150, height: 100 },
      },
    ],
    image_metadata: {
      width: 800,
      height: 600,
      format: 'jpeg',
    },
    summary: {
      total_objects: 2,
      unique_labels: ['person', 'car'],
    },
    metadata: {
      model: 'gemini-2.0-flash',
      provider: 'google',
      total_tokens: 200,
    },
  };

  return {
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: () => JSON.stringify(defaultAnalysisResponse),
      }),
      generateContentStream: vi.fn().mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield { text: () => JSON.stringify(defaultAnalysisResponse) };
        },
      }),
      ...overrides.models,
    },
    files: {
      upload: vi.fn().mockResolvedValue({
        uri: 'https://generativelanguage.googleapis.com/files/test-file',
        name: 'files/test-file',
        mimeType: 'image/jpeg',
      }),
      get: vi.fn().mockResolvedValue({
        uri: 'https://generativelanguage.googleapis.com/files/test-file',
        state: 'ACTIVE',
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      ...overrides.files,
    },
  };
}

/**
 * Create a mock Gemini client that returns specific analysis results
 */
export function createMockGeminiClientWithAnalysis(
  analysisResult: AnalysisResult
): MockGeminiClient {
  return createMockGeminiClient({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: () => JSON.stringify(analysisResult),
      }),
      generateContentStream: vi.fn().mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield { text: () => JSON.stringify(analysisResult) };
        },
      }),
    },
  });
}

/**
 * Create a mock Gemini client that returns specific detection results
 */
export function createMockGeminiClientWithDetections(
  detectionResult: DetectionResult
): MockGeminiClient {
  return createMockGeminiClient({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: () => JSON.stringify(detectionResult),
      }),
      generateContentStream: vi.fn().mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield { text: () => JSON.stringify(detectionResult) };
        },
      }),
    },
  });
}

/**
 * Create a mock Gemini client that simulates API errors
 */
export function createMockGeminiClientWithError(
  error: Error
): MockGeminiClient {
  return createMockGeminiClient({
    models: {
      generateContent: vi.fn().mockRejectedValue(error),
      generateContentStream: vi.fn().mockRejectedValue(error),
    },
  });
}

// ============================================================================
// Fetch Mocks
// ============================================================================

export interface MockFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
}

/**
 * Create a mock fetch response for successful image fetch
 */
export function createMockImageResponse(
  imageBuffer: ArrayBuffer,
  contentType: string = 'image/jpeg'
): MockFetchResponse {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'content-type': contentType,
      'content-length': String(imageBuffer.byteLength),
    }),
    arrayBuffer: () => Promise.resolve(imageBuffer),
    text: () => Promise.resolve(''),
    json: () => Promise.reject(new Error('Response is not JSON')),
  };
}

/**
 * Create a mock fetch response for HTTP errors
 */
export function createMockErrorResponse(
  status: number = 404,
  statusText: string = 'Not Found'
): MockFetchResponse {
  return {
    ok: false,
    status,
    statusText,
    headers: new Headers(),
    arrayBuffer: () => Promise.reject(new Error(`HTTP ${status}: ${statusText}`)),
    text: () => Promise.resolve(''),
    json: () => Promise.reject(new Error(`HTTP ${status}: ${statusText}`)),
  };
}

/**
 * Setup global fetch mock
 */
export function setupFetchMock(
  responseOrImplementation:
    | MockFetchResponse
    | ((url: string) => MockFetchResponse | Promise<MockFetchResponse>)
): void {
  const fetchMock = vi.fn();

  if (typeof responseOrImplementation === 'function') {
    fetchMock.mockImplementation(responseOrImplementation);
  } else {
    fetchMock.mockResolvedValue(responseOrImplementation);
  }

  // @ts-expect-error - Mocking global fetch
  global.fetch = fetchMock;
}

/**
 * Create a fake image buffer for testing
 */
export function createFakeImageBuffer(
  mimeType: string = 'image/jpeg',
  size: number = 1024
): ArrayBuffer {
  // Minimal valid JPEG header bytes
  const jpegHeader = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);

  // Minimal valid PNG header bytes
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  let header: Uint8Array;
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    header = jpegHeader;
  } else if (mimeType === 'image/png') {
    header = pngHeader;
  } else {
    header = jpegHeader;
  }

  const buffer = new ArrayBuffer(Math.max(size, header.length));
  const view = new Uint8Array(buffer);
  view.set(header);

  // Fill rest with random data
  for (let i = header.length; i < size; i++) {
    view[i] = Math.floor(Math.random() * 256);
  }

  return buffer;
}

// ============================================================================
// Module Mocks
// ============================================================================

/**
 * Mock the @google/genai module
 * Use in test setup: vi.mock('@google/genai', () => mockGoogleGenAIModule())
 */
export function mockGoogleGenAIModule(mockClient?: MockGeminiClient) {
  const client = mockClient ?? createMockGeminiClient();

  return {
    GoogleGenAI: vi.fn().mockImplementation(() => client),
    __mockClient: client,
  };
}

/**
 * Mock node-fetch module
 * Use in test setup: vi.mock('node-fetch', () => mockNodeFetchModule())
 */
export function mockNodeFetchModule(
  response: MockFetchResponse | ((url: string) => MockFetchResponse)
) {
  const fetchMock = vi.fn();

  if (typeof response === 'function') {
    fetchMock.mockImplementation(response);
  } else {
    fetchMock.mockResolvedValue(response);
  }

  return {
    default: fetchMock,
    __mockFetch: fetchMock,
  };
}

// ============================================================================
// Error Simulation
// ============================================================================

/**
 * Common error types for testing error handling
 */
export const GeminiErrors = {
  invalidApiKey: new Error('Invalid API key provided'),
  rateLimitExceeded: new Error('429 Too Many Requests'),
  quotaExceeded: new Error('Quota exceeded for quota metric'),
  networkError: new Error('Network error - connection refused'),
  timeoutError: new Error('Request timeout after 30000ms'),
  invalidRequest: new Error('Invalid request: malformed content'),
  serverError: new Error('500 Internal Server Error'),
};

export const NetworkErrors = {
  connectionRefused: new Error('ECONNREFUSED'),
  dnsLookupFailed: new Error('ENOTFOUND'),
  timeout: new Error('ETIMEDOUT'),
  reset: new Error('ECONNRESET'),
};

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Sample base64 image data for testing
 */
export const sampleBase64Images = {
  jpeg: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkLzYvL0A9Ljo7Ujo4P0ZDS0dMTU5PUVVDWkRHQ11VT0tUVVZfW//2wBDAB',
  png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  webp: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
};

/**
 * Sample URLs for testing
 */
export const sampleImageUrls = {
  valid: [
    'https://example.com/image.jpg',
    'https://images.pexels.com/photos/test.jpg',
    'https://picsum.photos/200/300',
  ],
  invalid: [
    'not-a-url',
    'ftp://example.com/image.jpg',
    'javascript:alert(1)',
    '',
  ],
};

/**
 * Sample detection results for testing
 */
export const sampleDetectionResults: DetectionResult = {
  detections: [
    {
      label: 'person',
      confidence: 0.95,
      bbox: { x: 100, y: 100, width: 200, height: 300 },
      css_selector: '[data-detected="person-1"]',
    },
    {
      label: 'car',
      confidence: 0.87,
      bbox: { x: 400, y: 200, width: 150, height: 100 },
    },
    {
      label: 'dog',
      confidence: 0.92,
      bbox: { x: 50, y: 400, width: 100, height: 80 },
      css_selector: '[data-detected="dog-1"]',
    },
  ],
  image_metadata: {
    width: 800,
    height: 600,
    format: 'jpeg',
    file_size: 102400,
  },
  summary: {
    total_objects: 3,
    unique_labels: ['person', 'car', 'dog'],
  },
  metadata: {
    model: 'gemini-2.0-flash',
    provider: 'google',
    total_tokens: 250,
  },
};

/**
 * Reset all mocks
 */
export function resetAllMocks(): void {
  vi.clearAllMocks();
}
