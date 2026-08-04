import { Directory, File, Paths } from 'expo-file-system';
import type { Logger, LogContext, LogLevel } from '@cashmgr/core';

const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB, then truncate

/**
 * Returns a reference to the log file, creating the containing directory
 * if needed. Shared by the logger itself and the "Share log file" settings
 * action so both agree on the same location.
 */
export function getMobileLogFile(): File {
  const dir = new Directory(Paths.document, 'logs');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return new File(dir, 'app.log');
}

/**
 * Writes logs as JSON lines to a file in the app's document directory
 * so errors survive an app restart and can be shared for support.
 * Writes are serialized through a queue to avoid interleaved read-modify-writes.
 */
export class MobileFileLogger implements Logger {
  private readonly file: File;
  private queue: Promise<void> = Promise.resolve();

  constructor() {
    this.file = getMobileLogFile();
  }

  debug(message: string, context?: LogContext): void {
    this.enqueue('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.enqueue('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.enqueue('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.enqueue('error', message, {
      ...context,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
    });
  }

  private enqueue(level: LogLevel, message: string, context?: LogContext): void {
    const line = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context });
    this.queue = this.queue.then(() => this.append(line)).catch((err) => {
      // Last resort: the log sink itself failed, fall back to console so the error isn't lost silently.
      console.error('[CashMgr] Failed to write log entry:', err);
    });
  }

  private async append(line: string): Promise<void> {
    const existing = this.file.exists ? await this.file.text() : '';
    const shouldTruncate = existing.length > MAX_LOG_SIZE_BYTES;
    this.file.write((shouldTruncate ? '' : existing) + line + '\n');
  }
}
