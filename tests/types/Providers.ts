/**
 * Type definitions for Provider mocks and tests
 */

export interface AnalysisResult {
  description?: string;
  analysis?: string;
  metadata: {
    model: string;
    provider: string;
    total_tokens: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  label: string;
  confidence: number;
  bbox: BoundingBox;
  css_selector?: string;
}

export interface DetectionResult {
  detections: Detection[];
  image_metadata: {
    width: number;
    height: number;
    format: string;
    file_size?: number;
  };
  summary: {
    total_objects: number;
    unique_labels: string[];
  };
  metadata: {
    model: string;
    provider: string;
    total_tokens: number;
  };
}

export interface AnalysisOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  taskType?: 'image' | 'video';
  functionName?: string;
  responseSchema?: object;
  systemInstruction?: string;
}

export interface VisionProvider {
  analyzeImage(
    imageSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult>;

  compareImages(
    imageSources: string[],
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult>;

  detectObjects(
    imageSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<DetectionResult>;

  analyzeVideo(
    videoSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult>;
}
