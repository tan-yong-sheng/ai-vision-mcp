/**
 * Design audit types for pixel-level analysis and compliance checking
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorCluster {
  hex: string;
  rgb: RGB;
  percentage: number;
}

export interface EdgeAnalysis {
  edgePixels: number;
  density: number; // 0–1
  complexity: 'simple' | 'moderate' | 'complex';
  description: string;
}

export interface LuminanceStats {
  mean: number; // 0–255, overall brightness
  stdDev: number; // contrast proxy
}

export interface WCAGResult {
  color1: string;
  color2: string;
  ratio: number;
  passesAA: boolean; // 4.5:1
  passesAAA: boolean; // 7:1
}

export interface DesignMetrics {
  width: number;
  height: number;
  dominantColors: ColorCluster[];
  edges: EdgeAnalysis;
  luminance: LuminanceStats;
  wcag: WCAGResult[];
}

export interface DesignAuditResult {
  metrics: DesignMetrics;
  critique: string;
  issues: DesignIssue[];
  severity: 'pass' | 'minor' | 'major' | 'critical';
}

export interface DesignIssue {
  type: 'contrast' | 'complexity' | 'brightness' | 'spacing' | 'other';
  severity: 'info' | 'minor' | 'major' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
}
