import { beforeEach, describe, expect, test, vi } from 'vitest';

const generateContentMock = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI(this: unknown) {
    return {
      models: {
        generateContent: generateContentMock,
      },
    } as any;
  }),
}));

import { VertexAIProvider } from '../../src/providers/vertexai/VertexAIProvider.js';

describe('VertexAIProvider source parity', () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    generateContentMock.mockResolvedValue({
      text: 'ok',
      usageMetadata: {
        promptTokenCount: 1,
        candidatesTokenCount: 1,
        totalTokenCount: 2,
      },
      modelVersion: 'test-model',
      responseId: 'response-1',
    });
  });

  test('passes files/ image references through unchanged', async () => {
    const provider = new VertexAIProvider({
      projectId: 'test-project',
      location: 'us-central1',
      imageModel: 'gemini-2.5-flash',
      videoModel: 'gemini-2.5-flash',
      endpoint: 'https://aiplatform.googleapis.com',
    } as any);

    await provider.analyzeImage('files/test-file', 'describe this');

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          {
            role: 'user',
            parts: [
              {
                fileData: {
                  mimeType: 'image/jpeg',
                  fileUri: 'files/test-file',
                },
              },
              { text: 'describe this' },
            ],
          },
        ],
      })
    );
  });

  test('passes generativelanguage file URIs through unchanged', async () => {
    const provider = new VertexAIProvider({
      projectId: 'test-project',
      location: 'us-central1',
      imageModel: 'gemini-2.5-flash',
      videoModel: 'gemini-2.5-flash',
      endpoint: 'https://aiplatform.googleapis.com',
    } as any);

    await provider.analyzeImage(
      'https://generativelanguage.googleapis.com/v1beta/files/test-file',
      'describe this'
    );

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          {
            role: 'user',
            parts: [
              {
                fileData: {
                  mimeType: 'image/jpeg',
                  fileUri:
                    'https://generativelanguage.googleapis.com/v1beta/files/test-file',
                },
              },
              { text: 'describe this' },
            ],
          },
        ],
      })
    );
  });
});
