/**
 * Form Validation Hook
 * F-026: Client-side form validation using Zod schemas
 *
 * Provides field-level and form-level validation with error tracking.
 */
import { useState, useCallback } from 'react';
import type { ZodSchema } from 'zod';

/**
 * Custom hook for form validation using Zod schemas
 *
 * @param schema - Zod schema for the form
 * @returns Validation utilities
 *
 * @example
 * const { errors, validateField, validateAll, isValid } = useFormValidation(CreateAccountInputSchema);
 *
 * // IMPORTANT: validateField requires ALL form values, not just the field being validated
 * // This ensures the complete form is validated while only updating errors for the specific field
 * <Input
 *   value={name}
 *   onChange={setName}
 *   onBlur={() => {
 *     const formValues = {
 *       name: name.trim(),
 *       type: accountType,
 *       initialBalance: initialBalance ? Number(initialBalance) : 0,
 *       currency: DEFAULT_CURRENCY,
 *     };
 *     validateField('name', formValues); // Pass ALL form values
 *   }}
 *   error={errors.name}
 * />
 */
export function useFormValidation<T extends Record<string, unknown>>(
  schema: ZodSchema<T>
) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  /**
   * Validate a single field
   * Call this on blur to show validation errors
   *
   * IMPORTANT: This function requires ALL form values, not just the field being validated.
   * This is necessary because Zod validates the complete schema. If you pass partial data,
   * validation will always fail for required fields that aren't included.
   *
   * @param name - Field name to validate
   * @param allValues - Complete form data object (all fields, not just the one being validated)
   */
  const validateField = useCallback(
    (name: keyof T, allValues: T) => {
      // Validate complete form data
      const result = schema.safeParse(allValues);

      if (result.success) {
        // Clear error for this field if valid
        setErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      } else {
        // Find error for this specific field
        const fieldError = result.error.issues.find((e) => e.path[0] === name);
        if (fieldError) {
          setErrors((prev) => ({
            ...prev,
            [name]: fieldError.message,
          }));
        } else {
          // No error for this field - clear it
          setErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
          });
        }
      }
    },
    [schema]
  );

  /**
   * Validate all form fields
   * Call this before form submission
   *
   * @returns true if valid, false if errors
   */
  const validateAll = useCallback(
    (values: T): boolean => {
      const result = schema.safeParse(values);

      if (result.success) {
        setErrors({});
        return true;
      } else {
        const newErrors: Partial<Record<keyof T, string>> = {};
        result.error.issues.forEach((error) => {
          const field = error.path[0] as keyof T;
          if (field && !newErrors[field]) {
            newErrors[field] = error.message;
          }
        });
        setErrors(newErrors);
        return false;
      }
    },
    [schema]
  );

  /**
   * Clear all validation errors
   */
  const clearErrors = useCallback(() => setErrors({}), []);

  /**
   * Check if form is valid (no errors)
   */
  const isValid = Object.keys(errors).length === 0;

  return { errors, validateField, validateAll, clearErrors, isValid };
}
