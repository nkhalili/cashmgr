import { ErrorHandler } from '@cashmgr/core';

/**
 * Catches errors that ErrorBoundary can't: React error boundaries only
 * catch errors thrown during rendering/lifecycle methods, not errors thrown
 * from event handlers, timers, or unhandled promise rejections. Without
 * these listeners those errors vanish silently instead of reaching the log.
 */
export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    ErrorHandler.handle(event.error ?? event.message, 'window:onerror');
  });

  window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.handle(event.reason, 'window:unhandledrejection');
  });
}
