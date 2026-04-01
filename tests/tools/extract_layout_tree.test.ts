import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extract_layout_tree } from '../../src/tools/extract_layout_tree';
import type { Config } from '../../src/types/Config';
import type { VisionProvider } from '../../src/types/Providers';
import { FileService } from '../../src/services/FileService';
import * as ImageScript from 'imagescript';

// Mock ImageScript
vi.mock('imagescript', () => ({
  Image: {
    decode: vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
    }),
  },
}));

describe('extract_layout_tree integration', () => {
  let mockConfig: Config;
  let mockImageProvider: VisionProvider;
  let mockFileService: FileService;

  beforeEach(() => {
    mockConfig = {
      IMAGE_PROVIDER: 'gemini',
      TEMPERATURE: 0.7,
      TOP_P: 0.9,
      TOP_K: 40,
      MAX_TOKENS: 4096,
      TEMPERATURE_FOR_IMAGE: 0.5,
      TOP_P_FOR_IMAGE: 0.9,
      TOP_K_FOR_IMAGE: 40,
      MAX_TOKENS_FOR_IMAGE: 4096,
    } as Config;

    mockImageProvider = {
      analyzeImage: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          root: {
            id: 'root-0',
            type: 'document',
            role: 'main',
            bounds: { x: 0, y: 0, width: 1920, height: 1080 },
            children: [
              {
                id: 'element-1',
                type: 'header',
                role: 'banner',
                bounds: { x: 0, y: 0, width: 1920, height: 80 },
                children: [],
              },
              {
                id: 'element-2',
                type: 'section',
                bounds: { x: 0, y: 80, width: 1920, height: 1000 },
                children: [
                  {
                    id: 'element-3',
                    type: 'button',
                    text: 'Click me',
                    bounds: { x: 100, y: 100, width: 200, height: 50 },
                    children: [],
                  },
                ],
              },
            ],
          },
        }),
        metadata: {
          processingTime: 1000,
          model: 'gemini-2.5-flash',
          provider: 'gemini',
        },
      }),
    } as unknown as VisionProvider;

    mockFileService = {
      handleImageSource: vi
        .fn()
        .mockResolvedValue(
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        ),
      readFile: vi
        .fn()
        .mockResolvedValue(
          Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
          )
        ),
    } as unknown as FileService;
  });

  describe('basic extraction', () => {
    it('should extract layout tree from image', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result).toHaveProperty('layoutTree');
      expect(result).toHaveProperty('summary');
      expect(result.layoutTree).toHaveProperty('root');
      expect(result.layoutTree).toHaveProperty('metadata');
    });

    it('should normalize coordinates', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      const root = result.layoutTree.root;
      expect(root.bounds).toHaveProperty('normalized');
      expect(root.bounds.normalized.x).toBeGreaterThanOrEqual(0);
      expect(root.bounds.normalized.x).toBeLessThanOrEqual(1000);
    });

    it('should include design tokens in metadata', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.layoutTree.metadata).toHaveProperty('designTokens');
      expect(result.layoutTree.metadata.designTokens).toHaveProperty('colors');
      expect(result.layoutTree.metadata.designTokens).toHaveProperty(
        'typography'
      );
      expect(result.layoutTree.metadata.designTokens).toHaveProperty('spacing');
    });

    it('should include layout analysis in metadata', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.layoutTree.metadata).toHaveProperty('layoutAnalysis');
      expect(result.layoutTree.metadata.layoutAnalysis).toHaveProperty(
        'primaryLayout'
      );
      expect(result.layoutTree.metadata.layoutAnalysis).toHaveProperty(
        'alignmentPatterns'
      );
      expect(result.layoutTree.metadata.layoutAnalysis).toHaveProperty(
        'hierarchy'
      );
    });

    it('should include spatial metrics in metadata', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.layoutTree.metadata).toHaveProperty('spatialMetrics');
      expect(result.layoutTree.metadata.spatialMetrics).toHaveProperty(
        'alignmentMetrics'
      );
      expect(result.layoutTree.metadata.spatialMetrics).toHaveProperty(
        'spacingConsistency'
      );
      expect(result.layoutTree.metadata.spatialMetrics).toHaveProperty(
        'collisions'
      );
    });
  });

  describe('hierarchy building', () => {
    it('should build hierarchical structure', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      const root = result.layoutTree.root;
      expect(root.children.length).toBeGreaterThan(0);
      expect(root.children[0]).toHaveProperty('children');
    });

    it('should preserve element types', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      const root = result.layoutTree.root;
      expect(root.type).toBe('document');
      expect(root.children[0].type).toBe('header');
    });

    it('should preserve element IDs', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      const root = result.layoutTree.root;
      expect(root.id).toBe('root-0');
      expect(root.children[0].id).toBe('element-1');
    });
  });

  describe('summary generation', () => {
    it('should generate summary', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should include element count in summary', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.summary).toContain('Total Elements');
    });

    it('should include layout analysis in summary', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.summary).toContain('LAYOUT ANALYSIS');
    });

    it('should include design tokens in summary', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.summary).toContain('DESIGN TOKENS');
    });

    it('should include spatial metrics in summary', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.summary).toContain('SPATIAL METRICS');
    });
  });

  describe('error handling', () => {
    it('should throw error for missing imageSource', async () => {
      await expect(
        extract_layout_tree(
          { imageSource: '' },
          mockConfig,
          mockImageProvider,
          mockFileService
        )
      ).rejects.toThrow();
    });

    it('should throw error for invalid JSON response', async () => {
      const invalidProvider = {
        analyzeImage: vi.fn().mockResolvedValue({
          text: 'invalid json',
          metadata: { processingTime: 1000 },
        }),
      } as unknown as VisionProvider;

      await expect(
        extract_layout_tree(
          { imageSource: 'data:image/png;base64,test' },
          mockConfig,
          invalidProvider,
          mockFileService
        )
      ).rejects.toThrow();
    });

    it('should handle fenced code blocks in response', async () => {
      const providerWithFence = {
        analyzeImage: vi.fn().mockResolvedValue({
          text: `\`\`\`json
{
  "root": {
    "id": "root-0",
    "type": "document",
    "bounds": { "x": 0, "y": 0, "width": 1920, "height": 1080 },
    "children": []
  }
}
\`\`\``,
          metadata: {
            processingTime: 1000,
            model: 'gemini-2.5-flash',
            provider: 'gemini',
          },
        }),
      } as unknown as VisionProvider;

      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        providerWithFence,
        mockFileService
      );

      expect(result.layoutTree.root.id).toBe('root-0');
    });
  });

  describe('metadata', () => {
    it('should include viewport dimensions', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.layoutTree.metadata.viewport).toHaveProperty('width');
      expect(result.layoutTree.metadata.viewport).toHaveProperty('height');
    });

    it('should include image metadata', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.layoutTree.metadata.imageMetadata).toHaveProperty('width');
      expect(result.layoutTree.metadata.imageMetadata).toHaveProperty('height');
      expect(result.layoutTree.metadata.imageMetadata).toHaveProperty('format');
      expect(result.layoutTree.metadata.imageMetadata).toHaveProperty(
        'size_bytes'
      );
    });

    it('should include extraction method', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.layoutTree.metadata.extractionMethod).toBe('vision');
    });

    it('should include coordinate scale', async () => {
      const result = await extract_layout_tree(
        { imageSource: 'data:image/png;base64,test' },
        mockConfig,
        mockImageProvider,
        mockFileService
      );

      expect(result.layoutTree.metadata.coordinateScale).toBe(1000);
    });
  });
});
