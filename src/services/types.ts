import { z } from 'zod';

// ============================================================================
// SERVICE RESPONSE TYPES
// ============================================================================

export interface ServiceResponse<T> {
  data: T | null;
  error: ServiceError | null;
  success: boolean;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function success<T>(data: T): ServiceResponse<T> {
  return {
    data,
    error: null,
    success: true,
  };
}

export function failure<T = never>(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ServiceResponse<T> {
  return {
    data: null,
    error: { code, message, details },
    success: false,
  };
}

export function validationSuccess(): ValidationResult {
  return { valid: true, errors: [] };
}

export function validationFailure(errors: ValidationError[]): ValidationResult {
  return { valid: false, errors };
}

// ============================================================================
// ERROR CODES
// ============================================================================

export const ErrorCodes = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  AUTH_EMAIL_IN_USE: 'AUTH_EMAIL_IN_USE',
  AUTH_WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_SUBSCRIPTION_EXPIRED: 'AUTH_SUBSCRIPTION_EXPIRED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',

  // Booking errors
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  BOOKING_SLOT_UNAVAILABLE: 'BOOKING_SLOT_UNAVAILABLE',
  BOOKING_PAST_DATE: 'BOOKING_PAST_DATE',
  BOOKING_OUTSIDE_HOURS: 'BOOKING_OUTSIDE_HOURS',
  BOOKING_BARBER_BLOCKED: 'BOOKING_BARBER_BLOCKED',
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  BOOKING_CANNOT_CANCEL: 'BOOKING_CANNOT_CANCEL',

  // Barber errors
  BARBER_NOT_FOUND: 'BARBER_NOT_FOUND',
  BARBER_INACTIVE: 'BARBER_INACTIVE',

  // Barbershop errors
  BARBERSHOP_NOT_FOUND: 'BARBERSHOP_NOT_FOUND',
  BARBERSHOP_UNAUTHORIZED: 'BARBERSHOP_UNAUTHORIZED',

  // User errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',

  // Generic errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const emailSchema = z.string().email('Email inválido');
export const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');
export const uuidSchema = z.string().uuid('ID inválido');
export const phoneSchema = z.string().optional();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)');
export const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Horário inválido (HH:MM)');

// ============================================================================
// ZOD TO VALIDATION RESULT
// ============================================================================

export function zodToValidationResult(result: z.SafeParseReturnType<unknown, unknown>): ValidationResult {
  if (result.success) {
    return validationSuccess();
  }

  const errors: ValidationError[] = result.error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return validationFailure(errors);
}
