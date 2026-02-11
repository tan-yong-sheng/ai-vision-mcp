#!/usr/bin/env node
/**
 * ai-vision-mcp entry point
 *
 * Supports two modes:
 * 1. MCP mode (default): JSON-RPC over stdio
 * 2. CLI mode: Direct command execution
 */

import { runMcpServer } from './server.js';
import { runCli } from './cli/index.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Check if running in CLI mode
  // CLI mode: first arg is a command (analyze-image, compare-images, etc.)
  // MCP mode: no args or args start with --
  const commands = ['analyze-image', 'compare-images', 'detect-objects', 'analyze-video', 'help'];
  const isCliMode = args.length > 0 && commands.includes(args[0]);

  if (isCliMode) {
    // CLI mode
    await runCli(args);
  } else {
    // MCP mode (default)
    await runMcpServer();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
