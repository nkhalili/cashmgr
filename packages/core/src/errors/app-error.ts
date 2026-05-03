/**
 * Base Application Error
 * F-024: Abstract base class for all application errors
 *
 * All custom errors should extend this class to ensure consistent
 * error handling and user messaging throughout the application.
 */
export abstract class AppError extends Error {
  /**
   * Creates a new AppError
   *
   * @param message - Technical error message for logging
   * @param code - Error code for classification (e.g., 'DATABASE_ERROR')
   * @param statusCode - HTTP-style status code (400, 404, 500, etc.)
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;

    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Get user-friendly error message
   *
   * This method must be implemented by all subclasses to provide
   * a user-friendly message that can be safely shown to end users.
   *
   * @returns User-friendly error message
   */
  abstract getUserMessage(): string;
}
