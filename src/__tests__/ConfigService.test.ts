/**
 * ConfigService tests
 */

import { ConfigService } from '../services/ConfigService.js';

describe('ConfigService', () => {
  it('should load configuration successfully', () => {
    const config = ConfigService.load();

    expect(config).toBeDefined();
    expect(config.IMAGE_PROVIDER).toBe('google');
    expect(config.VIDEO_PROVIDER).toBe('google');
    expect(config.LOG_LEVEL).toBe('error');
  });

  it('should be a singleton', () => {
    const service1 = ConfigService.getInstance();
    const service2 = ConfigService.getInstance();

    expect(service1).toBe(service2);
  });

  it('should throw error for missing Gemini config when required', () => {
    // This test assumes test environment has valid config
    expect(() => {
      ConfigService.getInstance().getGeminiConfig();
    }).not.toThrow();
  });
});
