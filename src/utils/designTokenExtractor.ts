/**
 * Design Token Extractor
 * Extracts design tokens (colors, typography, spacing) from layout tree
 */

import type { LayoutNode } from '../types/LayoutTree.js';

export interface ColorToken {
  value: string;
  count: number;
  usage: string; // e.g., 'primary', 'background', 'text'
}

export interface TypographyToken {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  count: number;
}

export interface SpacingToken {
  value: number;
  type: 'padding' | 'margin' | 'gap';
  count: number;
}

export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
}

/**
 * Extract color from various formats (hex, rgb, rgba)
 */
function normalizeColor(color?: string): string | null {
  if (!color) return null;

  // Already hex
  if (color.startsWith('#')) return color.toLowerCase();

  // rgb/rgba to hex
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  return null;
}

/**
 * Classify color usage based on element type and context
 */
function classifyColorUsage(node: LayoutNode, colorType: 'color' | 'backgroundColor'): string {
  const nodeType = node.type.toLowerCase();

  if (colorType === 'backgroundColor') {
    if (nodeType === 'button') return 'button-bg';
    if (nodeType === 'header' || nodeType === 'footer') return 'header-bg';
    if (nodeType === 'section' || nodeType === 'article') return 'section-bg';
    return 'background';
  }

  if (nodeType === 'button') return 'button-text';
  if (nodeType === 'h1' || nodeType === 'h2' || nodeType === 'h3') return 'heading';
  if (nodeType === 'p' || nodeType === 'span') return 'text';
  return 'text';
}

/**
 * Extract all design tokens from layout tree
 */
export function extractDesignTokens(root: LayoutNode): DesignTokens {
  const colorMap = new Map<string, { count: number; usage: string }>();
  const typographyMap = new Map<string, { count: number; data: TypographyToken }>();
  const spacingMap = new Map<number, { count: number; type: 'padding' | 'margin' | 'gap' }>();

  /**
   * Recursively traverse tree and collect tokens
   */
  const traverse = (node: LayoutNode) => {
    if (node.properties) {
      // Extract colors
      if (node.properties.color) {
        const normalized = normalizeColor(node.properties.color);
        if (normalized) {
          const usage = classifyColorUsage(node, 'color');
          const key = `${normalized}-${usage}`;
          colorMap.set(key, {
            count: (colorMap.get(key)?.count || 0) + 1,
            usage,
          });
        }
      }

      if (node.properties.backgroundColor) {
        const normalized = normalizeColor(node.properties.backgroundColor);
        if (normalized) {
          const usage = classifyColorUsage(node, 'backgroundColor');
          const key = `${normalized}-${usage}`;
          colorMap.set(key, {
            count: (colorMap.get(key)?.count || 0) + 1,
            usage,
          });
        }
      }

      // Extract typography
      if (node.properties.fontSize || node.properties.fontFamily || node.properties.fontWeight) {
        const key = `${node.properties.fontFamily || 'default'}-${node.properties.fontSize || 16}-${node.properties.fontWeight || 'normal'}`;
        const existing = typographyMap.get(key);
        typographyMap.set(key, {
          count: (existing?.count || 0) + 1,
          data: {
            fontFamily: node.properties.fontFamily,
            fontSize: node.properties.fontSize,
            fontWeight: node.properties.fontWeight,
            count: (existing?.count || 0) + 1,
          },
        });
      }

      // Extract spacing
      if (node.properties.padding) {
        const key = node.properties.padding;
        spacingMap.set(key, {
          count: (spacingMap.get(key)?.count || 0) + 1,
          type: 'padding',
        });
      }

      if (node.properties.margin) {
        const key = node.properties.margin;
        spacingMap.set(key, {
          count: (spacingMap.get(key)?.count || 0) + 1,
          type: 'margin',
        });
      }

      if (node.properties.gap) {
        const key = node.properties.gap;
        spacingMap.set(key, {
          count: (spacingMap.get(key)?.count || 0) + 1,
          type: 'gap',
        });
      }
    }

    // Traverse children
    node.children.forEach(traverse);
  };

  traverse(root);

  // Convert maps to arrays and sort by frequency
  const colors: ColorToken[] = Array.from(colorMap.entries())
    .map(([key, data]) => {
      const [value] = key.split('-');
      return {
        value,
        count: data.count,
        usage: data.usage,
      };
    })
    .sort((a, b) => b.count - a.count);

  const typography: TypographyToken[] = Array.from(typographyMap.values())
    .map(data => data.data)
    .sort((a, b) => b.count - a.count);

  const spacing: SpacingToken[] = Array.from(spacingMap.entries())
    .map(([value, data]) => ({
      value,
      type: data.type,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count);

  return { colors, typography, spacing };
}
