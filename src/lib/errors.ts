/**
 * Sistema de erros customizados
 * Classes de erro padronizadas com códigos e mensagens em português
 */

// Tipos de erro base
export type ErrorCode = 
  // Erros de autenticação
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_USER_NOT_FOUND'
  | 'AUTH_EMAIL_IN_USE'
  | 'AUTH_WEAK_PASSWORD'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_UNAUTHORIZED'
  | 'AUTH_EMAIL_NOT_CONFIRMED'
  | 'AUTH_RATE_LIMITED'
  // Erros de validação
  | 'VALIDATION_REQUIRED_FIELD'
  | 'VALIDATION_INVALID_FORMAT'
  | 'VALIDATION_INVALID_EMAIL'
  | 'VALIDATION_INVALID_PHONE'
  | 'VALIDATION_INVALID_DATE'
  | 'VALIDATION_INVALID_TIME'
  | 'VALIDATION_MIN_LENGTH'
  | 'VALIDATION_MAX_LENGTH'
  // Erros de agendamento
  | 'BOOKING_CONFLICT'
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_ALREADY_CANCELLED'
  | 'BOOKING_CANNOT_CANCEL'
  | 'BOOKING_BARBER_BLOCKED'
  | 'BOOKING_OUTSIDE_HOURS'
  | 'BOOKING_PAST_DATE'
  | 'BOOKING_INVALID_SERVICE'
  // Erros de barbearia
  | 'BARBERSHOP_NOT_FOUND'
  | 'BARBERSHOP_SUBSCRIPTION_EXPIRED'
  | 'BARBERSHOP_NO_PERMISSION'
  // Erros de barbeiro
  | 'BARBER_NOT_FOUND'
  | 'BARBER_INACTIVE'
  | 'BARBER_NO_SERVICES'
  // Erros de banco de dados
  | 'DATABASE_CONNECTION_ERROR'
  | 'DATABASE_QUERY_ERROR'
  | 'DATABASE_CONSTRAINT_VIOLATION'
  | 'DATABASE_RLS_VIOLATION'
  | 'DATABASE_NOT_FOUND'
  // Erros genéricos
  | 'UNKNOWN_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR';

// Mapeamento de códigos para mensagens em português
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Autenticação
  AUTH_INVALID_CREDENTIALS: 'E-mail ou senha incorretos',
  AUTH_USER_NOT_FOUND: 'Usuário não encontrado',
  AUTH_EMAIL_IN_USE: 'Este e-mail já está em uso',
  AUTH_WEAK_PASSWORD: 'A senha deve ter pelo menos 6 caracteres',
  AUTH_SESSION_EXPIRED: 'Sua sessão expirou. Faça login novamente',
  AUTH_UNAUTHORIZED: 'Você não tem permissão para realizar esta ação',
  AUTH_EMAIL_NOT_CONFIRMED: 'Confirme seu e-mail antes de fazer login',
  AUTH_RATE_LIMITED: 'Muitas tentativas. Aguarde alguns minutos',
  
  // Validação
  VALIDATION_REQUIRED_FIELD: 'Este campo é obrigatório',
  VALIDATION_INVALID_FORMAT: 'Formato inválido',
  VALIDATION_INVALID_EMAIL: 'E-mail inválido',
  VALIDATION_INVALID_PHONE: 'Telefone inválido',
  VALIDATION_INVALID_DATE: 'Data inválida',
  VALIDATION_INVALID_TIME: 'Horário inválido',
  VALIDATION_MIN_LENGTH: 'Valor muito curto',
  VALIDATION_MAX_LENGTH: 'Valor muito longo',
  
  // Agendamento
  BOOKING_CONFLICT: 'Este horário já está ocupado',
  BOOKING_NOT_FOUND: 'Agendamento não encontrado',
  BOOKING_ALREADY_CANCELLED: 'Este agendamento já foi cancelado',
  BOOKING_CANNOT_CANCEL: 'Não é possível cancelar este agendamento',
  BOOKING_BARBER_BLOCKED: 'O barbeiro não está disponível neste horário',
  BOOKING_OUTSIDE_HOURS: 'Horário fora do expediente',
  BOOKING_PAST_DATE: 'Não é possível agendar em datas passadas',
  BOOKING_INVALID_SERVICE: 'Serviço não disponível',
  
  // Barbearia
  BARBERSHOP_NOT_FOUND: 'Barbearia não encontrada',
  BARBERSHOP_SUBSCRIPTION_EXPIRED: 'A assinatura da barbearia expirou',
  BARBERSHOP_NO_PERMISSION: 'Você não tem permissão para acessar esta barbearia',
  
  // Barbeiro
  BARBER_NOT_FOUND: 'Barbeiro não encontrado',
  BARBER_INACTIVE: 'Este barbeiro não está ativo',
  BARBER_NO_SERVICES: 'Este barbeiro não oferece serviços',
  
  // Banco de dados
  DATABASE_CONNECTION_ERROR: 'Erro de conexão com o servidor',
  DATABASE_QUERY_ERROR: 'Erro ao processar sua solicitação',
  DATABASE_CONSTRAINT_VIOLATION: 'Dados inválidos ou duplicados',
  DATABASE_RLS_VIOLATION: 'Você não tem permissão para acessar estes dados',
  DATABASE_NOT_FOUND: 'Registro não encontrado',
  
  // Genéricos
  UNKNOWN_ERROR: 'Ocorreu um erro inesperado. Tente novamente',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet',
  TIMEOUT_ERROR: 'A operação demorou muito. Tente novamente',
};

