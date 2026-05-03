/**
 * Validation Errors
 * F-023: Custom error classes for validation failures
 * F-024: Updated to extend AppError base class
 */

import { AppError } from '../errors/app-error';

/**
 * ValidationError - Thrown when input validation fails
 *
 * This error provides structured information about validation failures
 * including the field that failed, a user-friendly message, and an error code.
 *
 * @example
 * throw new ValidationError('email', 'Email must be valid');
 */
export class ValidationError extends AppError {
  /**
   * Creates a new ValidationError
   *
   * @param field - The field that failed validation
   * @param message - User-friendly error message
   */
  constructor(
    public readonly field: string,
    message: string
  ) {
    super(message, 'VALIDATION_ERROR', 400);
  }

  /**
   * Get a user-friendly error message
   * For ValidationError, the message is already user-friendly
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Convert Zod errors to ValidationError
   */
  static fromZodError(error: unknown): ValidationError {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const issues = (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
      if (issues.length > 0) {
        const first = issues[0];
        const field = first.path.join('.');
        return new ValidationError(field, first.message);
      }
    }

    return new ValidationError('unknown', 'Validation failed');
  }
}
