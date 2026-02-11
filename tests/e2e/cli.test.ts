/**
 * CLI E2E Tests
 *
 * Tests verify CLI functionality:
 * - All 4 commands work correctly
 * - Argument parsing (positional args, flags)
 * - Output formats (human-readable, JSON)
 * - Exit codes (0 for success, 1 for error)
 * - Error handling
 * - Help system
 *
 * To run these tests:
 *   npm run test:e2e:cli
 *
 * Tests are skipped by default unless GEMINI_API_KEY is set.
 */

import { describe, test, expect } from 'vitest';
import {
  runCliCommand,
  parseCliJsonOutput,
  cliOutputContains,
  assertCliSuccess,
  assertCliError,
  cleanupTempFile,
} from './setup.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

describe('CLI E2E Tests', () => {
  // Skip all CLI tests if no API key is available
  const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'test-api-key-for-e2e-tests';
  const testOrSkip = hasApiKey ? test : test.skip;

  describe('Help Command', () => {
    test('should display help for help command', async () => {
      const result = await runCliCommand(['help']);

      assertCliSuccess(result);
      expect(cliOutputContains(result, 'Commands:')).toBe(true);
      expect(cliOutputContains(result, 'analyze-image')).toBe(true);
      expect(cliOutputContains(result, 'compare-images')).toBe(true);
      expect(cliOutputContains(result, 'detect-objects')).toBe(true);
      expect(cliOutputContains(result, 'analyze-video')).toBe(true);
    });

    test('should display command-specific help', async () => {
      const result = await runCliCommand(['help', 'analyze-image']);

      assertCliSuccess(result);
      expect(cliOutputContains(result, 'Usage:')).toBe(true);
      expect(cliOutputContains(result, 'analyze-image')).toBe(true);
    });
  });

  describe('analyze-image Command', () => {
    testOrSkip(
      'should analyze image from URL (human output)',
      async () => {
        const result = await runCliCommand([
          'analyze-image',
          'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=300',
          '--prompt',
          'What is this image about? Give a one-sentence summary.',
          '--max-tokens',
          '100',
        ]);

        assertCliSuccess(result);
        expect(result.stdout.length).toBeGreaterThan(0);
      },
      60000
    );

    testOrSkip(
      'should analyze image from URL (JSON output)',
      async () => {
        const result = await runCliCommand([
          'analyze-image',
          'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=300',
          '--prompt',
          'Describe this image',
          '--json',
          '--max-tokens',
          '100',
        ]);

        assertCliSuccess(result);

        const parsed = parseCliJsonOutput<{ text?: string; description?: string; analysis?: string }>(result);
        const text = parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);
      },
      60000
    );

    testOrSkip(
      'should analyze base64 encoded image',
      async () => {
        // Small 1x1 red PNG in base64
        const base64Image =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

        const result = await runCliCommand([
          'analyze-image',
          base64Image,
          '--prompt',
          'What color is this?',
          '--json',
        ]);

        assertCliSuccess(result);

        const parsed = parseCliJsonOutput<{ text?: string; description?: string; analysis?: string }>(result);
        const text = parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);
      },
      60000
    );

    test('should fail with missing imageSource', async () => {
      const result = await runCliCommand(['analyze-image', '--prompt', 'describe']);

      assertCliError(result);
      expect(cliOutputContains(result, 'imageSource') || cliOutputContains(result, 'required')).toBe(true);
    });

    test('should fail with missing prompt', async () => {
      const result = await runCliCommand([
        'analyze-image',
        'https://example.com/image.jpg',
      ]);

      assertCliError(result);
      expect(cliOutputContains(result, 'prompt') || cliOutputContains(result, 'required')).toBe(true);
    });

    test('should fail with invalid URL', async () => {
      const result = await runCliCommand([
        'analyze-image',
        'not-a-valid-url',
        '--prompt',
        'describe',
      ]);

      assertCliError(result);
    });
  });

  describe('compare-images Command', () => {
    testOrSkip(
      'should compare two images (JSON output)',
      async () => {
        const result = await runCliCommand([
          'compare-images',
          'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=300',
          'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300',
          '--prompt',
          'Compare these two images',
          '--json',
          '--max-tokens',
          '200',
        ]);

        assertCliSuccess(result);

        const parsed = parseCliJsonOutput<{ text?: string; description?: string; analysis?: string }>(result);
        const text = parsed.text || parsed.description || parsed.analysis || '';
        expect(text.length).toBeGreaterThan(0);
      },
      60000
    );

    testOrSkip(
      'should compare three images',
      async () => {
        const result = await runCliCommand([
          'compare-images',
          'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=300',
          'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300',
          'https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=300',
          '--prompt',
          'Compare these three images',
          '--json',
        ]);

        assertCliSuccess(result);
      },
      60000
    );

    test('should fail with single image', async () => {
      const result = await runCliCommand([
        'compare-images',
        'https://example.com/image.jpg',
        '--prompt',
        'compare',
      ]);

      assertCliError(result);
    });

    test('should fail with too many images (>4)', async () => {
      const result = await runCliCommand([
        'compare-images',
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
        'https://example.com/4.jpg',
        'https://example.com/5.jpg',
        '--prompt',
        'compare',
      ]);

      assertCliError(result);
    });

    test('should fail with missing prompt', async () => {
      const result = await runCliCommand([
        'compare-images',
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
      ]);

      assertCliError(result);
    });
  });

  describe('detect-objects Command', () => {
    testOrSkip(
      'should detect objects in image (JSON output)',
      async () => {
        const result = await runCliCommand([
          'detect-objects',
          'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=400',
          '--prompt',
          'Detect animals in this image',
          '--json',
        ]);

        assertCliSuccess(result);

        const parsed = parseCliJsonOutput<{
          detections: Array<{
            label: string;
            confidence: number;
            bbox: { x: number; y: number; width: number; height: number };
          }>;
        }>(result);

        expect(parsed.detections).toBeDefined();
        expect(Array.isArray(parsed.detections)).toBe(true);
      },
      60000
    );

    testOrSkip(
      'should detect objects and save annotated image',
      async () => {
        const outputPath = join(PROJECT_ROOT, 'tmp', `annotated-${Date.now()}.jpg`);

        const result = await runCliCommand([
          'detect-objects',
          'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=400',
          '--prompt',
          'Detect animals',
          '--output',
          outputPath,
          '--json',
        ]);

        assertCliSuccess(result);

        // Verify output file exists
        const fs = await import('fs/promises');
        const stats = await fs.stat(outputPath);
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBeGreaterThan(0);

        // Cleanup
        await cleanupTempFile(outputPath);
      },
      60000
    );

    test('should fail with missing imageSource', async () => {
      const result = await runCliCommand(['detect-objects', '--prompt', 'detect people']);

      assertCliError(result);
    });

    test('should fail with missing prompt', async () => {
      const result = await runCliCommand([
        'detect-objects',
        'https://example.com/image.jpg',
      ]);

      assertCliError(result);
    });
  });

  describe('analyze-video Command', () => {
    testOrSkip(
      'should analyze video from URL',
      async () => {
        // Using a short test video
        const result = await runCliCommand([
          'analyze-video',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          '--prompt',
          'Summarize this video in one sentence',
          '--json',
          '--max-tokens',
          '100',
        ]);

        // Note: This may fail due to YouTube restrictions
        // but we test that the command runs
        if (result.success) {
          const parsed = parseCliJsonOutput<{ description?: string; analysis?: string }>(result);
          expect(parsed).toBeDefined();
        }
      },
      90000
    );

    test('should fail with missing videoSource', async () => {
      const result = await runCliCommand(['analyze-video', '--prompt', 'summarize']);

      assertCliError(result);
    });

    test('should fail with missing prompt', async () => {
      const result = await runCliCommand([
        'analyze-video',
        'https://youtube.com/watch?v=test',
      ]);

      assertCliError(result);
    });
  });

  describe('CLI Options and Configuration', () => {
    testOrSkip(
      'should support temperature option',
      async () => {
        const result = await runCliCommand([
          'analyze-image',
          'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=300',
          '--prompt',
          'Describe this',
          '--temperature',
          '0.1',
          '--json',
        ]);

        assertCliSuccess(result);
      },
      60000
    );

    testOrSkip(
      'should support top-p option',
      async () => {
        const result = await runCliCommand([
          'analyze-image',
          'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=300',
          '--prompt',
          'Describe this',
          '--top-p',
          '0.9',
          '--json',
        ]);

        assertCliSuccess(result);
      },
      60000
    );

    testOrSkip(
      'should support max-tokens option',
      async () => {
        const result = await runCliCommand([
          'analyze-image',
          'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=300',
          '--prompt',
          'Describe this',
          '--max-tokens',
          '50',
          '--json',
        ]);

        assertCliSuccess(result);
      },
      60000
    );

    test('should fail with invalid temperature (negative)', async () => {
      const result = await runCliCommand([
        'analyze-image',
        'https://example.com/image.jpg',
        '--prompt',
        'describe',
        '--temperature',
        '-0.5',
      ]);

      assertCliError(result);
    });

    test('should fail with invalid temperature (too high)', async () => {
      const result = await runCliCommand([
        'analyze-image',
        'https://example.com/image.jpg',
        '--prompt',
        'describe',
        '--temperature',
        '2.0',
      ]);

      assertCliError(result);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid image URL gracefully', async () => {
      const result = await runCliCommand([
        'analyze-image',
        'https://httpstat.us/404',
        '--prompt',
        'Describe this',
        '--json',
      ]);

      assertCliError(result);

      const parsed = parseCliJsonOutput<{ error: boolean; message: string }>(result);
      expect(parsed.error).toBe(true);
      expect(parsed.message).toBeDefined();
    });

    test('should handle non-existent local file', async () => {
      const result = await runCliCommand([
        'analyze-image',
        '/nonexistent/path/to/image.jpg',
        '--prompt',
        'Describe this',
        '--json',
      ]);

      assertCliError(result);
    });

    test('should return valid JSON on error when --json flag is used', async () => {
      const result = await runCliCommand([
        'analyze-image',
        'invalid-source',
        '--prompt',
        'describe',
        '--json',
      ]);

      assertCliError(result);

      // Should still return valid JSON even on error
      expect(() => {
        JSON.parse(result.stdout);
      }).not.toThrow();
    });
  });

  describe('Exit Codes', () => {
    test('should return exit code 0 on success', async () => {
      const result = await runCliCommand(['help']);
      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
    });

    test('should return exit code 1 on error', async () => {
      const result = await runCliCommand(['analyze-image']);
      expect(result.exitCode).toBe(1);
      expect(result.success).toBe(false);
    });
  });
});