// Classe base de erro customizado
export abstract class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly timestamp: Date;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message || ERROR_MESSAGES[code]);
    this.code = code;
    this.timestamp = new Date();
    this.details = details;
    this.name = this.constructor.name;
    
    // Mantém o stack trace correto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
    };
  }
}

// Erro de validação
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(
    code: ErrorCode = 'VALIDATION_INVALID_FORMAT',
    message?: string,
    field?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, { ...details, field });
    this.field = field;
  }

  static requiredField(field: string): ValidationError {
    return new ValidationError(
      'VALIDATION_REQUIRED_FIELD',
      `O campo ${field} é obrigatório`,
      field
    );
  }

  static invalidEmail(): ValidationError {
    return new ValidationError('VALIDATION_INVALID_EMAIL', undefined, 'email');
  }

  static invalidPhone(): ValidationError {
    return new ValidationError('VALIDATION_INVALID_PHONE', undefined, 'phone');
  }
}

// Erro de autenticação
export class AuthError extends AppError {
  constructor(
    code: ErrorCode = 'AUTH_UNAUTHORIZED',
    message?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, details);
  }

  static invalidCredentials(): AuthError {
    return new AuthError('AUTH_INVALID_CREDENTIALS');
  }

  static sessionExpired(): AuthError {
    return new AuthError('AUTH_SESSION_EXPIRED');
  }

  static unauthorized(): AuthError {
    return new AuthError('AUTH_UNAUTHORIZED');
  }

  static emailInUse(): AuthError {
    return new AuthError('AUTH_EMAIL_IN_USE');
  }
}

// Erro de agendamento
export class BookingError extends AppError {
  public readonly bookingId?: string;

  constructor(
    code: ErrorCode = 'BOOKING_NOT_FOUND',
    message?: string,
    bookingId?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, { ...details, bookingId });
    this.bookingId = bookingId;
  }

  static conflict(): BookingError {
    return new BookingError('BOOKING_CONFLICT');
  }

  static notFound(bookingId?: string): BookingError {
    return new BookingError('BOOKING_NOT_FOUND', undefined, bookingId);
  }

  static alreadyCancelled(bookingId?: string): BookingError {
    return new BookingError('BOOKING_ALREADY_CANCELLED', undefined, bookingId);
  }

  static barberBlocked(): BookingError {
    return new BookingError('BOOKING_BARBER_BLOCKED');
  }
}

// Erro de banco de dados
export class DatabaseError extends AppError {
  public readonly originalError?: unknown;

  constructor(
    code: ErrorCode = 'DATABASE_QUERY_ERROR',
    message?: string,
    originalError?: unknown,
    details?: Record<string, unknown>
  ) {
    super(code, message, details);
    this.originalError = originalError;
  }

  static connectionError(originalError?: unknown): DatabaseError {
    return new DatabaseError('DATABASE_CONNECTION_ERROR', undefined, originalError);
  }

  static queryError(originalError?: unknown): DatabaseError {
    return new DatabaseError('DATABASE_QUERY_ERROR', undefined, originalError);
  }

  static notFound(): DatabaseError {
    return new DatabaseError('DATABASE_NOT_FOUND');
  }

  static rlsViolation(): DatabaseError {
    return new DatabaseError('DATABASE_RLS_VIOLATION');
  }
}

// Erro de barbearia
export class BarbershopError extends AppError {
  public readonly barbershopId?: string;

  constructor(
    code: ErrorCode = 'BARBERSHOP_NOT_FOUND',
    message?: string,
    barbershopId?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, { ...details, barbershopId });
    this.barbershopId = barbershopId;
  }

  static notFound(barbershopId?: string): BarbershopError {
    return new BarbershopError('BARBERSHOP_NOT_FOUND', undefined, barbershopId);
  }

  static subscriptionExpired(barbershopId?: string): BarbershopError {
    return new BarbershopError('BARBERSHOP_SUBSCRIPTION_EXPIRED', undefined, barbershopId);
  }

  static noPermission(): BarbershopError {
    return new BarbershopError('BARBERSHOP_NO_PERMISSION');
  }
}

// Erro de barbeiro
export class BarberError extends AppError {
  public readonly barberId?: string;

  constructor(
    code: ErrorCode = 'BARBER_NOT_FOUND',
    message?: string,
    barberId?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, { ...details, barberId });
    this.barberId = barberId;
  }

  static notFound(barberId?: string): BarberError {
    return new BarberError('BARBER_NOT_FOUND', undefined, barberId);
  }

  static inactive(barberId?: string): BarberError {
    return new BarberError('BARBER_INACTIVE', undefined, barberId);
  }
}

// Type guard para verificar se é um AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Type guard para tipos específicos de erro
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isBookingError(error: unknown): error is BookingError {
  return error instanceof BookingError;
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}
