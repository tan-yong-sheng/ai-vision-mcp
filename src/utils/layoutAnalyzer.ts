/**
 * Layout Analyzer
 * Analyzes layout structure (flex/grid, alignment, hierarchy) from layout tree
 */

import type { LayoutNode } from '../types/LayoutTree.js';

export interface LayoutAnalysis {
  primaryLayout: string; // 'flex', 'grid', 'block', etc.
  alignmentPatterns: string[]; // e.g., ['center', 'space-between']
  gridInfo?: {
    columns: number;
    rows?: number;
    gap?: number;
  };
  hierarchy: {
    depth: number;
    sections: number;
    containers: number;
  };
}

/**
 * Detect layout type from element properties
 */
function detectLayoutType(node: LayoutNode): string {
  if (node.properties?.display) {
    return node.properties.display;
  }

  // Infer from element type
  const type = node.type.toLowerCase();
  if (type === 'nav' || type === 'header' || type === 'footer') {
    return 'flex'; // Common for navigation
  }
  if (type === 'section' || type === 'article') {
    return 'block';
  }

  return 'block'; // Default
}

/**
 * Detect alignment patterns from children
 */
function detectAlignmentPatterns(node: LayoutNode): string[] {
  const patterns = new Set<string>();

  if (node.children.length < 2) {
    return Array.from(patterns);
  }

  // Check horizontal alignment
  const xPositions = node.children.map(child => child.bounds.x);
  const uniqueXPositions = new Set(xPositions);

  if (uniqueXPositions.size === 1) {
    patterns.add('left-aligned');
  }

  // Check if centered
  const containerCenter = node.bounds.x + node.bounds.width / 2;
  const childCenters = node.children.map(child => child.bounds.x + child.bounds.width / 2);
  const avgChildCenter = childCenters.reduce((a, b) => a + b, 0) / childCenters.length;

  if (Math.abs(containerCenter - avgChildCenter) < 10) {
    patterns.add('center-aligned');
  }

  // Check vertical alignment
  const yPositions = node.children.map(child => child.bounds.y);
  const uniqueYPositions = new Set(yPositions);

  if (uniqueYPositions.size === 1) {
    patterns.add('top-aligned');
  }

  // Check spacing consistency (space-between pattern)
  if (node.children.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < node.children.length; i++) {
      const gap = node.children[i].bounds.x - (node.children[i - 1].bounds.x + node.children[i - 1].bounds.width);
      gaps.push(gap);
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;

    if (gapVariance < 10) {
      patterns.add('space-between');
    }
  }

  return Array.from(patterns);
}

/**
 * Detect grid information from layout
 */
function detectGridInfo(node: LayoutNode): { columns: number; rows?: number; gap?: number } | undefined {
  if (node.children.length < 2) {
    return undefined;
  }

  // Detect columns by analyzing x positions
  const xPositions = new Set(node.children.map(child => child.bounds.x));
  const columns = xPositions.size;

  if (columns < 2) {
    return undefined;
  }

  // Detect gap
  const gaps: number[] = [];
  const sortedChildren = [...node.children].sort((a, b) => a.bounds.x - b.bounds.x);

  for (let i = 1; i < sortedChildren.length; i++) {
    const gap = sortedChildren[i].bounds.x - (sortedChildren[i - 1].bounds.x + sortedChildren[i - 1].bounds.width);
    if (gap > 0) {
      gaps.push(gap);
    }
  }

  const avgGap = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : undefined;

  // Detect rows
  const yPositions = new Set(node.children.map(child => child.bounds.y));
  const rows = yPositions.size > 1 ? yPositions.size : undefined;

  return {
    columns,
    rows,
    gap: avgGap,
  };
}

/**
 * Analyze hierarchy depth and structure
 */
function analyzeHierarchy(node: LayoutNode): { depth: number; sections: number; containers: number } {
  let maxDepth = 0;
  let sectionCount = 0;
  let containerCount = 0;

  const traverse = (n: LayoutNode, depth: number) => {
    maxDepth = Math.max(maxDepth, depth);

    const type = n.type.toLowerCase();
    if (type === 'section' || type === 'article') {
      sectionCount++;
    }
    if (type === 'div' || type === 'container') {
      containerCount++;
    }

    n.children.forEach(child => traverse(child, depth + 1));
  };

  traverse(node, 0);

  return {
    depth: maxDepth,
    sections: sectionCount,
    containers: containerCount,
  };
}

/**
 * Analyze layout structure from tree
 */
export function analyzeLayout(root: LayoutNode): LayoutAnalysis {
  const primaryLayout = detectLayoutType(root);
  const alignmentPatterns = detectAlignmentPatterns(root);
  const gridInfo = detectGridInfo(root);
  const hierarchy = analyzeHierarchy(root);

  return {
    primaryLayout,
    alignmentPatterns,
    gridInfo,
    hierarchy,
  };
}
