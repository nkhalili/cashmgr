import { ErrorHandler } from '@cashmgr/core';

interface HermesInternalGlobal {
  enablePromiseRejectionTracker?: (options: {
    allRejections: boolean;
    onUnhandled: (id: number, rejection: unknown) => void;
    onHandled: (id: number) => void;
  }) => void;
}

/**
 * Catches errors that ErrorBoundary can't: React error boundaries only
 * catch errors thrown during rendering/lifecycle methods, not errors thrown
 * from event handlers, timers, or unhandled promise rejections. Without
 * this, those errors vanish silently instead of reaching the log.
 */
export function installGlobalErrorHandlers(): void {
  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    ErrorHandler.handle(error, isFatal ? 'global:fatal' : 'global:nonfatal');
    previousHandler(error, isFatal);
  });

  // React Native only wires up Hermes's promise-rejection tracker in __DEV__
  // (surfaced via LogBox); production builds have no tracker at all, so an
  // un-awaited rejected promise otherwise disappears with nothing logged.
  // Leave dev's LogBox behavior untouched.
  if (!__DEV__) {
    (global as unknown as { HermesInternal?: HermesInternalGlobal }).HermesInternal
      ?.enablePromiseRejectionTracker?.({
        allRejections: true,
        onUnhandled: (_id, rejection) => {
          ErrorHandler.handle(rejection, 'global:unhandledRejection');
        },
        onHandled: () => {},
      });
  }
}
