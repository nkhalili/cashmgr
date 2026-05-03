import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  ConsoleLogger,
  NoopLogger,
  getLogger,
  setLogger,
  type LogContext,
} from '../logger';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleLogSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleWarnSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Create logger with 'debug' min level to test all log levels
    logger = new ConsoleLogger('debug');
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debug', () => {
    it('should log debug message without context', () => {
      logger.debug('Debug message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logOutput) as Record<string, unknown>;
      expect(parsed.level).toBe('debug');
      expect(parsed.message).toBe('Debug message');
      expect(parsed.timestamp).toBeDefined();
    });

    it('should log debug message with context', () => {
      const context: LogContext = { userId: '123', action: 'login' };

      logger.debug('User action', context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logOutput) as Record<string, unknown>;
      expect(parsed.level).toBe('debug');
      expect(parsed.message).toBe('User action');
      expect(parsed.userId).toBe('123');
      expect(parsed.action).toBe('login');
    });

    it('should handle empty context object', () => {
      logger.debug('Message', {});

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logOutput) as Record<string, unknown>;
      expect(parsed.level).toBe('debug');
      expect(parsed.message).toBe('Message');
    });
  });

  describe('info', () => {
    it('should log info message without context', () => {
      logger.info('Info message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logOutput) as Record<string, unknown>;
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Info message');
      expect(parsed.timestamp).toBeDefined();
    });

    it('should log info message with context', () => {
      const context: LogContext = { operation: 'create', entity: 'transaction' };

      logger.info('Operation started', context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logOutput) as Record<string, unknown>;
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Operation started');
      expect(parsed.operation).toBe('create');
      expect(parsed.entity).toBe('transaction');
    });
  });

  describe('warn', () => {
    it('should log warning message without context', () => {
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleWarnSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logOutput) as Record<string, unknown>;
      expect(parsed.level).toBe('warn');
      expect(parsed.message).toBe('Warning message');
      expect(parsed.timestamp).toBeDefined();
    });

    it('should log warning message with context', () => {
      const context: LogContext = { threshold: 100, current: 95 };

      logger.warn('Approaching limit', context);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleWarnSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logOutput) as Record<string, unknown>;
      expect(parsed.level).toBe('warn');
      expect(parsed.message).toBe('Approaching limit');
      expect(parsed.threshold).toBe(100);
      expect(parsed.current).toBe(95);
    });
  });

  describe('error', () => {
    it('should log error message without error object or context', () => {
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logOutput) as Record<string, unknown>;
      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('Error message');
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.error).toBeUndefined();
    });

    it('should log error message with error object', () => {
      const error = new Error('Something went wrong');

      logger.error('Operation failed', error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logOutput) as Record<string, unknown>;
      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('Operation failed');
      expect(parsed.error).toBeDefined();
      const errorObj = parsed.error as Record<string, unknown>;
      expect(errorObj.name).toBe('Error');
      expect(errorObj.message).toBe('Something went wrong');
      expect(errorObj.stack).toBeDefined();
    });

    it('should log error message with error and context', () => {
      const error = new Error('Database error');
      const context: LogContext = { table: 'transactions', operation: 'insert' };

      logger.error('Database operation failed', error, context);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logOutput) as Record<string, unknown>;
      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('Database operation failed');
      expect(parsed.table).toBe('transactions');
      expect(parsed.operation).toBe('insert');
      expect(parsed.error).toBeDefined();
      const errorObj = parsed.error as Record<string, unknown>;
      expect(errorObj.message).toBe('Database error');
    });

    it('should handle error without context', () => {
      const error = new Error('Test error');

      logger.error('Error occurred', error, undefined);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logOutput) as Record<string, unknown>;
      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('Error occurred');
      expect(parsed.error).toBeDefined();
      const errorObj = parsed.error as Record<string, unknown>;
      expect(errorObj.message).toBe('Test error');
    });
  });

  describe('log level filtering', () => {
    it('should filter debug logs when minLevel is info', () => {
      const infoLogger = new ConsoleLogger('info');
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      infoLogger.debug('Debug message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    it('should allow info logs when minLevel is info', () => {
      const infoLogger = new ConsoleLogger('info');
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      infoLogger.info('Info message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      consoleLogSpy.mockRestore();
    });

    it('should allow all logs when minLevel is debug', () => {
      const debugLogger = new ConsoleLogger('debug');
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      debugLogger.debug('Debug');
      debugLogger.info('Info');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      consoleLogSpy.mockRestore();
    });
  });
});

describe('NoopLogger', () => {
  let logger: NoopLogger;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleLogSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleWarnSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleErrorSpy: any;

  beforeEach(() => {
    logger = new NoopLogger();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not log debug messages', () => {
    logger.debug('Debug message', { test: true });

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should not log info messages', () => {
    logger.info('Info message', { test: true });

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should not log warning messages', () => {
    logger.warn('Warning message', { test: true });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should not log error messages', () => {
    const error = new Error('Test error');
    logger.error('Error message', error, { test: true });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should handle all log calls without side effects', () => {
    logger.debug('Debug');
    logger.info('Info');
    logger.warn('Warn');
    logger.error('Error', new Error('Test'));

    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

describe('Global logger management', () => {
  let originalLogger: ReturnType<typeof getLogger>;

  beforeEach(() => {
    // Save the current logger
    originalLogger = getLogger();
  });

  afterEach(() => {
    // Restore the original logger
    setLogger(originalLogger);
  });

  it('should return default ConsoleLogger', () => {
    const logger = getLogger();

    expect(logger).toBeInstanceOf(ConsoleLogger);
  });

  it('should allow setting a custom logger', () => {
    const customLogger = new NoopLogger();

    setLogger(customLogger);
    const logger = getLogger();

    expect(logger).toBe(customLogger);
    expect(logger).toBeInstanceOf(NoopLogger);
  });

  it('should use the set logger globally', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Set to NoopLogger
    setLogger(new NoopLogger());
    getLogger().error('Should not log');

    expect(consoleErrorSpy).not.toHaveBeenCalled();

    // Set back to ConsoleLogger
    setLogger(new ConsoleLogger('debug'));
    getLogger().error('Should log');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleErrorSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(logOutput) as Record<string, unknown>;
    expect(parsed.message).toBe('Should log');

    consoleErrorSpy.mockRestore();
  });

  it('should maintain logger instance across multiple getLogger calls', () => {
    const customLogger = new NoopLogger();
    setLogger(customLogger);

    const logger1 = getLogger();
    const logger2 = getLogger();

    expect(logger1).toBe(logger2);
    expect(logger1).toBe(customLogger);
  });
});
