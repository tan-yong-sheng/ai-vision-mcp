/**
 * Object detection types for AI Vision MCP
 */

import type { AnalysisOptions } from './Providers.js';

export interface DetectedObject {
  object: string; // Generic category for detected object
  label: string; // Descriptive label or instance-specific detail
  normalized_box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized to 0-1000
  confidence: number; // Detection confidence score (0-1)
  mid?: string; // Knowledge Graph Machine ID for semantic enrichment
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
  viewportWidth?: number; // Optional logical viewport width (for web screenshots)
  viewportHeight?: number; // Optional logical viewport height (for web screenshots)
  options?: AnalysisOptions; // Optional API configuration parameters
}

// Enhanced metadata interface for object detection responses
export interface ObjectDetectionMetadata {
  model: string; // "gemini-2.5-flash-lite"
  provider: string; // "google" | "vertex_ai"
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  processingTime: number; // milliseconds
  fileType?: string; // "image/png"
  fileSize?: number; // bytes
  modelVersion?: string; // "gemini-2.5-flash-lite"
  responseId?: string; // "abc123..."
  fileSaveStatus?: 'saved' | 'skipped_due_to_permissions'; // File save status
  coordinateScale: number; // Coordinate normalization scale (1000)
  coordinateFormat: string; // Coordinate format description
  coordinateOrigin: string; // Coordinate origin (top-left)
  detectionMethod?: 'vision' | 'ml' | 'hybrid'; // How detection was performed
  imageOrientation?: number; // EXIF orientation (0, 90, 180, 270)
  timestamp?: string; // ISO 8601 when detection was performed
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
    viewport?: {
      width: number;
      height: number;
    };
  };
  summary: string; // Human-readable summary with percentage coordinates
  metadata: ObjectDetectionMetadata; // Enhanced metadata
}

export interface DetectionWithTempFile {
  detections: DetectedObject[];
  tempFile: {
    path: string;
    size_bytes: number;
    format: string;
  };
  image_metadata: {
    width: number;
    height: number;
    original_size: number;
    viewport?: {
      width: number;
      height: number;
    };
  };
  summary: string; // Human-readable summary with percentage coordinates
  metadata: ObjectDetectionMetadata; // Enhanced metadata
}

export interface DetectionOnly {
  detections: DetectedObject[];
  image_metadata: {
    width: number;
    height: number;
    original_size: number;
    viewport?: {
      width: number;
      height: number;
    };
  };
  summary: string; // Human-readable summary with percentage coordinates
  metadata: ObjectDetectionMetadata; // Enhanced metadata
}

// Union type for all possible response types
export type ObjectDetectionResponse =
  | DetectionWithFile
  | DetectionWithTempFile
  | DetectionOnly;
