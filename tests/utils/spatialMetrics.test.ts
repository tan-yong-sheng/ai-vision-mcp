import { describe, it, expect } from 'vitest';
import { calculateSpatialMetrics } from '../../src/utils/spatialMetrics';
import type { LayoutNode } from '../../src/types/LayoutTree';

describe('spatialMetrics', () => {
  const createNode = (
    id: string,
    type: string,
    bounds: { x: number; y: number; width: number; height: number },
    children: LayoutNode[] = []
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
  });

  describe('alignment detection', () => {
    it('should detect horizontal alignment', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 100,
        y: 200,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.alignmentMetrics).toHaveLength(1);
      expect(result.alignmentMetrics[0].type).toBe('horizontal');
      expect(result.alignmentMetrics[0].elementCount).toBe(2);
    });

    it('should detect vertical alignment', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 200,
        y: 100,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.alignmentMetrics).toHaveLength(1);
      expect(result.alignmentMetrics[0].type).toBe('vertical');
      expect(result.alignmentMetrics[0].elementCount).toBe(2);
    });

    it('should detect multiple alignment groups', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 100,
        y: 200,
        width: 100,
        height: 50,
      });
      const child3 = createNode('child3', 'div', {
        x: 300,
        y: 100,
        width: 100,
        height: 50,
      });
      const child4 = createNode('child4', 'div', {
        x: 300,
        y: 200,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2, child3, child4]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.alignmentMetrics.length).toBeGreaterThanOrEqual(2);
    });

    it('should include element IDs in alignment groups', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 100,
        y: 200,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.alignmentMetrics[0].elements).toContain('child1');
      expect(result.alignmentMetrics[0].elements).toContain('child2');
    });

    it('should ignore single-element alignment groups', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 200,
        y: 200,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.alignmentMetrics).toHaveLength(0);
    });

    it('should sort alignment groups by element count', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 100,
        y: 200,
        width: 100,
        height: 50,
      });
      const child3 = createNode('child3', 'div', {
        x: 100,
        y: 300,
        width: 100,
        height: 50,
      });
      const child4 = createNode('child4', 'div', {
        x: 300,
        y: 100,
        width: 100,
        height: 50,
      });
      const child5 = createNode('child5', 'div', {
        x: 300,
        y: 200,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2, child3, child4, child5]
      );

      const result = calculateSpatialMetrics(root);

      if (result.alignmentMetrics.length > 1) {
        expect(result.alignmentMetrics[0].elementCount).toBeGreaterThanOrEqual(
          result.alignmentMetrics[1].elementCount
        );
      }
    });
  });

  describe('spacing consistency', () => {
    it('should calculate average gap', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 250,
        y: 100,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.spacingConsistency.averageGap).toBe(50);
    });

    it('should calculate variance', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 250,
        y: 100,
        width: 100,
        height: 50,
      });
      const child3 = createNode('child3', 'div', {
        x: 350,
        y: 100,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2, child3]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.spacingConsistency.variance).toBeGreaterThanOrEqual(0);
    });

    it('should mark consistent spacing', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 250,
        y: 100,
        width: 100,
        height: 50,
      });
      const child3 = createNode('child3', 'div', {
        x: 400,
        y: 100,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 600, height: 500 },
        [child1, child2, child3]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.spacingConsistency.consistent).toBe(true);
    });

    it('should mark inconsistent spacing', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 250,
        y: 100,
        width: 100,
        height: 50,
      });
      const child3 = createNode('child3', 'div', {
        x: 450,
        y: 100,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 600, height: 500 },
        [child1, child2, child3]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.spacingConsistency.consistent).toBe(false);
    });

    it('should handle single child', () => {
      const child = createNode('child', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.spacingConsistency.averageGap).toBe(0);
      expect(result.spacingConsistency.variance).toBe(0);
      expect(result.spacingConsistency.consistent).toBe(true);
    });

    it('should handle no children', () => {
      const root = createNode('root', 'div', {
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      });

      const result = calculateSpatialMetrics(root);

      expect(result.spacingConsistency.averageGap).toBe(0);
      expect(result.spacingConsistency.variance).toBe(0);
    });
  });

  describe('collision detection', () => {
    it('should detect overlapping elements', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 150,
        height: 100,
      });
      const child2 = createNode('child2', 'div', {
        x: 150,
        y: 120,
        width: 150,
        height: 100,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.collisions).toHaveLength(1);
      expect(result.collisions[0].element1).toBe('child1');
      expect(result.collisions[0].element2).toBe('child2');
    });

    it('should calculate overlap area', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      });
      const child2 = createNode('child2', 'div', {
        x: 150,
        y: 150,
        width: 100,
        height: 100,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.collisions[0].overlapArea).toBe(2500);
    });

    it('should not detect non-overlapping elements', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      });
      const child2 = createNode('child2', 'div', {
        x: 250,
        y: 100,
        width: 100,
        height: 100,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.collisions).toHaveLength(0);
    });

    it('should detect multiple collisions', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 150,
        height: 150,
      });
      const child2 = createNode('child2', 'div', {
        x: 150,
        y: 150,
        width: 150,
        height: 150,
      });
      const child3 = createNode('child3', 'div', {
        x: 120,
        y: 120,
        width: 150,
        height: 150,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2, child3]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.collisions.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle touching but not overlapping elements', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      });
      const child2 = createNode('child2', 'div', {
        x: 200,
        y: 100,
        width: 100,
        height: 100,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2]
      );

      const result = calculateSpatialMetrics(root);

      expect(result.collisions).toHaveLength(0);
    });
  });

  describe('complete metrics', () => {
    it('should return all metric types', () => {
      const child1 = createNode('child1', 'div', {
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
      const child2 = createNode('child2', 'div', {
        x: 100,
        y: 200,
        width: 100,
        height: 50,
      });
      const root = createNode(
        'root',
        'div',
        { x: 0, y: 0, width: 500, height: 500 },
        [child1, child2]
      );

      const result = calculateSpatialMetrics(root);

      expect(result).toHaveProperty('alignmentMetrics');
      expect(result).toHaveProperty('spacingConsistency');
      expect(result).toHaveProperty('collisions');
      expect(Array.isArray(result.alignmentMetrics)).toBe(true);
      expect(Array.isArray(result.collisions)).toBe(true);
    });
  });
});
