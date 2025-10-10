/**
 * Object detection types for AI Vision MCP
 */

import type { AnalysisOptions } from './Providers.js';

export interface DetectedObject {
  object: string; // Generic category for detected object
  label: string; // Descriptive label or instance-specific detail
  normalized_box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized to 0-1000
}

export interface ObjectDetectionResult {
  detections: DetectedObject[];
  image_metadata: {
    width: number;
    height: number;
    size_bytes: number;
    format: string;
  };
  processing_time?: number;
  model: string;
  provider: string;
}

export interface ObjectDetectionArgs {
  imageSource: string; // URL, base64, or local file path
  prompt?: string; // Optional custom detection prompt
  outputFilePath?: string; // Optional explicit output path
  options?: AnalysisOptions; // Optional API configuration parameters
}

// MCP response types for different output scenarios
export interface DetectionWithFile {
  detections: DetectedObject[];
  file: {
    path: string;
    size_bytes: number;
    format: string;
  };
  image_metadata: {
    width: number;
    height: number;
    original_size: number;
  };
  summary: string; // Human-readable summary with percentage coordinates
}

export interface DetectionWithTempFile {
  detections: DetectedObject[];
  tempFile: {
    path: string;
    size_bytes: number;
    format: string;
    cleanup_note: string;
  };
  image_metadata: {
    width: number;
    height: number;
    original_size: number;
  };
  summary: string; // Human-readable summary with percentage coordinates
}

export interface DetectionWithInlineImage {
  detections: DetectedObject[];
  image?: {
    data: string;
    mimeType: string;
    size_bytes: number;
  };
  image_metadata: {
    width: number;
    height: number;
    original_size: number;
  };
  summary: string; // Human-readable summary with percentage coordinates
}

// Union type for all possible response types
export type ObjectDetectionResponse =
  | DetectionWithFile
  | DetectionWithTempFile
  | DetectionWithInlineImage;
