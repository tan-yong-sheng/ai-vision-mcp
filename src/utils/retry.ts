/**
 * Retry logic and error handling utilities
 */

import {
  RateLimitExceededError,
  NetworkError,
} from '../types/Errors.js';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalDelay: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    'RATE_LIMIT_EXCEEDED',
    'NETWORK_ERROR',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
  ],
  onRetry: () => {},
};

export class RetryHandler {
  /**
   * Execute an operation with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error;
    let totalDelay = 0;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        const result = await operation();
        return {
          result,
          attempts: attempt + 1,
          totalDelay,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on the last attempt
        if (attempt === opts.maxRetries || !this.shouldRetry(lastError, opts)) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt, opts);
        totalDelay += delay;

        opts.onRetry(attempt + 1, lastError);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Execute an operation with exponential backoff
   */
  static async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const result = await this.withRetry(operation, {
      ...options,
      backoffMultiplier: 2,
      jitter: true,
    });
    return result.result;
  }

  /**
   * Execute an operation with linear backoff
   */
  static async withLinearBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const result = await this.withRetry(operation, {
      ...options,
      backoffMultiplier: 1,
      jitter: false,
    });
    return result.result;
  }

  /**
   * Determine if an error is retryable
   */
  private static shouldRetry(
    error: Error,
    options: Required<RetryOptions>
  ): boolean {
    // Check if it's a VisionError with a retryable code
    if ('code' in error && typeof error.code === 'string') {
      return options.retryableErrors.includes(error.code);
    }

    // Check if it's a RateLimitExceededError
    if (error instanceof RateLimitExceededError) {
      return true;
    }

    // Check if it's a NetworkError
    if (error instanceof NetworkError) {
      return true;
    }

    // Check error message for common network-related errors
    const message = error.message.toLowerCase();
    const networkErrorPatterns = [
      'network error',
      'connection refused',
      'connection reset',
      'name resolution failed',
    ];

    return networkErrorPatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Calculate delay before next retry
   */
  private static calculateDelay(
    attempt: number,
    options: Required<RetryOptions>
  ): number {
    let delay =
      options.baseDelay * Math.pow(options.backoffMultiplier, attempt);

    // Apply jitter if enabled
    if (options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    // Ensure delay doesn't exceed maximum
    return Math.min(delay, options.maxDelay);
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private static async sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retryable version of a function
   */
  static wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: RetryOptions = {}
  ): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const result = await this.withRetry(() => fn(...args), options);
      return result.result;
    }) as T;
  }
}

/**
 * Circuit breaker pattern for handling repeated failures
 */
export interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryDelay?: number;
  monitoringPeriod?: number;
  onStateChange?: (state: 'CLOSED' | 'OPEN' | 'HALF_OPEN') => void;
}

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private options: CircuitBreakerOptions = {}) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const opts = {
      failureThreshold: 5,
      recoveryDelay: 60000,
      monitoringPeriod: 10000,
      ...this.options,
    };

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > opts.recoveryDelay) {
        this.setState('HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;

    if (this.state === 'HALF_OPEN') {
      this.setState('CLOSED');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold!) {
      this.setState('OPEN');
    }
  }

  private setState(state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    this.state = state;
    this.options.onStateChange?.(state);
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  getSuccessCount(): number {
    return this.successCount;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
  }
}


/**
 * Bulkhead pattern for limiting concurrent operations
 */
export class Bulkhead {
  private running = 0;
  private queue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    operation: () => Promise<any>;
  }> = [];

  constructor(private maxConcurrency: number) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, operation });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { resolve, reject, operation } = this.queue.shift()!;

    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }

  getRunningCount(): number {
    return this.running;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}
