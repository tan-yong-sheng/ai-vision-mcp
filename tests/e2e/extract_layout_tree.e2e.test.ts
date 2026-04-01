import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extract_layout_tree } from '../../src/tools/extract_layout_tree';
import { FileService } from '../../src/services/FileService';
import type { Config } from '../../src/types/Config';
import type { VisionProvider } from '../../src/types/Providers';

// Mock ImageScript
vi.mock('imagescript', () => ({
  Image: {
    decode: vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
    }),
  },
}));

/**
 * E2E tests for extract_layout_tree tool
 * Tests with real screenshot images and mocked vision provider
 */

describe('extract_layout_tree E2E', () => {
  let mockConfig: Config;
  let mockImageProvider: VisionProvider;
  let fileService: FileService;

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

    // Mock vision provider with realistic layout tree response
    mockImageProvider = {
      analyzeImage: async () => ({
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
                properties: { backgroundColor: '#ffffff', padding: '16px' },
                children: [
                  {
                    id: 'element-1-1',
                    type: 'h1',
                    text: 'Dashboard',
                    bounds: { x: 20, y: 20, width: 300, height: 40 },
                    properties: {
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#000000',
                    },
                    children: [],
                  },
                ],
              },
              {
                id: 'element-2',
                type: 'main',
                bounds: { x: 0, y: 80, width: 1920, height: 1000 },
                properties: { display: 'flex', gap: '16px', padding: '20px' },
                children: [
                  {
                    id: 'element-2-1',
                    type: 'section',
                    bounds: { x: 20, y: 100, width: 400, height: 900 },
                    properties: {
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                    },
                    children: [
                      {
                        id: 'element-2-1-1',
                        type: 'button',
                        text: 'Create New',
                        bounds: { x: 40, y: 120, width: 360, height: 48 },
                        properties: {
                          backgroundColor: '#007bff',
                          color: '#ffffff',
                          fontSize: '16px',
                        },
                        children: [],
                      },
                    ],
                  },
                  {
                    id: 'element-2-2',
                    type: 'section',
                    bounds: { x: 440, y: 100, width: 1460, height: 900 },
                    properties: {
                      display: 'grid',
                      gridColumns: 3,
                      gap: '16px',
                    },
                    children: [
                      {
                        id: 'element-2-2-1',
                        type: 'article',
                        bounds: { x: 440, y: 100, width: 460, height: 280 },
                        properties: {
                          backgroundColor: '#ffffff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        },
                        children: [],
                      },
                      {
                        id: 'element-2-2-2',
                        type: 'article',
                        bounds: { x: 920, y: 100, width: 460, height: 280 },
                        properties: {
                          backgroundColor: '#ffffff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        },
                        children: [],
                      },
                      {
                        id: 'element-2-2-3',
                        type: 'article',
                        bounds: { x: 1400, y: 100, width: 460, height: 280 },
                        properties: {
                          backgroundColor: '#ffffff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        },
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        }),
        metadata: {
          processingTime: 1500,
          model: 'gemini-2.5-flash',
          provider: 'gemini',
        },
      }),
    } as unknown as VisionProvider;

    fileService = {
      handleImageSource: async (source: string) => source,
      readFile: async () => Buffer.from('fake-image-data'),
    } as unknown as FileService;
  });

  describe('with real screenshot images', () => {
    it('should extract layout tree from base64 image', async () => {
      // Create a minimal valid PNG (1x1 pixel)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0x0b, 0xfb, 0xd4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const base64 = pngBuffer.toString('base64');
      const imageSource = `data:image/png;base64,${base64}`;

      const result = await extract_layout_tree(
        { imageSource },
        mockConfig,
        mockImageProvider,
        fileService
      );

      expect(result).toHaveProperty('layoutTree');
      expect(result).toHaveProperty('summary');
      expect(result.layoutTree.root).toBeDefined();
      expect(result.layoutTree.root.type).toBe('document');
      expect(result.layoutTree.root.children.length).toBeGreaterThan(0);
    });

    it('should normalize coordinates to 0-1000 scale', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0x0b, 0xfb, 0xd4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const base64 = pngBuffer.toString('base64');
      const imageSource = `data:image/png;base64,${base64}`;

      const result = await extract_layout_tree(
        { imageSource },
        mockConfig,
        mockImageProvider,
        fileService
      );

      const checkNormalized = (node: any) => {
        if (node.bounds?.normalized) {
          expect(node.bounds.normalized.x).toBeGreaterThanOrEqual(0);
          expect(node.bounds.normalized.x).toBeLessThanOrEqual(1000);
          expect(node.bounds.normalized.y).toBeGreaterThanOrEqual(0);
          expect(node.bounds.normalized.y).toBeLessThanOrEqual(1000);
          expect(node.bounds.normalized.width).toBeGreaterThanOrEqual(0);
          expect(node.bounds.normalized.width).toBeLessThanOrEqual(1000);
          expect(node.bounds.normalized.height).toBeGreaterThanOrEqual(0);
          expect(node.bounds.normalized.height).toBeLessThanOrEqual(1000);
        }
        node.children?.forEach(checkNormalized);
      };

      checkNormalized(result.layoutTree.root);
    });

    it('should extract design tokens from layout', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0x0b, 0xfb, 0xd4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const base64 = pngBuffer.toString('base64');
      const imageSource = `data:image/png;base64,${base64}`;

      const result = await extract_layout_tree(
        { imageSource },
        mockConfig,
        mockImageProvider,
        fileService
      );

      expect(result.layoutTree.metadata.designTokens).toBeDefined();
      const tokens = result.layoutTree.metadata.designTokens;
      expect(tokens.colors).toBeDefined();
      expect(tokens.typography).toBeDefined();
      expect(tokens.spacing).toBeDefined();
    });

    it('should analyze layout structure', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0x0b, 0xfb, 0xd4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const base64 = pngBuffer.toString('base64');
      const imageSource = `data:image/png;base64,${base64}`;

      const result = await extract_layout_tree(
        { imageSource },
        mockConfig,
        mockImageProvider,
        fileService
      );

      expect(result.layoutTree.metadata.layoutAnalysis).toBeDefined();
      const analysis = result.layoutTree.metadata.layoutAnalysis;
      expect(analysis.primaryLayout).toBeDefined();
      expect(analysis.hierarchy).toBeDefined();
      expect(analysis.hierarchy.depth).toBeGreaterThanOrEqual(0);
    });

    it('should calculate spatial metrics', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0x0b, 0xfb, 0xd4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const base64 = pngBuffer.toString('base64');
      const imageSource = `data:image/png;base64,${base64}`;

      const result = await extract_layout_tree(
        { imageSource },
        mockConfig,
        mockImageProvider,
        fileService
      );

      expect(result.layoutTree.metadata.spatialMetrics).toBeDefined();
      const metrics = result.layoutTree.metadata.spatialMetrics;
      expect(metrics.alignmentMetrics).toBeDefined();
      expect(metrics.spacingConsistency).toBeDefined();
      expect(metrics.collisions).toBeDefined();
    });

    it('should generate human-readable summary', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0x0b, 0xfb, 0xd4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const base64 = pngBuffer.toString('base64');
      const imageSource = `data:image/png;base64,${base64}`;

      const result = await extract_layout_tree(
        { imageSource },
        mockConfig,
        mockImageProvider,
        fileService
      );

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary).toContain('LAYOUT TREE EXTRACTION COMPLETE');
      expect(result.summary).toContain('Total Elements');
      expect(result.summary).toContain('DESIGN TOKENS');
      expect(result.summary).toContain('LAYOUT ANALYSIS');
      expect(result.summary).toContain('SPATIAL METRICS');
    });

    it('should preserve element hierarchy and relationships', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0x0b, 0xfb, 0xd4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const base64 = pngBuffer.toString('base64');
      const imageSource = `data:image/png;base64,${base64}`;

      const result = await extract_layout_tree(
        { imageSource },
        mockConfig,
        mockImageProvider,
        fileService
      );

      const root = result.layoutTree.root;
      expect(root.children.length).toBeGreaterThan(0);

      // Verify hierarchy is preserved
      const header = root.children.find((c: any) => c.type === 'header');
      expect(header).toBeDefined();
      expect(header?.children.length).toBeGreaterThan(0);

      const main = root.children.find((c: any) => c.type === 'main');
      expect(main).toBeDefined();
      expect(main?.children.length).toBeGreaterThan(0);
    });
  });

  describe('output validation', () => {
    it('should include all required metadata fields', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0x0b, 0xfb, 0xd4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const base64 = pngBuffer.toString('base64');
      const imageSource = `data:image/png;base64,${base64}`;

      const result = await extract_layout_tree(
        { imageSource },
        mockConfig,
        mockImageProvider,
        fileService
      );

      const metadata = result.layoutTree.metadata;
      expect(metadata.viewport).toBeDefined();
      expect(metadata.viewport.width).toBeGreaterThan(0);
      expect(metadata.viewport.height).toBeGreaterThan(0);
      expect(metadata.imageMetadata).toBeDefined();
      expect(metadata.imageMetadata.format).toBeDefined();
      expect(metadata.coordinateScale).toBe(1000);
      expect(metadata.extractionMethod).toBeDefined();
      expect(metadata.processingTime).toBeGreaterThan(0);
    });

    it('should have valid coordinate scale', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0x0b, 0xfb, 0xd4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const base64 = pngBuffer.toString('base64');
      const imageSource = `data:image/png;base64,${base64}`;

      const result = await extract_layout_tree(
        { imageSource },
        mockConfig,
        mockImageProvider,
        fileService
      );

      expect(result.layoutTree.metadata.coordinateScale).toBe(1000);
    });
  });
});
