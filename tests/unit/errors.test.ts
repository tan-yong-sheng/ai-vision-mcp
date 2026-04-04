import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import {
  VisionError,
  ConfigurationError,
  ProviderError,
  FileUploadError,
  FileNotFoundError,
  UnsupportedFileTypeError,
  FileSizeExceededError,
  RateLimitExceededError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  ValidationError,
  StorageError,
} from '../../src/types/Errors.js';

describe('Errors', () => {
  test('VisionError stores core fields', () => {
    const originalError = new Error('original');
    const error = new VisionError('message', 'CUSTOM_CODE', 'gemini', originalError, 500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(VisionError);
    expect(error.name).toBe('VisionError');
    expect(error.message).toBe('message');
    expect(error.code).toBe('CUSTOM_CODE');
    expect(error.provider).toBe('gemini');
    expect(error.originalError).toBe(originalError);
    expect(error.statusCode).toBe(500);
  });

  test('ConfigurationError stores variable name and default status', () => {
    const error = new ConfigurationError('missing config', 'API_KEY');

    expect(error).toBeInstanceOf(VisionError);
    expect(error.name).toBe('ConfigurationError');
    expect(error.code).toBe('CONFIG_ERROR');
    expect(error.variable).toBe('API_KEY');
    expect(error.statusCode).toBe(400);
  });

  test('ProviderError stores provider and original error', () => {
    const originalError = new Error('upstream failed');
    const error = new ProviderError('provider failed', 'gemini', originalError, 502);

    expect(error.name).toBe('ProviderError');
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.provider).toBe('gemini');
    expect(error.originalError).toBe(originalError);
    expect(error.statusCode).toBe(502);
  });

  test('FileUploadError stores provider and original error', () => {
    const originalError = new Error('upload failed');
    const error = new FileUploadError('upload failed', 'storage', originalError, 503);

    expect(error.name).toBe('FileUploadError');
    expect(error.code).toBe('FILE_UPLOAD_ERROR');
    expect(error.provider).toBe('storage');
    expect(error.originalError).toBe(originalError);
    expect(error.statusCode).toBe(503);
  });

  test('FileNotFoundError stores file id and status', () => {
    const error = new FileNotFoundError('file-123', 'gemini');

    expect(error.name).toBe('FileNotFoundError');
    expect(error.code).toBe('FILE_NOT_FOUND');
    expect(error.provider).toBe('gemini');
    expect(error.fileId).toBe('file-123');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('File not found: file-123');
  });

  test('UnsupportedFileTypeError includes supported types when provided', () => {
    const error = new UnsupportedFileTypeError('video/avi', ['mp4', 'mov']);

    expect(error.name).toBe('UnsupportedFileTypeError');
    expect(error.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(error.mimeType).toBe('video/avi');
    expect(error.supportedTypes).toEqual(['mp4', 'mov']);
    expect(error.message).toContain('Supported types: mp4, mov');
    expect(error.statusCode).toBe(400);
  });

  test('UnsupportedFileTypeError omits supported types when not provided', () => {
    const error = new UnsupportedFileTypeError('video/avi');

    expect(error.message).toBe('Unsupported file type: video/avi');
    expect(error.supportedTypes).toBeUndefined();
  });

  test('FileSizeExceededError stores size metadata', () => {
    const error = new FileSizeExceededError(123, 100);

    expect(error.name).toBe('FileSizeExceededError');
    expect(error.code).toBe('FILE_SIZE_EXCEEDED');
    expect(error.fileSize).toBe(123);
    expect(error.maxSize).toBe(100);
    expect(error.statusCode).toBe(400);
  });

  test('RateLimitExceededError stores retryAfter and status', () => {
    const error = new RateLimitExceededError('rate limited', 'gemini', 30);

    expect(error.name).toBe('RateLimitExceededError');
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.provider).toBe('gemini');
    expect(error.retryAfter).toBe(30);
    expect(error.statusCode).toBe(429);
  });

  test('AuthenticationError and AuthorizationError map to correct codes', () => {
    const authn = new AuthenticationError('missing token', 'gemini');
    const authz = new AuthorizationError('forbidden', 'gemini');

    expect(authn.code).toBe('AUTHENTICATION_ERROR');
    expect(authn.provider).toBe('gemini');
    expect(authn.statusCode).toBe(401);

    expect(authz.code).toBe('AUTHORIZATION_ERROR');
    expect(authz.provider).toBe('gemini');
    expect(authz.statusCode).toBe(403);
  });

  test('VisionError captures stack traces when available', () => {
    const captureStackTrace = vi
      .spyOn(Error as ErrorConstructor & { captureStackTrace?: typeof Error.captureStackTrace }, 'captureStackTrace')
      .mockImplementation(() => {});

    const error = new VisionError('message', 'CUSTOM_CODE');

    expect(captureStackTrace).toHaveBeenCalledWith(error, VisionError);
  });

  test('VisionError still constructs when captureStackTrace is unavailable', () => {
    const originalCaptureStackTrace = Error.captureStackTrace;
    Object.defineProperty(Error, 'captureStackTrace', {
      configurable: true,
      value: undefined,
    });

    const error = new VisionError('message', 'CUSTOM_CODE');

    expect(error.name).toBe('VisionError');
    expect(error.message).toBe('message');

    Object.defineProperty(Error, 'captureStackTrace', {
      configurable: true,
      value: originalCaptureStackTrace,
    });
  });

  test('optional fields remain undefined when omitted', () => {
    const configurationError = new ConfigurationError('missing config');
    const providerError = new ProviderError('provider failed', 'gemini');
    const fileUploadError = new FileUploadError('upload failed');
    const rateLimitError = new RateLimitExceededError('rate limited');
    const networkError = new NetworkError('network failed');
    const validationError = new ValidationError('invalid prompt');
    const storageError = new StorageError('storage failed');

    expect(configurationError.variable).toBeUndefined();
    expect(providerError.originalError).toBeUndefined();
    expect(providerError.statusCode).toBeUndefined();
    expect(fileUploadError.provider).toBeUndefined();
    expect(fileUploadError.originalError).toBeUndefined();
    expect(fileUploadError.statusCode).toBeUndefined();
    expect(rateLimitError.retryAfter).toBeUndefined();
    expect(networkError.originalError).toBeUndefined();
    expect(validationError.field).toBeUndefined();
    expect(storageError.provider).toBeUndefined();
    expect(storageError.originalError).toBeUndefined();
    expect(storageError.statusCode).toBeUndefined();
  });

  test('NetworkError stores original error', () => {
    const originalError = new Error('reset');
    const error = new NetworkError('network failed', originalError);

    expect(error.name).toBe('NetworkError');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.originalError).toBe(originalError);
  });

  test('ValidationError stores field name', () => {
    const error = new ValidationError('invalid prompt', 'prompt');

    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.field).toBe('prompt');
    expect(error.statusCode).toBe(400);
  });

  test('StorageError stores storage type and original error', () => {
    const originalError = new Error('bucket unavailable');
    const error = new StorageError('storage failed', 'gcs', originalError, 503);

    expect(error.name).toBe('StorageError');
    expect(error.code).toBe('STORAGE_ERROR');
    expect(error.provider).toBe('gcs');
    expect(error.originalError).toBe(originalError);
    expect(error.statusCode).toBe(503);
  });
});
