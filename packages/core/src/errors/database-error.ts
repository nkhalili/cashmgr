/**
 * Database Error
 * F-024: Errors related to database operations
 *
 * Use this error for any database or storage-related failures.
 * Includes the original error for debugging purposes.
 */
import { AppError } from './app-error';

export class DatabaseError extends AppError {
  /**
   * Creates a new DatabaseError
   *
   * @param message - Technical error message
   * @param originalError - The original error that was caught (optional)
   */
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message, 'DATABASE_ERROR', 500);
  }

  /**
   * Get user-friendly error message
   *
   * Never expose technical database details to users.
   */
  getUserMessage(): string {
    return 'Unable to access local storage. Please try again.';
  }
}
