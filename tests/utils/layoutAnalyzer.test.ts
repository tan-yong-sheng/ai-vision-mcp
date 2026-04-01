import { describe, it, expect } from 'vitest';
import { analyzeLayout } from '../../src/utils/layoutAnalyzer';
import type { LayoutNode } from '../../src/types/LayoutTree';

describe('layoutAnalyzer', () => {
  const createNode = (
    id: string,
    type: string,
    bounds: { x: number; y: number; width: number; height: number },
    children: LayoutNode[] = [],
    properties?: any
  ): LayoutNode => ({
    id,
    type,
    bounds: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      normalized: { x: 0, y: 0, width: 1000, height: 1000 },
    },
    children,
    properties,
  });

  describe('detectLayoutType', () => {
    it('should detect flex layout from display property', () => {
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [],
        {
          display: 'flex',
        }
      );
      const result = analyzeLayout(root);
      expect(result.primaryLayout).toBe('flex');
    });

    it('should detect grid layout from display property', () => {
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [],
        {
          display: 'grid',
        }
      );
      const result = analyzeLayout(root);
      expect(result.primaryLayout).toBe('grid');
    });

    it('should infer flex for nav elements', () => {
      const root = createNode('nav', 'nav', {
        x: 0,
        y: 0,
        width: 1920,
        height: 80,
      });
      const result = analyzeLayout(root);
      expect(result.primaryLayout).toBe('flex');
    });

    it('should infer flex for header elements', () => {
      const root = createNode('header', 'header', {
        x: 0,
        y: 0,
        width: 1920,
        height: 80,
      });
      const result = analyzeLayout(root);
      expect(result.primaryLayout).toBe('flex');
    });

    it('should infer block for section elements', () => {
      const root = createNode('section', 'section', {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
      });
      const result = analyzeLayout(root);
      expect(result.primaryLayout).toBe('block');
    });

    it('should default to block for unknown types', () => {
      const root = createNode('root', 'div', {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
      });
      const result = analyzeLayout(root);
      expect(result.primaryLayout).toBe('block');
    });
  });

  describe('detectAlignmentPatterns', () => {
    it('should detect left-aligned pattern', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 200,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [child1, child2]
      );

      const result = analyzeLayout(root);
      expect(result.alignmentPatterns).toContain('left-aligned');
    });

    it('should detect center-aligned pattern', () => {
      const containerCenter = 960; // 1920 / 2
      const child1 = createNode('child1', 'div', {
        x: 860,
        y: 100,
        width: 200,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 860,
        y: 200,
        width: 200,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [child1, child2]
      );

      const result = analyzeLayout(root);
      expect(result.alignmentPatterns).toContain('center-aligned');
    });

    it('should detect top-aligned pattern', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 200,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 400,
        y: 100,
        width: 200,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [child1, child2]
      );

      const result = analyzeLayout(root);
      expect(result.alignmentPatterns).toContain('top-aligned');
    });

    it('should detect space-between pattern', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 200,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 500,
        y: 100,
        width: 200,
        height: 50,
      });
      const child3 = createNode('child3', 'div', {
        x: 900,
        y: 100,
        width: 200,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [child1, child2, child3]
      );

      const result = analyzeLayout(root);
      expect(result.alignmentPatterns).toContain('space-between');
    });

    it('should return empty array for single child', () => {
      const child = createNode('child', 'div', {
        x: 100,
        y: 100,
        width: 200,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [child]
      );

      const result = analyzeLayout(root);
      expect(result.alignmentPatterns.length).toBe(0);
    });
  });

  describe('detectGridInfo', () => {
    it('should detect grid with 2 columns', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 400,
        height: 200,
      });
      const child2 = createNode('child2', 'div', {
        x: 600,
        y: 100,
        width: 400,
        height: 200,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [child1, child2]
      );

      const result = analyzeLayout(root);
      expect(result.gridInfo).toBeDefined();
      expect(result.gridInfo?.columns).toBe(2);
    });

    it('should detect grid with 3 columns', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 300,
        height: 200,
      });
      const child2 = createNode('child2', 'div', {
        x: 500,
        y: 100,
        width: 300,
        height: 200,
      });
      const child3 = createNode('child3', 'div', {
        x: 900,
        y: 100,
        width: 300,
        height: 200,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [child1, child2, child3]
      );

      const result = analyzeLayout(root);
      expect(result.gridInfo?.columns).toBe(3);
    });

    it('should detect grid gap', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 400,
        height: 200,
      });
      const child2 = createNode('child2', 'div', {
        x: 550,
        y: 100,
        width: 400,
        height: 200,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [child1, child2]
      );

      const result = analyzeLayout(root);
      expect(result.gridInfo?.gap).toBe(50);
    });

    it('should detect grid rows', () => {
      // Need multiple columns for grid detection to work
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 400,
        height: 200,
      });
      const child2 = createNode('child2', 'div', {
        x: 600,
        y: 100,
        width: 400,
        height: 200,
      });
      const child3 = createNode('child3', 'div', {
        x: 100,
        y: 350,
        width: 400,
        height: 200,
      });
      const child4 = createNode('child4', 'div', {
        x: 600,
        y: 350,
        width: 400,
        height: 200,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [child1, child2, child3, child4]
      );

      const result = analyzeLayout(root);
      expect(result.gridInfo?.rows).toBe(2);
    });

    it('should return undefined for single column', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 400,
        height: 200,
      });
      const child2 = createNode('child2', 'div', {
        x: 100,
        y: 350,
        width: 400,
        height: 200,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [child1, child2]
      );

      const result = analyzeLayout(root);
      expect(result.gridInfo).toBeUndefined();
    });
  });

  describe('analyzeHierarchy', () => {
    it('should calculate hierarchy depth', () => {
      const level3 = createNode('level3', 'div', {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      const level2 = createNode(
        'level2',
        'div',
        { x: 0, y: 0, width: 200, height: 200 },
        [level3]
      );
      const level1 = createNode(
        'level1',
        'div',
        { x: 0, y: 0, width: 400, height: 400 },
        [level2]
      );
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [level1]
      );

      const result = analyzeLayout(root);
      expect(result.hierarchy.depth).toBe(3);
    });

    it('should count section elements', () => {
      const section1 = createNode('section1', 'section', {
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      });
      const section2 = createNode('section2', 'section', {
        x: 600,
        y: 0,
        width: 500,
        height: 500,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [section1, section2]
      );

      const result = analyzeLayout(root);
      expect(result.hierarchy.sections).toBe(2);
    });

    it('should count container elements', () => {
      const container1 = createNode('container1', 'div', {
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      });
      const container2 = createNode('container2', 'div', {
        x: 600,
        y: 0,
        width: 500,
        height: 500,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [container1, container2]
      );

      const result = analyzeLayout(root);
      // Root is also a div, so total is 3 (root + 2 children)
      expect(result.hierarchy.containers).toBe(3);
    });

    it('should handle empty hierarchy', () => {
      const root = createNode('root', 'div', {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
      });

      const result = analyzeLayout(root);
      // Root starts at depth 0, no children means depth stays 0
      expect(result.hierarchy.depth).toBe(0);
      expect(result.hierarchy.sections).toBe(0);
      // Root is a div, so containers = 1
      expect(result.hierarchy.containers).toBe(1);
    });
  });

  describe('analyzeLayout integration', () => {
    it('should return complete analysis', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 400,
        height: 200,
      });
      const child2 = createNode('child2', 'div', {
        x: 600,
        y: 100,
        width: 400,
        height: 200,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 1920, height: 1080 },
        [child1, child2]
      );

      const result = analyzeLayout(root);

      expect(result).toHaveProperty('primaryLayout');
      expect(result).toHaveProperty('alignmentPatterns');
      expect(result).toHaveProperty('gridInfo');
      expect(result).toHaveProperty('hierarchy');
    });
  });
});
