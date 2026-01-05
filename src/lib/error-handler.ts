/**
 * Error Handler - Tratamento centralizado de erros
 * Converte erros diversos para classes customizadas e fornece mensagens amigáveis
 */

import { createLogger } from '@/services/logger';
import {
  AppError,
  AuthError,
  BookingError,
  DatabaseError,
  ValidationError,
  BarbershopError,
  BarberError,
  RateLimitError,
  ErrorCode,
  ERROR_MESSAGES,
  isAppError,
  isRateLimitError,
} from './errors';

const logger = createLogger('ErrorHandler');

// Interface para erros do Supabase
interface SupabaseError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

// Interface para erros de serviço
interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Mapeia códigos de erro do Supabase para códigos customizados
 */
const SUPABASE_ERROR_MAP: Record<string, ErrorCode> = {
  // Erros de autenticação
  'invalid_credentials': 'AUTH_INVALID_CREDENTIALS',
  'invalid_grant': 'AUTH_INVALID_CREDENTIALS',
  'user_not_found': 'AUTH_USER_NOT_FOUND',
  'email_exists': 'AUTH_EMAIL_IN_USE',
  'weak_password': 'AUTH_WEAK_PASSWORD',
  'email_not_confirmed': 'AUTH_EMAIL_NOT_CONFIRMED',
  'over_request_rate_limit': 'AUTH_RATE_LIMITED',
  'session_not_found': 'AUTH_SESSION_EXPIRED',
  
  // Erros de banco de dados
  '23505': 'DATABASE_CONSTRAINT_VIOLATION', // unique_violation
  '23503': 'DATABASE_CONSTRAINT_VIOLATION', // foreign_key_violation
  '23502': 'VALIDATION_REQUIRED_FIELD', // not_null_violation
  '42501': 'DATABASE_RLS_VIOLATION', // insufficient_privilege
  'PGRST116': 'DATABASE_NOT_FOUND', // no rows returned
  
  // Erros de rede
  'ECONNREFUSED': 'DATABASE_CONNECTION_ERROR',
  'ETIMEDOUT': 'TIMEOUT_ERROR',
  'ENOTFOUND': 'NETWORK_ERROR',
};

/**
 * Converte erro do Supabase para classe de erro customizada
 */
export function handleSupabaseError(error: SupabaseError | unknown): AppError {
  const supabaseError = error as SupabaseError;
  const errorCode = supabaseError?.code || '';
  const errorMessage = supabaseError?.message || '';
  
  // Log do erro original
  logger.error('handleSupabaseError', 'Erro do Supabase recebido', error, {
    code: errorCode,
    message: errorMessage,
  });

  // Tenta mapear pelo código
  const mappedCode = SUPABASE_ERROR_MAP[errorCode];
  if (mappedCode) {
    return createAppErrorByCode(mappedCode, errorMessage, error);
  }

  // Tenta identificar pelo conteúdo da mensagem
  const lowerMessage = errorMessage.toLowerCase();
  
  // Erros de autenticação
  if (lowerMessage.includes('invalid login credentials')) {
    return new AuthError('AUTH_INVALID_CREDENTIALS');
  }
  if (lowerMessage.includes('email already registered') || lowerMessage.includes('already been registered')) {
    return new AuthError('AUTH_EMAIL_IN_USE');
  }
  if (lowerMessage.includes('password') && lowerMessage.includes('characters')) {
    return new AuthError('AUTH_WEAK_PASSWORD');
  }
  if (lowerMessage.includes('email not confirmed')) {
    return new AuthError('AUTH_EMAIL_NOT_CONFIRMED');
  }
  if (lowerMessage.includes('rate limit')) {
    return new AuthError('AUTH_RATE_LIMITED');
  }

  // Erros de RLS
  if (lowerMessage.includes('row-level security') || lowerMessage.includes('rls')) {
    return new DatabaseError('DATABASE_RLS_VIOLATION', undefined, error);
  }

  // Erros de constraint
  if (lowerMessage.includes('duplicate') || lowerMessage.includes('unique')) {
    return new DatabaseError('DATABASE_CONSTRAINT_VIOLATION', undefined, error);
  }

  // Erros de não encontrado
  if (lowerMessage.includes('not found') || lowerMessage.includes('no rows')) {
    return new DatabaseError('DATABASE_NOT_FOUND', undefined, error);
  }

  // Erro genérico de banco
  return new DatabaseError('DATABASE_QUERY_ERROR', errorMessage || undefined, error);
}

/**
 * Trata erros dos Services e retorna classe de erro apropriada
 */
