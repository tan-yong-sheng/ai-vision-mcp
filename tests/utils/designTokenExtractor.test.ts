import { describe, it, expect } from 'vitest';
import { extractDesignTokens } from '../../src/utils/designTokenExtractor';
import type { LayoutNode } from '../../src/types/LayoutTree';

describe('designTokenExtractor', () => {
  const createNode = (
    id: string,
    type: string,
    properties?: any,
    children: LayoutNode[] = []
  ): LayoutNode => ({
    id,
    type,
    bounds: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      normalized: { x: 0, y: 0, width: 1000, height: 1000 },
    },
    children,
    properties,
  });

  describe('color extraction', () => {
    it('should extract hex colors', () => {
      const node = createNode('root', 'div', { color: '#ff0000' });
      const result = extractDesignTokens(node);

      expect(result.colors).toHaveLength(1);
      expect(result.colors[0].value).toBe('#ff0000');
      expect(result.colors[0].count).toBe(1);
    });

    it('should normalize rgb to hex', () => {
      const node = createNode('root', 'div', { color: 'rgb(255, 0, 0)' });
      const result = extractDesignTokens(node);

      expect(result.colors).toHaveLength(1);
      expect(result.colors[0].value).toBe('#ff0000');
    });

    it('should normalize rgba to hex', () => {
      const node = createNode('root', 'div', { color: 'rgba(255, 0, 0, 0.5)' });
      const result = extractDesignTokens(node);

      expect(result.colors).toHaveLength(1);
      expect(result.colors[0].value).toBe('#ff0000');
    });

    it('should extract background colors', () => {
      const node = createNode('root', 'div', { backgroundColor: '#ffffff' });
      const result = extractDesignTokens(node);

      expect(result.colors).toHaveLength(1);
      expect(result.colors[0].value).toBe('#ffffff');
    });

    it('should classify color usage by element type', () => {
      const buttonNode = createNode('button', 'button', { color: '#000000' });
      const result = extractDesignTokens(buttonNode);

      expect(result.colors[0].usage).toBe('button-text');
    });

    it('should classify heading colors', () => {
      const headingNode = createNode('h1', 'h1', { color: '#333333' });
      const result = extractDesignTokens(headingNode);

      expect(result.colors[0].usage).toBe('heading');
    });

    it('should count duplicate colors', () => {
      const child1 = createNode('child1', 'div', { color: '#ff0000' });
      const child2 = createNode('child2', 'div', { color: '#ff0000' });
      const root = createNode('root', 'div', {}, [child1, child2]);

      const result = extractDesignTokens(root);

      expect(result.colors).toHaveLength(1);
      expect(result.colors[0].count).toBe(2);
    });

    it('should ignore invalid colors', () => {
      const node = createNode('root', 'div', { color: 'invalid-color' });
      const result = extractDesignTokens(node);

      expect(result.colors).toHaveLength(0);
    });

    it('should ignore undefined colors', () => {
      const node = createNode('root', 'div', {});
      const result = extractDesignTokens(node);

      expect(result.colors).toHaveLength(0);
    });
  });

  describe('typography extraction', () => {
    it('should extract font family', () => {
      const node = createNode('root', 'div', { fontFamily: 'Arial' });
      const result = extractDesignTokens(node);

      expect(result.typography).toHaveLength(1);
      expect(result.typography[0].fontFamily).toBe('Arial');
    });

    it('should extract font size', () => {
      const node = createNode('root', 'div', { fontSize: 16 });
      const result = extractDesignTokens(node);

      expect(result.typography).toHaveLength(1);
      expect(result.typography[0].fontSize).toBe(16);
    });

    it('should extract font weight', () => {
      const node = createNode('root', 'div', { fontWeight: 'bold' });
      const result = extractDesignTokens(node);

      expect(result.typography).toHaveLength(1);
      expect(result.typography[0].fontWeight).toBe('bold');
    });

    it('should combine typography properties', () => {
      const node = createNode('root', 'div', {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
      });
      const result = extractDesignTokens(node);

      expect(result.typography).toHaveLength(1);
      expect(result.typography[0].fontFamily).toBe('Arial');
      expect(result.typography[0].fontSize).toBe(16);
      expect(result.typography[0].fontWeight).toBe('bold');
    });

    it('should count duplicate typography', () => {
      const child1 = createNode('child1', 'div', {
        fontSize: 16,
        fontFamily: 'Arial',
      });
      const child2 = createNode('child2', 'div', {
        fontSize: 16,
        fontFamily: 'Arial',
      });
      const root = createNode('root', 'div', {}, [child1, child2]);

      const result = extractDesignTokens(root);

      expect(result.typography).toHaveLength(1);
      expect(result.typography[0].count).toBe(2);
    });

    it('should handle partial typography properties', () => {
      const node = createNode('root', 'div', { fontSize: 14 });
      const result = extractDesignTokens(node);

      expect(result.typography).toHaveLength(1);
      expect(result.typography[0].fontSize).toBe(14);
    });
  });

  describe('spacing extraction', () => {
    it('should extract padding', () => {
      const node = createNode('root', 'div', { padding: 16 });
      const result = extractDesignTokens(node);

      expect(result.spacing).toHaveLength(1);
      expect(result.spacing[0].value).toBe(16);
      expect(result.spacing[0].type).toBe('padding');
    });

    it('should extract margin', () => {
      const node = createNode('root', 'div', { margin: 8 });
      const result = extractDesignTokens(node);

      expect(result.spacing).toHaveLength(1);
      expect(result.spacing[0].value).toBe(8);
      expect(result.spacing[0].type).toBe('margin');
    });

    it('should extract gap', () => {
      const node = createNode('root', 'div', { gap: 12 });
      const result = extractDesignTokens(node);

      expect(result.spacing).toHaveLength(1);
      expect(result.spacing[0].value).toBe(12);
      expect(result.spacing[0].type).toBe('gap');
    });

    it('should count duplicate spacing values', () => {
      const child1 = createNode('child1', 'div', { padding: 16 });
      const child2 = createNode('child2', 'div', { padding: 16 });
      const root = createNode('root', 'div', {}, [child1, child2]);

      const result = extractDesignTokens(root);

      expect(result.spacing).toHaveLength(1);
      expect(result.spacing[0].count).toBe(2);
    });

    it('should handle multiple spacing types', () => {
      const child1 = createNode('child1', 'div', { padding: 16 });
      const child2 = createNode('child2', 'div', { margin: 8 });
      const root = createNode('root', 'div', {}, [child1, child2]);

      const result = extractDesignTokens(root);

      expect(result.spacing).toHaveLength(2);
    });
  });

  describe('sorting by frequency', () => {
    it('should sort colors by frequency', () => {
      const child1 = createNode('child1', 'div', { color: '#ff0000' });
      const child2 = createNode('child2', 'div', { color: '#ff0000' });
      const child3 = createNode('child3', 'div', { color: '#0000ff' });
      const root = createNode('root', 'div', {}, [child1, child2, child3]);

      const result = extractDesignTokens(root);

      expect(result.colors[0].value).toBe('#ff0000');
      expect(result.colors[0].count).toBe(2);
      expect(result.colors[1].value).toBe('#0000ff');
      expect(result.colors[1].count).toBe(1);
    });

    it('should sort typography by frequency', () => {
      const child1 = createNode('child1', 'div', { fontSize: 16 });
      const child2 = createNode('child2', 'div', { fontSize: 16 });
      const child3 = createNode('child3', 'div', { fontSize: 14 });
      const root = createNode('root', 'div', {}, [child1, child2, child3]);

      const result = extractDesignTokens(root);

      expect(result.typography[0].fontSize).toBe(16);
      expect(result.typography[0].count).toBe(2);
      expect(result.typography[1].fontSize).toBe(14);
      expect(result.typography[1].count).toBe(1);
    });

    it('should sort spacing by frequency', () => {
      const child1 = createNode('child1', 'div', { padding: 16 });
      const child2 = createNode('child2', 'div', { padding: 16 });
      const child3 = createNode('child3', 'div', { padding: 8 });
      const root = createNode('root', 'div', {}, [child1, child2, child3]);

      const result = extractDesignTokens(root);

      expect(result.spacing[0].value).toBe(16);
      expect(result.spacing[0].count).toBe(2);
      expect(result.spacing[1].value).toBe(8);
      expect(result.spacing[1].count).toBe(1);
    });
  });

  describe('nested hierarchy', () => {
    it('should extract tokens from nested children', () => {
      const level2 = createNode('level2', 'div', { color: '#ff0000' });
      const level1 = createNode('level1', 'div', { color: '#0000ff' }, [
        level2,
      ]);
      const root = createNode('root', 'div', {}, [level1]);

      const result = extractDesignTokens(root);

      expect(result.colors).toHaveLength(2);
    });

    it('should handle deeply nested structures', () => {
      const level3 = createNode('level3', 'div', { fontSize: 12 });
      const level2 = createNode('level2', 'div', { fontSize: 14 }, [level3]);
      const level1 = createNode('level1', 'div', { fontSize: 16 }, [level2]);
      const root = createNode('root', 'div', {}, [level1]);

      const result = extractDesignTokens(root);

      expect(result.typography).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('should handle nodes without properties', () => {
      const node = createNode('root', 'div');
      const result = extractDesignTokens(node);

      expect(result.colors).toHaveLength(0);
      expect(result.typography).toHaveLength(0);
      expect(result.spacing).toHaveLength(0);
    });

    it('should handle empty children array', () => {
      const node = createNode('root', 'div', { color: '#ff0000' }, []);
      const result = extractDesignTokens(node);

      expect(result.colors).toHaveLength(1);
    });

    it('should return complete structure', () => {
      const node = createNode('root', 'div');
      const result = extractDesignTokens(node);

      expect(result).toHaveProperty('colors');
      expect(result).toHaveProperty('typography');
      expect(result).toHaveProperty('spacing');
      expect(Array.isArray(result.colors)).toBe(true);
      expect(Array.isArray(result.typography)).toBe(true);
      expect(Array.isArray(result.spacing)).toBe(true);
    });
  });
});
