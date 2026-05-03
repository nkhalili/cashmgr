/**
 * Not Found Error
 * F-024: Errors for resources that don't exist
 *
 * Use this error when a requested resource (account, transaction, etc.)
 * cannot be found by its ID.
 */
import { AppError } from './app-error';

export class NotFoundError extends AppError {
  /**
   * Creates a new NotFoundError
   *
   * @param resource - The type of resource (e.g., 'Account', 'Transaction')
   * @param id - The ID that was not found
   */
  constructor(
    public readonly resource: string,
    public readonly id: string
  ) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return 'The requested item could not be found.';
  }
}