export function handleServiceError(error: ServiceError | unknown): AppError {
  // Se já é um AppError, retorna diretamente
  if (isAppError(error)) {
    logger.debug('handleServiceError', 'Erro já é AppError', { code: error.code });
    return error;
  }

  const serviceError = error as ServiceError;
  
  // Log do erro
  logger.error('handleServiceError', 'Erro do serviço recebido', error, {
    code: serviceError?.code,
    message: serviceError?.message,
  });

  // Tenta criar AppError pelo código do serviço
  if (serviceError?.code) {
    return createAppErrorByCode(serviceError.code as ErrorCode, serviceError.message, error);
  }

  // Erro genérico
  return new DatabaseError(
    'UNKNOWN_ERROR',
    serviceError?.message || 'Erro desconhecido',
    error
  );
}

/**
 * Cria AppError apropriado baseado no código
 */
function createAppErrorByCode(code: ErrorCode, message?: string, originalError?: unknown): AppError {
  // Erros de autenticação
  if (code.startsWith('AUTH_')) {
    return new AuthError(code, message);
  }
  
  // Erros de validação
  if (code.startsWith('VALIDATION_')) {
    return new ValidationError(code, message);
  }
  
  // Erros de agendamento
  if (code.startsWith('BOOKING_')) {
    return new BookingError(code, message);
  }
  
  // Erros de barbearia
  if (code.startsWith('BARBERSHOP_')) {
    return new BarbershopError(code, message);
  }
  
  // Erros de barbeiro
  if (code.startsWith('BARBER_')) {
    return new BarberError(code, message);
  }
  
  // Erros de rate limiting
  if (code.startsWith('RATE_LIMIT_') || code === 'IP_BLOCKED') {
    return new RateLimitError(code, message);
  }
  
  // Erros de banco de dados e genéricos
  return new DatabaseError(code, message, originalError);
}

/**
 * Retorna mensagem amigável para exibir ao usuário
 * Nunca expõe detalhes técnicos
 */
export function getErrorMessage(error: unknown): string {
  // Se é um AppError, usa a mensagem mapeada
  if (isAppError(error)) {
    return ERROR_MESSAGES[error.code] || error.message;
  }

  // Se é um erro com message
  if (error instanceof Error) {
    // Verifica se é uma mensagem técnica
    const message = error.message.toLowerCase();
    
    // Mensagens técnicas que não devem ser expostas
    const technicalPatterns = [
      'pgrst',
      'postgresql',
      'supabase',
      'fetch failed',
      'network',
      'connection',
      'timeout',
      'sql',
      'query',
      'column',
      'table',
      'schema',
      'constraint',
    ];

    if (technicalPatterns.some(pattern => message.includes(pattern))) {
      return ERROR_MESSAGES.UNKNOWN_ERROR;
    }

    // Se a mensagem parece ser amigável, usa ela
    if (error.message.length < 100 && !message.includes('error:')) {
      return error.message;
    }
  }

  // Mensagem genérica
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Log estruturado de erro com contexto
 */
export function logError(
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void {
  const errorData: Record<string, unknown> = {
    ...additionalData,
  };

  if (isAppError(error)) {
    errorData.errorCode = error.code;
    errorData.errorDetails = error.details;
    errorData.timestamp = error.timestamp;
  } else if (error instanceof Error) {
    errorData.stack = error.stack;
  }

  logger.error(context, getErrorMessage(error), error, errorData);
}

/**
 * Wrapper para executar funções com tratamento de erro automático
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    const appError = handleServiceError(error);
    logError(context, appError);
    return { data: null, error: appError };
  }
}

/**
 * Verifica se o erro requer logout (sessão expirada)
 */
export function requiresLogout(error: unknown): boolean {
  if (isAppError(error)) {
    return error.code === 'AUTH_SESSION_EXPIRED' || error.code === 'AUTH_UNAUTHORIZED';
  }
  return false;
}

/**
 * Verifica se o erro é recuperável (pode tentar novamente)
 */
export function isRetryableError(error: unknown): boolean {
  if (isAppError(error)) {
    return [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'DATABASE_CONNECTION_ERROR',
      'AUTH_RATE_LIMITED',
      'RATE_LIMIT_EXCEEDED',
      'RATE_LIMIT_LOGIN',
      'RATE_LIMIT_SIGNUP',
      'RATE_LIMIT_BOOKING',
      'RATE_LIMIT_API',
    ].includes(error.code);
  }
  return false;
}

/**
 * Verifica se o erro é de rate limiting
 */
export function isRateLimitingError(error: unknown): boolean {
  return isRateLimitError(error);
}
