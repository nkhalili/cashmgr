import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorHandler } from '@cashmgr/core';
import { installGlobalErrorHandlers } from '../global-error-handlers';

describe('installGlobalErrorHandlers', () => {
  let listeners: Record<string, (event: unknown) => void>;

  beforeEach(() => {
    listeners = {};
    vi.stubGlobal('window', {
      addEventListener: (type: string, listener: (event: unknown) => void) => {
        listeners[type] = listener;
      },
    });
    vi.spyOn(ErrorHandler, 'handle').mockImplementation(() => ({}) as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('registers listeners for both error and unhandledrejection', () => {
    installGlobalErrorHandlers();
    expect(listeners.error).toBeInstanceOf(Function);
    expect(listeners.unhandledrejection).toBeInstanceOf(Function);
  });

  it('forwards window error events to ErrorHandler with the underlying Error', () => {
    installGlobalErrorHandlers();
    const err = new Error('boom');
    listeners.error({ error: err, message: 'boom' });
    expect(ErrorHandler.handle).toHaveBeenCalledWith(err, 'window:onerror');
  });

  it('falls back to the message when no Error object is present (e.g. cross-origin script errors)', () => {
    installGlobalErrorHandlers();
    listeners.error({ error: undefined, message: 'Script error.' });
    expect(ErrorHandler.handle).toHaveBeenCalledWith('Script error.', 'window:onerror');
  });

  it('forwards unhandled promise rejections to ErrorHandler', () => {
    installGlobalErrorHandlers();
    const reason = new Error('rejected');
    listeners.unhandledrejection({ reason });
    expect(ErrorHandler.handle).toHaveBeenCalledWith(reason, 'window:unhandledrejection');
  });
});
