import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigService } from '../../src/services/ConfigService.js';
import { LoggerService } from '../../src/services/LoggerService.js';

describe('ConfigService - Provider Warnings', () => {
  let warnSpy: any;

  beforeEach(() => {
    // Clear singleton instance before each test
    (ConfigService as any).instance = undefined;

    // Spy on logger.warn
    const logger = LoggerService.getInstance('ai-vision-mcp');
    warnSpy = vi.spyOn(logger, 'warn' as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    (ConfigService as any).instance = undefined;
  });

  test('warns when IMAGE_PROVIDER and VIDEO_PROVIDER default to google', () => {
    // Set env to NOT have providers set
    delete process.env.IMAGE_PROVIDER;
    delete process.env.VIDEO_PROVIDER;
    process.env.GEMINI_API_KEY = 'test-key';

    const config = ConfigService.getInstance().getConfig();

    expect(config.IMAGE_PROVIDER).toBe('google');
    expect(config.VIDEO_PROVIDER).toBe('google');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: expect.stringContaining('IMAGE_PROVIDER defaults to google'),
      }),
      'config'
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: expect.stringContaining('VIDEO_PROVIDER defaults to google'),
      }),
      'config'
    );
  });

  test('warns when vertex_ai is set but missing VERTEX_CLIENT_EMAIL', () => {
    process.env.IMAGE_PROVIDER = 'vertex_ai';
    process.env.VIDEO_PROVIDER = 'vertex_ai';
    process.env.VERTEX_PROJECT_ID = 'test-project';
    process.env.VERTEX_PRIVATE_KEY = 'test-key';
    delete process.env.VERTEX_CLIENT_EMAIL;
    process.env.GCS_BUCKET_NAME = 'test-bucket';

    expect(() => {
      ConfigService.getInstance().getConfig();
    }).toThrow('VERTEX_CLIENT_EMAIL is required');
  });

  test('warns when vertex_ai is set but missing VERTEX_PRIVATE_KEY', () => {
    process.env.IMAGE_PROVIDER = 'vertex_ai';
    process.env.VIDEO_PROVIDER = 'vertex_ai';
    process.env.VERTEX_PROJECT_ID = 'test-project';
    process.env.VERTEX_CLIENT_EMAIL = 'test@example.com';
    delete process.env.VERTEX_PRIVATE_KEY;
    process.env.GCS_BUCKET_NAME = 'test-bucket';

    expect(() => {
      ConfigService.getInstance().getConfig();
    }).toThrow('VERTEX_PRIVATE_KEY is required');
  });

  test('warns when vertex_ai is set but missing VERTEX_PROJECT_ID', () => {
    process.env.IMAGE_PROVIDER = 'vertex_ai';
    process.env.VIDEO_PROVIDER = 'vertex_ai';
    delete process.env.VERTEX_PROJECT_ID;
    process.env.VERTEX_PRIVATE_KEY = 'test-key';
    process.env.VERTEX_CLIENT_EMAIL = 'test@example.com';
    process.env.GCS_BUCKET_NAME = 'test-bucket';

    expect(() => {
      ConfigService.getInstance().getConfig();
    }).toThrow('VERTEX_PROJECT_ID is required');
  });

  test('warns when vertex_ai is set but missing GCS_BUCKET_NAME', () => {
    process.env.IMAGE_PROVIDER = 'vertex_ai';
    process.env.VIDEO_PROVIDER = 'vertex_ai';
    process.env.VERTEX_PROJECT_ID = 'test-project';
    process.env.VERTEX_PRIVATE_KEY = 'test-key';
    process.env.VERTEX_CLIENT_EMAIL = 'test@example.com';
    delete process.env.GCS_BUCKET_NAME;

    expect(() => {
      ConfigService.getInstance().getConfig();
    }).toThrow('GCS_BUCKET_NAME is required');
  });

  test('warns when google provider is set but missing GEMINI_API_KEY', () => {
    process.env.IMAGE_PROVIDER = 'google';
    process.env.VIDEO_PROVIDER = 'google';
    delete process.env.GEMINI_API_KEY;

    expect(() => {
      ConfigService.getInstance().getConfig();
    }).toThrow('GEMINI_API_KEY is required');
  });
});
