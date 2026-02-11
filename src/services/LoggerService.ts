import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export type McpLogLevel =
  | 'debug'
  | 'info'
  | 'notice'
  | 'warning'
  | 'error'
  | 'critical'
  | 'alert'
  | 'emergency';

/**
 * MCP-aware logger.
 *
 * - Uses MCP `notifications/message` when available (stdio-safe)
 * - Falls back to stderr when server transport isn't connected yet
 */
export class LoggerService {
  private static instance: LoggerService | null = null;

  private mcpServer: McpServer | null = null;
  private loggerName: string;
  private constructor(loggerName: string) {
    this.loggerName = loggerName;
  }

  static getInstance(loggerName: string = 'ai-vision-mcp') {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService(loggerName);
    }
    return LoggerService.instance;
  }

  attachServer(server: McpServer) {
    this.mcpServer = server;
  }

  setLoggerName(name: string) {
    this.loggerName = name;
  }

  debug(data: unknown, logger?: string) {
    return this.log('debug', data, logger);
  }
  info(data: unknown, logger?: string) {
    return this.log('info', data, logger);
  }
  notice(data: unknown, logger?: string) {
    return this.log('notice', data, logger);
  }
  warn(data: unknown, logger?: string) {
    return this.log('warning', data, logger);
  }
  error(data: unknown, logger?: string) {
    return this.log('error', data, logger);
  }

  async log(level: McpLogLevel, data: unknown, logger?: string) {
    const msg = this.scrub(data);

    // If attached and capability enabled, prefer MCP logging
    if (this.mcpServer) {
      try {
        // sdk v1 uses server.server.sendLoggingMessage
        await this.mcpServer.server.sendLoggingMessage({
          level,
          logger: logger || this.loggerName,
          data: msg,
        });
        return;
      } catch {
        // fallthrough to stderr
      }
    }

    // stderr fallback: important for pre-connect and fatal events.
    // Never write to stdout.
    const prefix = `[${level}] ${logger || this.loggerName}:`;
    if (typeof msg === 'string') {
      console.error(prefix, msg);
    } else {
      console.error(prefix, JSON.stringify(msg));
    }
  }

  /**
   * Very small scrubber to avoid logging obvious secrets.
   * (Not a full DLP solution.)
   */
  private scrub(data: unknown): unknown {
    const s =
      typeof data === 'string'
        ? data
        : (() => {
            try {
              return JSON.stringify(data);
            } catch {
              return String(data);
            }
          })();

    // redact common key patterns
    return s
      .replace(/(api[_-]?key\s*[:=]\s*)([^\s"']+)/gi, '$1[REDACTED]')
      .replace(/(authorization\s*[:=]\s*)([^\s"']+)/gi, '$1[REDACTED]')
      .replace(/(bearer\s+)([a-z0-9\-\._~\+\/]+=*)/gi, '$1[REDACTED]');
  }
}
