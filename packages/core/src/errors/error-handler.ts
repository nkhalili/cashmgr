/**
 * Error Handler Utility
 * F-024: Centralized error handling and logging
 *
 * Use this class to handle and log errors consistently throughout the app.
 * Converts unknown errors to AppError instances.
 */

import { AppError } from './app-error';
import { DatabaseError } from './database-error';
import { NotFoundError } from './not-found-error';
import { ValidationError } from '../validation/errors';
import { getLogger } from '../services/logger';

export class ErrorHandler {
  /**
   * Handle an unknown error and convert it to AppError
   *
   * This method:
   * 1. Classifies the error type
   * 2. Logs the error with context
   * 3. Returns an AppError instance
   *
   * @param error - The error to handle (can be any type)
   * @param context - Optional context string (e.g., 'AccountsService.createAccount')
   * @returns Classified AppError instance
   *
   * @example
   * try {
   *   await this.adapter.createAccount(data);
   * } catch (error) {
   *   throw ErrorHandler.handle(error, 'AccountsService.createAccount');
   * }
   */
  static handle(error: unknown, context?: string): AppError {
    // Already an AppError (including ValidationError) - just log and return
    if (error instanceof AppError) {
      this.log(error, context);
      return error;
    }

    // Standard Error object - wrap in DatabaseError
    if (error instanceof Error) {
      const appError = new DatabaseError(error.message, error);
      this.log(appError, context);
      return appError;
    }

    // Unknown error type - create generic DatabaseError
    const genericError = new DatabaseError('An unexpected error occurred', error);
    this.log(genericError, context);
    return genericError;
  }

  /**
   * Log an error with structured logging
   *
   * Uses the global logger instance to log errors with structured context.
   * The logger can be configured for different environments (console, file, remote service).
   *
   * @param error - The AppError to log
   * @param context - Optional context string
   */
  private static log(error: AppError, context?: string): void {
    const logger = getLogger();

    const errorContext = {
      context: context || 'unknown',
      code: error.code,
      userMessage: error.getUserMessage(),
      statusCode: error.statusCode,
    };

    logger.error(error.message, error, errorContext);
  }

  /**
   * Check if an error is a ValidationError
   *
   * @example
   * if (ErrorHandler.isValidationError(error)) {
   *   // Handle validation error
   * }
   */
  static isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
  }

  /**
   * Check if an error is a DatabaseError
   */
  static isDatabaseError(error: unknown): error is DatabaseError {
    return error instanceof DatabaseError;
  }

  /**
   * Check if an error is a NotFoundError
   */
  static isNotFoundError(error: unknown): error is NotFoundError {
    return error instanceof NotFoundError;
  }

  /**
   * Check if an error is any type of AppError
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }
}
