/**
 * E2E Test Setup - MCP Test Harness
 *
 * Provides utilities for:
 * - Creating MCP client with stdio transport
 * - Server lifecycle management (start/stop)
 * - Environment configuration
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

export interface TestClient extends Client {
  transport?: StdioClientTransport;
}

export interface ServerProcess {
  process: ChildProcess;
  stdout: string[];
  stderr: string[];
}

/**
 * Default test environment variables
 */
export function getDefaultTestEnv(): Record<string, string> {
  const env: Record<string, string> = {
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
    IMAGE_PROVIDER: 'google',
    VIDEO_PROVIDER: 'google',
    // Use dummy API key only if not already set in environment
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'test-api-key-for-e2e-tests',
  };

  // Pass through custom base URL if set (for proxy support)
  if (process.env.GEMINI_BASE_URL) {
    env.GEMINI_BASE_URL = process.env.GEMINI_BASE_URL;
  }

  return env;
}

/**
 * Create environment for test with overrides
 */
export function createTestEnv(overrides: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};

  // Copy process.env (only string values)
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  // Apply defaults and overrides
  Object.assign(env, getDefaultTestEnv(), overrides);

  return env;
}

/**
 * Start the MCP server as a subprocess
 */
export async function startServer(
  envOverrides: Record<string, string> = {}
): Promise<ServerProcess> {
  const serverPath = join(PROJECT_ROOT, 'dist', 'index.js');
  const env = createTestEnv(envOverrides);

  const stdout: string[] = [];
  const stderr: string[] = [];

  const serverProcess = spawn('node', [serverPath], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: PROJECT_ROOT,
  });

  // Capture stdout/stderr for debugging
  serverProcess.stdout?.on('data', (data: Buffer) => {
    const line = data.toString();
    stdout.push(line);
    // Limit buffer size
    if (stdout.length > 100) stdout.shift();
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    const line = data.toString();
    stderr.push(line);
    // Limit buffer size
    if (stderr.length > 100) stderr.shift();
  });

  // Wait a bit for server to initialize
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check if process exited early
  if (serverProcess.exitCode !== null) {
    const errorOutput = stderr.join('\n');
    throw new Error(
      `Server process exited early with code ${serverProcess.exitCode}. Stderr: ${errorOutput}`
    );
  }

  return {
    process: serverProcess,
    stdout,
    stderr,
  };
}

/**
 * Stop the server process
 */
export async function stopServer(server: ServerProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!server.process || server.process.killed) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      // Force kill if graceful shutdown takes too long
      if (!server.process.killed) {
        server.process.kill('SIGKILL');
      }
      resolve();
    }, 5000);

    server.process.on('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    // Try graceful shutdown first
    server.process.kill('SIGTERM');
  });
}

/**
 * Create an MCP client connected to the server via stdio transport
 * The transport will spawn the server process itself.
 */
export async function createMCPClient(
  envOverrides: Record<string, string> = {}
): Promise<{ client: TestClient; server: ServerProcess }> {
  const serverPath = join(PROJECT_ROOT, 'dist', 'index.js');
  const env = createTestEnv(envOverrides);

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env,
    cwd: PROJECT_ROOT,
  });

  const client = new Client(
    {
      name: 'e2e-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  await client.connect(transport);

  // Create a ServerProcess-like object for compatibility with existing tests
  const serverProcess: ServerProcess = {
    process: { killed: false } as ChildProcess,
    stdout: [],
    stderr: [],
  };

  // Capture stderr for debugging if needed
  if (transport.stderr) {
    transport.stderr.on('data', (data: Buffer) => {
      const line = data.toString();
      serverProcess.stderr.push(line);
      if (serverProcess.stderr.length > 100) serverProcess.stderr.shift();
    });
  }

  return { client: client as TestClient, server: serverProcess };
}

/**
 * Complete MCP client setup with server lifecycle
 * @deprecated Use createMCPClient directly instead
 */
export async function setupMCPClient(
  envOverrides: Record<string, string> = {}
): Promise<{ client: TestClient; server: ServerProcess }> {
  return createMCPClient(envOverrides);
}

/**
 * Clean up MCP client and server
 */
export async function teardownMCPClient(
  client: TestClient,
  _server?: ServerProcess
): Promise<void> {
  try {
    await client.close();
  } catch (error) {
    // Ignore close errors
  }
}

/**
 * Helper to get server logs for debugging
 */
export function getServerLogs(server: ServerProcess): { stdout: string; stderr: string } {
  return {
    stdout: server.stdout.join('\n'),
    stderr: server.stderr.join('\n'),
  };
}

/**
 * Wait for a specific message in server output
 */
export async function waitForServerMessage(
  server: ServerProcess,
  predicate: (line: string) => boolean,
  timeoutMs: number = 5000
): Promise<string> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      // Check stdout and stderr
      for (const line of [...server.stdout, ...server.stderr]) {
        if (predicate(line)) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve(line);
          return;
        }
      }

      if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        reject(new Error('Timeout waiting for server message'));
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Timeout waiting for server message'));
    }, timeoutMs);
  });
}

