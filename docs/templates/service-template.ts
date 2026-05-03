/**
 * Service Template
 *
 * Use this as a reference when creating new services.
 * Services MUST depend on DatabaseAdapter, not concrete repositories.
 *
 * References:
 * - F-021 (Service Layer Architecture)
 * - F-023 (Input Validation)
 */

import type { DatabaseAdapter } from '@cashmgr/core';
import { ErrorHandler, ValidationError } from '@cashmgr/core';
// Import your domain types and schemas from @cashmgr/core
// import type { YourModel, CreateYourModelInput } from '@cashmgr/core';
// import { CreateYourModelInputSchema } from '@cashmgr/core';

/**
 * Service class for [describe what this service does]
 *
 * Example: TransactionsService handles all transaction-related business logic
 *
 * Architecture patterns:
 * - F-021: Uses DatabaseAdapter for platform-agnostic data access
 * - F-023: Validates all inputs before calling adapter
 * - F-024: Uses ErrorHandler for centralized error handling
 */
export class YourService {
  /**
   * Constructor accepts DatabaseAdapter interface
   *
   * @param adapter - Platform-agnostic database adapter
   */
  constructor(private readonly adapter: DatabaseAdapter) {}

  /**
   * List all items
   *
   * Use the adapter's interface methods, not repository methods
   * F-024: Wrap adapter calls with ErrorHandler
   */
  async listItems(): Promise<YourModel[]> {
    try {
      return await this.adapter.getYourModels();
    } catch (error) {
      throw ErrorHandler.handle(error, 'YourService.listItems');
    }
  }

  /**
   * Get single item by ID
   *
   * F-024: Wrap adapter calls with ErrorHandler
   */
  async getItemById(id: string): Promise<YourModel | null> {
    try {
      return await this.adapter.getYourModelById(id);
    } catch (error) {
      throw ErrorHandler.handle(error, 'YourService.getItemById');
    }
  }

  /**
   * Create new item
   *
   * F-023: Always validate inputs before calling adapter
   * F-024: Use ErrorHandler for centralized error handling
   */
  async createItem(input: CreateYourModelInput): Promise<YourModel> {
    try {
      // F-023: Step 1 - Validate input schema
      const validated = CreateYourModelInputSchema.parse(input);

      // F-023: Step 2 - Business logic validation (if needed)
      // Example: Check business rules that depend on other data
      // if (validated.amount < 0 && validated.type !== 'refund') {
      //   throw new ValidationError('amount', 'Only refunds can have negative amounts');
      // }

      // Step 3 - Call adapter with validated data
      return await this.adapter.createYourModel(validated);
    } catch (error) {
      // F-023: Convert Zod errors to ValidationError
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      // F-024: Use ErrorHandler for all other errors
      throw ErrorHandler.handle(error, 'YourService.createItem');
    }
  }

  /**
   * Complex business logic example
   *
   * Services can contain business logic that combines multiple adapter calls
   * F-024: Wrap all adapter calls with ErrorHandler
   */
  async complexOperation(params: SomeParams): Promise<Result> {
    try {
      // 1. Validate business rules
      // 2. Call adapter methods
      // 3. Process results
      // 4. Return to caller

      const items = await this.adapter.getYourModels();
      // ... business logic ...
      return result;
    } catch (error) {
      throw ErrorHandler.handle(error, 'YourService.complexOperation');
    }
  }
}

/**
 * HOW TO USE IN ServicesContext:
 *
 * const adapter = new SqliteDatabaseAdapter(dbInstance);
 * await adapter.initialize();
 *
 * const yourService = new YourService(adapter);
 */

/**
 * VALIDATION BEST PRACTICES:
 *
 * 1. Always validate at service boundary, not in UI or database
 * 2. Use Zod schemas for type and format validation
 * 3. Add business logic validation after schema validation
 * 4. Provide clear, user-friendly error messages
 * 5. Convert Zod errors to ValidationError for consistency
 *
 * Example validation schema (in packages/core/src/validation/schemas.ts):
 *
 * export const CreateYourModelInputSchema = z.object({
 *   name: z.string().min(1, 'Name is required').max(100),
 *   amount: z.number().positive('Amount must be positive'),
 *   type: z.enum(['type1', 'type2'], {
 *     errorMap: () => ({ message: 'Type must be type1 or type2' }),
 *   }),
 * }).strict();
 */
