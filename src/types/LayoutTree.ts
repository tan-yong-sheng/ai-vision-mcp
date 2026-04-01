/**
 * Layout tree types for hierarchical UI structure extraction
 */

import type { AnalysisOptions } from './Providers.js';
import type { DesignTokens as DesignTokensType } from '../utils/designTokenExtractor.js';
import type { LayoutAnalysis as LayoutAnalysisType } from '../utils/layoutAnalyzer.js';
import type { SpatialMetrics as SpatialMetricsType } from '../utils/spatialMetrics.js';

export interface BoundingBox {
  x: number; // Pixels
  y: number;
  width: number;
  height: number;
  normalized: {
    x: number; // 0-1000 scale
    y: number;
    width: number;
    height: number;
  };
}

export interface LayoutNodeProperties {
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  padding?: number;
  margin?: number;
  gap?: number;
  display?: string; // 'flex', 'grid', 'block', etc.
}

export interface LayoutNode {
  id: string;
  type: string; // 'button', 'heading', 'container', etc.
  role?: string; // ARIA role
  text?: string; // Text content
  ariaLabel?: string;
  bounds: BoundingBox;
  children: LayoutNode[];
  properties?: LayoutNodeProperties;
}

export interface LayoutTreeMetadata {
  viewport: {
    width: number;
    height: number;
  };
  imageMetadata: {
    width: number;
    height: number;
    format: string;
    size_bytes: number;
  };
  extractionMethod: 'vision' | 'accessibility' | 'hybrid';
  processingTime: number;
  model?: string;
  provider?: string;
  coordinateScale: number; // 1000 for normalized coordinates
  coordinateFormat: string; // '[x, y, width, height]'
  designTokens?: DesignTokensType;
  layoutAnalysis?: LayoutAnalysisType;
  spatialMetrics?: SpatialMetricsType;
}

export interface LayoutTree {
  root: LayoutNode;
  metadata: LayoutTreeMetadata;
}

export interface ExtractLayoutTreeArgs {
  imageSource: string; // URL, base64, or local file path
  options?: AnalysisOptions; // Optional API configuration parameters
}

export interface ExtractLayoutTreeResponse {
  layoutTree: LayoutTree;
  summary: string; // Human-readable summary
}