/**
 * Type guard for checking if response has error
 */
export function isErrorResponse(response: unknown): response is { isError: true; content: Array<{ text: string }> } {
  return (
    typeof response === 'object' &&
    response !== null &&
    'isError' in response &&
    response.isError === true &&
    'content' in response &&
    Array.isArray((response as Record<string, unknown>).content)
  );
}

/**
 * Parse tool result content as JSON
 */
export function parseToolResult<T>(response: { content: Array<{ text: string }> }): T {
  const text = response.content[0]?.text;
  if (!text) {
    throw new Error('No content in tool response');
  }
  return JSON.parse(text) as T;
}

// ============================================================================
// CLI Test Utilities
// ============================================================================

/**
 * CLI command execution result
 */
export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  success: boolean;
}

/**
 * Run a CLI command and capture output
 * @param args - CLI arguments (e.g., ['analyze-image', 'image.jpg', '--prompt', 'describe'])
 * @param envOverrides - Environment variable overrides
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 */
export async function runCliCommand(
  args: string[],
  envOverrides: Record<string, string> = {},
  timeoutMs: number = 60000
): Promise<CliResult> {
  const serverPath = join(PROJECT_ROOT, 'dist', 'index.js');
  const env = createTestEnv(envOverrides);

  return new Promise((resolve, reject) => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const childProcess = spawn('node', [serverPath, ...args], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: PROJECT_ROOT,
    });

    // Capture stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      stdout.push(data.toString());
    });

    // Capture stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      stderr.push(data.toString());
    });

    // Handle process completion
    childProcess.on('close', (exitCode) => {
      resolve({
        stdout: stdout.join(''),
        stderr: stderr.join(''),
        exitCode,
        success: exitCode === 0,
      });
    });

    // Handle process errors
    childProcess.on('error', (error) => {
      reject(error);
    });

    // Timeout handling
    setTimeout(() => {
      childProcess.kill('SIGKILL');
      reject(new Error(`CLI command timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Parse CLI JSON output
 * @param result - CLI execution result
 * @returns Parsed JSON data
 */
export function parseCliJsonOutput<T>(result: CliResult): T {
  try {
    return JSON.parse(result.stdout) as T;
  } catch (error) {
    throw new Error(`Failed to parse CLI JSON output: ${error}\nStdout: ${result.stdout}`);
  }
}

/**
 * Check if CLI output contains expected text (case-insensitive)
 * @param result - CLI execution result
 * @param expected - Expected text to find
 */
export function cliOutputContains(result: CliResult, expected: string): boolean {
  const combinedOutput = (result.stdout + result.stderr).toLowerCase();
  return combinedOutput.includes(expected.toLowerCase());
}

/**
 * Assert CLI command succeeded (exit code 0)
 * @param result - CLI execution result
 * @param message - Optional error message
 */
export function assertCliSuccess(result: CliResult, message?: string): void {
  if (!result.success) {
    throw new Error(
      message ||
        `CLI command failed with exit code ${result.exitCode}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`
    );
  }
}

/**
 * Assert CLI command failed (non-zero exit code)
 * @param result - CLI execution result
 * @param message - Optional error message
 */
export function assertCliError(result: CliResult, message?: string): void {
  if (result.success) {
    throw new Error(message || `Expected CLI command to fail, but it succeeded`);
  }
}

/**
 * Create a temporary file for testing
 * @param content - File content
 * @param extension - File extension (e.g., '.jpg', '.txt')
 * @returns Path to temporary file
 */
export async function createTempFile(content: Buffer | string, extension: string): Promise<string> {
  const tmpDir = join(PROJECT_ROOT, 'tmp');
  const fs = await import('fs/promises');

  // Ensure tmp directory exists
  await fs.mkdir(tmpDir, { recursive: true });

  const fileName = `test-${Date.now()}-${Math.random().toString(36).substring(7)}${extension}`;
  const filePath = join(tmpDir, fileName);

  await fs.writeFile(filePath, content);

  return filePath;
}

/**
 * Clean up temporary test files
 * @param filePath - Path to file to delete
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    const fs = await import('fs/promises');
    await fs.unlink(filePath);
  } catch {
    // Ignore errors if file doesn't exist
  }
}
