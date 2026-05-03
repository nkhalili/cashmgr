/**
 * Logging service interface and implementations
 * Provides structured logging with different levels and context support
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Logger interface for application-wide logging
 * Can be implemented with different backends (console, file, remote service)
 */
export interface Logger {
  /**
   * Log debug information (verbose logging for development)
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Log error messages with optional error object
   */
  error(message: string, error?: Error, context?: LogContext): void;
}

/**
 * Console-based logger implementation
 * Suitable for development and testing environments
 * Outputs structured JSON logs with timestamps
 */
export class ConsoleLogger implements Logger {
  constructor(private readonly minLevel: LogLevel = 'info') {}

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog('error')) return;

    const errorContext: LogContext = {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    this.log('error', message, errorContext);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minLevelIndex = levels.indexOf(this.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

    logMethod(JSON.stringify(logEntry, null, 2));
  }
}

/**
 * No-op logger implementation
 * Useful for testing environments where logging should be suppressed
 */
export class NoopLogger implements Logger {
  debug(_message: string, _context?: LogContext): void {
    // No-op
  }

  info(_message: string, _context?: LogContext): void {
    // No-op
  }

  warn(_message: string, _context?: LogContext): void {
    // No-op
  }

  error(_message: string, _error?: Error, _context?: LogContext): void {
    // No-op
  }
}

/**
 * Global logger instance
 * Can be replaced with a different implementation (e.g., for production)
 */
let globalLogger: Logger = new ConsoleLogger();

/**
 * Get the current global logger instance
 */
export function getLogger(): Logger {
  return globalLogger;
}

/**
 * Set the global logger instance
 * Useful for configuring different loggers in different environments
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}
