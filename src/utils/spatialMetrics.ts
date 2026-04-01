/**
 * Spatial Metrics Calculator
 * Calculates spatial relationships and metrics from layout tree
 */

import type { LayoutNode } from '../types/LayoutTree.js';

export interface AlignmentMetric {
  type: 'horizontal' | 'vertical';
  position: number;
  elementCount: number;
  elements: string[]; // Element IDs
}

export interface SpacingConsistency {
  consistent: boolean;
  gaps: number[];
  averageGap: number;
  variance: number;
}

export interface Collision {
  element1: string;
  element2: string;
  overlapArea: number;
}

export interface SpatialMetrics {
  alignmentMetrics: AlignmentMetric[];
  spacingConsistency: SpacingConsistency;
  collisions: Collision[];
}

/**
 * Check if two rectangles overlap
 */
function rectanglesOverlap(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number
): boolean {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

/**
 * Calculate overlap area between two rectangles
 */
function calculateOverlapArea(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number
): number {
  const overlapX = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2));
  const overlapY = Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));
  return overlapX * overlapY;
}

/**
 * Detect horizontal alignment patterns
 */
function detectHorizontalAlignment(node: LayoutNode): AlignmentMetric[] {
  const alignmentMap = new Map<number, { count: number; elements: string[] }>();

  node.children.forEach(child => {
    const x = child.bounds.x;
    const key = Math.round(x / 10) * 10; // Group by 10px tolerance

    if (!alignmentMap.has(key)) {
      alignmentMap.set(key, { count: 0, elements: [] });
    }

    const entry = alignmentMap.get(key)!;
    entry.count++;
    entry.elements.push(child.id);
  });

  return Array.from(alignmentMap.entries())
    .filter(([_, data]) => data.count >= 2)
    .map(([position, data]) => ({
      type: 'horizontal' as const,
      position,
      elementCount: data.count,
      elements: data.elements,
    }))
    .sort((a, b) => b.elementCount - a.elementCount);
}

/**
 * Detect vertical alignment patterns
 */
function detectVerticalAlignment(node: LayoutNode): AlignmentMetric[] {
  const alignmentMap = new Map<number, { count: number; elements: string[] }>();

  node.children.forEach(child => {
    const y = child.bounds.y;
    const key = Math.round(y / 10) * 10; // Group by 10px tolerance

    if (!alignmentMap.has(key)) {
      alignmentMap.set(key, { count: 0, elements: [] });
    }

    const entry = alignmentMap.get(key)!;
    entry.count++;
    entry.elements.push(child.id);
  });

  return Array.from(alignmentMap.entries())
    .filter(([_, data]) => data.count >= 2)
    .map(([position, data]) => ({
      type: 'vertical' as const,
      position,
      elementCount: data.count,
      elements: data.elements,
    }))
    .sort((a, b) => b.elementCount - a.elementCount);
}

/**
 * Calculate spacing consistency between sibling elements
 */
function calculateSpacingConsistency(node: LayoutNode): SpacingConsistency {
  if (node.children.length < 2) {
    return {
      consistent: true,
      gaps: [],
      averageGap: 0,
      variance: 0,
    };
  }

  const gaps: number[] = [];

  // Sort children by x position
  const sortedChildren = [...node.children].sort((a, b) => a.bounds.x - b.bounds.x);

  for (let i = 1; i < sortedChildren.length; i++) {
    const gap = sortedChildren[i].bounds.x - (sortedChildren[i - 1].bounds.x + sortedChildren[i - 1].bounds.width);
    if (gap >= 0) {
      gaps.push(gap);
    }
  }

  if (gaps.length === 0) {
    return {
      consistent: true,
      gaps: [],
      averageGap: 0,
      variance: 0,
    };
  }

  const averageGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - averageGap, 2), 0) / gaps.length;

  // Consider consistent if variance is low (< 25)
  const consistent = variance < 25;

  return {
    consistent,
    gaps: gaps.map(g => Math.round(g)),
    averageGap: Math.round(averageGap),
    variance: Math.round(variance),
  };
}

/**
 * Detect collisions (overlapping elements)
 */
function detectCollisions(node: LayoutNode): Collision[] {
  const collisions: Collision[] = [];

  for (let i = 0; i < node.children.length; i++) {
    for (let j = i + 1; j < node.children.length; j++) {
      const child1 = node.children[i];
      const child2 = node.children[j];

      if (
        rectanglesOverlap(
          child1.bounds.x,
          child1.bounds.y,
          child1.bounds.width,
          child1.bounds.height,
          child2.bounds.x,
          child2.bounds.y,
          child2.bounds.width,
          child2.bounds.height
        )
      ) {
        const overlapArea = calculateOverlapArea(
          child1.bounds.x,
          child1.bounds.y,
          child1.bounds.width,
          child1.bounds.height,
          child2.bounds.x,
          child2.bounds.y,
          child2.bounds.width,
          child2.bounds.height
        );

        collisions.push({
          element1: child1.id,
          element2: child2.id,
          overlapArea: Math.round(overlapArea),
        });
      }
    }
  }

  return collisions;
}

/**
 * Calculate spatial metrics from layout tree
 */
export function calculateSpatialMetrics(root: LayoutNode): SpatialMetrics {
  const horizontalAlignments = detectHorizontalAlignment(root);
  const verticalAlignments = detectVerticalAlignment(root);
  const spacingConsistency = calculateSpacingConsistency(root);
  const collisions = detectCollisions(root);

  return {
    alignmentMetrics: [...horizontalAlignments, ...verticalAlignments],
    spacingConsistency,
    collisions,
  };
}
