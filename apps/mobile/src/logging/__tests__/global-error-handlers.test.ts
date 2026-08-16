import { ErrorHandler } from '@cashmgr/core';
import { installGlobalErrorHandlers } from '../global-error-handlers';

describe('installGlobalErrorHandlers', () => {
  let previousHandler: jest.Mock;
  let currentHandler: (error: unknown, isFatal?: boolean) => void;

  beforeEach(() => {
    previousHandler = jest.fn();
    (global as unknown as { ErrorUtils: unknown }).ErrorUtils = {
      getGlobalHandler: () => previousHandler,
      setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => {
        currentHandler = handler;
      },
    };
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    jest.spyOn(ErrorHandler, 'handle').mockImplementation(() => ({}) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as unknown as { HermesInternal?: unknown }).HermesInternal;
  });

  it('replaces the global handler and forwards fatal errors to ErrorHandler', () => {
    installGlobalErrorHandlers();
    const err = new Error('fatal boom');
    currentHandler(err, true);
    expect(ErrorHandler.handle).toHaveBeenCalledWith(err, 'global:fatal');
  });

  it('labels non-fatal errors distinctly and still chains to the previous handler', () => {
    installGlobalErrorHandlers();
    const err = new Error('soft boom');
    currentHandler(err, false);
    expect(ErrorHandler.handle).toHaveBeenCalledWith(err, 'global:nonfatal');
    expect(previousHandler).toHaveBeenCalledWith(err, false);
  });

  it('registers a Hermes promise-rejection tracker in production and forwards rejections', () => {
    const enablePromiseRejectionTracker = jest.fn();
    (global as unknown as { HermesInternal: unknown }).HermesInternal = {
      enablePromiseRejectionTracker,
    };

    installGlobalErrorHandlers();

    expect(enablePromiseRejectionTracker).toHaveBeenCalledTimes(1);
    const options = enablePromiseRejectionTracker.mock.calls[0][0];
    const reason = new Error('unhandled rejection');
    options.onUnhandled(1, reason);
    expect(ErrorHandler.handle).toHaveBeenCalledWith(reason, 'global:unhandledRejection');
  });

  it('does not touch the Hermes promise tracker in dev, to preserve LogBox behavior', () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
    const enablePromiseRejectionTracker = jest.fn();
    (global as unknown as { HermesInternal: unknown }).HermesInternal = {
      enablePromiseRejectionTracker,
    };

    installGlobalErrorHandlers();

    expect(enablePromiseRejectionTracker).not.toHaveBeenCalled();
  });
});
