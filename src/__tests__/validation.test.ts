/**
 * Validation tests
 */

import {
  validateConfig,
  validateAnalysisOptions,
  validateAnalyzeImageArgs,
  validateAnalyzeVideoArgs,
} from '../utils/validation.js';

describe('Validation', () => {
  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const config = {
        IMAGE_PROVIDER: 'google',
        VIDEO_PROVIDER: 'google',
        GEMINI_API_KEY: 'test-key',
        LOG_LEVEL: 'info',
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should reject invalid provider', () => {
      const config = {
        IMAGE_PROVIDER: 'invalid_provider',
      };

      expect(() => validateConfig(config)).toThrow();
    });
  });

  describe('validateAnalysisOptions', () => {
    it('should validate valid options', () => {
      const options = {
        temperature: 0.7,
        maxTokens: 1000,
      };

      expect(() => validateAnalysisOptions(options)).not.toThrow();
    });

    it('should reject invalid temperature', () => {
      const options = {
        temperature: 3.0, // Too high
      };

      expect(() => validateAnalysisOptions(options)).toThrow();
    });
  });

  describe('validateAnalyzeImageArgs', () => {
    it('should validate valid image args', () => {
      const args = {
        imageSource: 'https://example.com/image.jpg',
        prompt: 'Describe this image',
      };

      expect(() => validateAnalyzeImageArgs(args)).not.toThrow();
    });

    it('should reject missing image source', () => {
      const args = {
        prompt: 'Describe this image',
      };

      expect(() => validateAnalyzeImageArgs(args)).toThrow();
    });

    it('should reject missing prompt', () => {
      const args = {
        imageSource: 'https://example.com/image.jpg',
      };

      expect(() => validateAnalyzeImageArgs(args)).toThrow();
    });
  });

  describe('validateAnalyzeVideoArgs', () => {
    it('should validate valid video args', () => {
      const args = {
        videoSource: 'https://example.com/video.mp4',
        prompt: 'Describe this video',
      };

      expect(() => validateAnalyzeVideoArgs(args)).not.toThrow();
    });

    it('should reject missing video source', () => {
      const args = {
        prompt: 'Describe this video',
      };

      expect(() => validateAnalyzeVideoArgs(args)).toThrow();
    });

    it('should reject missing prompt', () => {
      const args = {
        videoSource: 'https://example.com/video.mp4',
      };

      expect(() => validateAnalyzeVideoArgs(args)).toThrow();
    });
  });
});
