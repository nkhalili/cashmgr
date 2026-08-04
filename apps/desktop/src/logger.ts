import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type { Logger, LogContext, LogLevel } from '@cashmgr/core';

const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, then rotate to app.log.1

/**
 * Writes logs as JSON lines to a file in the app's userData directory
 * so errors survive after the app is closed and can be attached to bug reports.
 */
export class DesktopFileLogger implements Logger {
  private readonly logPath: string;

  constructor() {
    const logDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    this.logPath = path.join(logDir, 'app.log');
  }

  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.write('error', message, {
      ...context,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
    });
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    const line = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context });
    try {
      this.rotateIfNeeded();
      fs.appendFileSync(this.logPath, line + '\n');
    } catch (err) {
      // Last resort: the log sink itself failed, fall back to console so the error isn't lost silently.
      console.error('Failed to write to log file:', err);
    }
  }

  private rotateIfNeeded(): void {
    try {
      const { size } = fs.statSync(this.logPath);
      if (size > MAX_LOG_SIZE_BYTES) {
        fs.renameSync(this.logPath, `${this.logPath}.1`);
      }
    } catch {
      // Log file doesn't exist yet — nothing to rotate.
    }
  }
}
