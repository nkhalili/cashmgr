/**
 * Error Handling Module
 * F-024: Centralized error handling
 *
 * Export all error classes and utilities
 */

export { AppError } from './app-error';
export { DatabaseError } from './database-error';
export { NotFoundError } from './not-found-error';
export { ErrorHandler } from './error-handler';

// Re-export ValidationError from validation module for convenience
export { ValidationError } from '../validation/errors';
