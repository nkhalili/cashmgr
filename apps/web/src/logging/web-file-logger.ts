import { ConsoleLogger } from '@cashmgr/core';
import type { Logger, LogContext, LogLevel } from '@cashmgr/core';

const LOG_FILE_NAME = 'app.log';
const MAX_LOG_SIZE_BYTES = 2 * 1024 * 1024; // 2MB, then truncate

function isOPFSSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

/**
 * Writes logs as JSON lines to a file in OPFS (Origin Private File System)
 * so errors survive a page reload/close and can be exported for support.
 * Writes are serialized through a queue since OPFS file handles don't support
 * concurrent writers.
 */
export class WebFileLogger implements Logger {
  private queue: Promise<void> = Promise.resolve();

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
    const line = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context }) + '\n';
    this.queue = this.queue.then(() => this.append(line)).catch((err) => {
      // Last resort: the log sink itself failed, fall back to console so the error isn't lost silently.
      console.error('[CashMgr] Failed to write log entry:', err);
    });
  }

  private async append(line: string): Promise<void> {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(LOG_FILE_NAME, { create: true });
    const file = await fileHandle.getFile();
    const shouldTruncate = file.size > MAX_LOG_SIZE_BYTES;
    const writable = await fileHandle.createWritable({ keepExistingData: !shouldTruncate });
    await writable.write({ type: 'write', position: shouldTruncate ? 0 : file.size, data: line });
    await writable.close();
  }
}

export function createWebFileLogger(): Logger {
  return isOPFSSupported() ? new WebFileLogger() : new ConsoleLogger();
}

/**
 * Reads the current contents of the OPFS log file for the "Share log file"
 * settings action. Returns null when OPFS is unsupported or nothing has
 * been logged yet.
 */
export async function readWebLogFile(): Promise<{ content: string; size: number } | null> {
  if (!isOPFSSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(LOG_FILE_NAME, { create: false });
    const file = await fileHandle.getFile();
    if (file.size === 0) return null;
    return { content: await file.text(), size: file.size };
  } catch {
    // Log file doesn't exist yet — nothing has been logged.
    return null;
  }
}
