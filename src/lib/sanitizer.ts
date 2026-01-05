/**
 * Sanitização de Dados - Proteção contra XSS, SQL Injection e inputs maliciosos
 * Utilitário global para sanitizar todos os inputs do sistema
 */

import DOMPurify from 'dompurify';

// ============================================================================
// CONFIGURAÇÃO DO DOMPURIFY
// ============================================================================

/**
 * Configuração padrão do DOMPurify para máxima segurança
 * Remove todos os elementos que podem executar JavaScript
 */
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [] as string[], // Por padrão, não permite nenhuma tag HTML
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true, // Mantém o texto, remove apenas as tags
  ALLOW_DATA_ATTR: false,
};

/**
 * Configuração para campos que podem ter HTML básico (ex: descrições)
 */
const DOMPURIFY_BASIC_HTML_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
  ALLOW_DATA_ATTR: false,
};

// ============================================================================
// PADRÕES MALICIOSOS
// ============================================================================

/**
 * Padrões de SQL Injection para detecção
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|JOIN)\b)/gi,
  /(--)|(\/\*)|(\*\/)/g, // Comentários SQL
  /(;|\||`)/g, // Delimitadores perigosos
  /(\bOR\b|\bAND\b)\s*[\d'"]?\s*=\s*[\d'"]/gi, // OR 1=1, AND "x"="x"
  /'.*--/g, // Bypass com comentário
  /\bWAITFOR\b\s+\bDELAY\b/gi, // SQL Server timing
  /\bBENCHMARK\b/gi, // MySQL timing
];

/**
 * Padrões de XSS para detecção
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onload=, etc.
  /data:\s*text\/html/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link[^>]*href/gi,
  /<meta[^>]*http-equiv/gi,
  /expression\s*\(/gi, // CSS expression
  /url\s*\(\s*["']?\s*javascript/gi,
  /&lt;script/gi, // Encoded
  /&#60;script/gi,
  /\\u003cscript/gi,
];

/**
 * Caracteres de controle Unicode perigosos
 */
const DANGEROUS_UNICODE = [
  '\u0000', // Null
  '\u200B', // Zero-width space (pode ser usado para bypass)
  '\u200C', // Zero-width non-joiner
  '\u200D', // Zero-width joiner
  '\u2028', // Line separator
  '\u2029', // Paragraph separator
  '\uFEFF', // BOM
];

// ============================================================================
// FUNÇÕES DE SANITIZAÇÃO
// ============================================================================

/**
 * Verifica se um valor contém padrões de SQL Injection
 */
export function hasSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Verifica se um valor contém padrões de XSS
 */
export function hasXssPattern(value: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Remove caracteres Unicode perigosos
 */
export function removeDangerousUnicode(value: string): string {
  let result = value;
  for (const char of DANGEROUS_UNICODE) {
    result = result.split(char).join('');
  }
  return result;
}

/**
 * Sanitiza uma string básica - remove XSS, normaliza espaços
 */
export function sanitizeString(value: string, options: {
  trim?: boolean;
  lowercase?: boolean;
  maxLength?: number;
  allowBasicHtml?: boolean;
} = {}): string {
  const { trim = true, lowercase = false, maxLength, allowBasicHtml = false } = options;
  
  if (typeof value !== 'string') {
    return '';
  }

  let result = value;

  // Remove caracteres Unicode perigosos
  result = removeDangerousUnicode(result);

  // Sanitiza com DOMPurify
  result = DOMPurify.sanitize(result, allowBasicHtml ? DOMPURIFY_BASIC_HTML_CONFIG : DOMPURIFY_CONFIG) as string;

  // Normaliza espaços (remove múltiplos espaços consecutivos)
  result = result.replace(/\s+/g, ' ');

  // Trim
  if (trim) {
    result = result.trim();
  }

  // Lowercase
  if (lowercase) {
    result = result.toLowerCase();
  }

  // Max length
  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  return result;
}

/**
 * Sanitiza um email
 */
export function sanitizeEmail(value: string): string {
  if (typeof value !== 'string') return '';
  
  return sanitizeString(value, { 
    trim: true, 
    lowercase: true,
    maxLength: 255 
  });
}

/**
 * Sanitiza um telefone - mantém apenas números e caracteres válidos
 */
export function sanitizePhone(value: string): string {
  if (typeof value !== 'string') return '';
  
  // Remove tudo exceto números, +, -, (, ), e espaços
  return value.replace(/[^\d+\-() ]/g, '').trim().substring(0, 20);
}

/**
 * Sanitiza um número
 */
export function sanitizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : value;
  }

  if (typeof value === 'string') {
    // Remove caracteres não numéricos exceto . e -
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Sanitiza um inteiro
 */
export function sanitizeInteger(value: unknown): number | null {
  const num = sanitizeNumber(value);
  return num !== null ? Math.floor(num) : null;
}

/**
 * Sanitiza uma data no formato YYYY-MM-DD
 */
export function sanitizeDate(value: string): string | null {
  if (typeof value !== 'string') return null;
  
  const cleaned = value.trim();
  
  // Valida formato básico
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return null;
  }

  // Verifica se é uma data válida
  const date = new Date(cleaned + 'T00:00:00');
  if (isNaN(date.getTime())) {
    return null;
  }

  // Retorna no formato correto
  return cleaned;
}

/**
 * Sanitiza um horário no formato HH:MM
 */
export function sanitizeTime(value: string): string | null {
  if (typeof value !== 'string') return null;
  
  const cleaned = value.trim();
  
  // Valida formato básico
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(cleaned)) {
    return null;
  }

  const [hours, minutes] = cleaned.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Sanitiza um UUID
 */
export function sanitizeUuid(value: string): string | null {
  if (typeof value !== 'string') return null;
  
  const cleaned = value.trim().toLowerCase();
  
  // Valida formato UUID
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Sanitiza uma URL
 */
export function sanitizeUrl(value: string): string | null {
  if (typeof value !== 'string') return null;
  
  const cleaned = value.trim();
  
  // Bloqueia protocolos perigosos
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerCleaned = cleaned.toLowerCase();
  
  for (const protocol of dangerousProtocols) {
    if (lowerCleaned.startsWith(protocol)) {
      return null;
    }
  }

  // Valida URL básica
  try {
    new URL(cleaned);
    return cleaned;
  } catch {
    // Se não é URL absoluta, verifica se é relativa válida
    if (cleaned.startsWith('/') && !cleaned.includes('//')) {
      return cleaned;
    }
    return null;
  }
}

// ============================================================================
// SANITIZAÇÃO DE OBJETOS
// ============================================================================

/**
 * Opções de sanitização para objetos
 */
interface SanitizeObjectOptions {
  /** Campos que devem ser sanitizados como email */
  emailFields?: string[];
  /** Campos que devem ser sanitizados como telefone */
  phoneFields?: string[];
  /** Campos que devem ser sanitizados como número */
  numberFields?: string[];
  /** Campos que devem ser sanitizados como inteiro */
  integerFields?: string[];
  /** Campos que devem ser convertidos para lowercase */
  lowercaseFields?: string[];
  /** Campos que podem conter HTML básico */
  htmlFields?: string[];
  /** Campos que devem ser sanitizados como UUID */
  uuidFields?: string[];
  /** Campos que devem ser sanitizados como data */
  dateFields?: string[];
  /** Campos que devem ser sanitizados como horário */
  timeFields?: string[];
  /** Limite máximo de caracteres por campo string */
  maxLength?: number;
}

/**
 * Sanitiza um objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizeObjectOptions = {}
): T {
  const {
    emailFields = [],
    phoneFields = [],
    numberFields = [],
    integerFields = [],
    lowercaseFields = [],
    htmlFields = [],
    uuidFields = [],
    dateFields = [],
    timeFields = [],
    maxLength = 10000,
  } = options;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Null/undefined permanecem
    if (value === null || value === undefined) {
      result[key] = value;
      continue;
    }

    // Arrays
    if (Array.isArray(value)) {
      result[key] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return sanitizeObject(item as Record<string, unknown>, options);
        }
        if (typeof item === 'string') {
          return sanitizeString(item, { maxLength });
        }
        return item;
      });
      continue;
    }

    // Objetos aninhados
    if (typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, unknown>, options);
      continue;
    }

    // Campos específicos por tipo
    if (emailFields.includes(key) && typeof value === 'string') {
      result[key] = sanitizeEmail(value);
      continue;
    }

    if (phoneFields.includes(key) && typeof value === 'string') {
      result[key] = sanitizePhone(value);
      continue;
    }

    if (numberFields.includes(key)) {
      result[key] = sanitizeNumber(value);
      continue;
    }

    if (integerFields.includes(key)) {
      result[key] = sanitizeInteger(value);
      continue;
    }

    if (uuidFields.includes(key) && typeof value === 'string') {
      result[key] = sanitizeUuid(value) || value; // Mantém original se inválido (para zod validar)
      continue;
    }

    if (dateFields.includes(key) && typeof value === 'string') {
      result[key] = sanitizeDate(value) || value;
      continue;
    }

    if (timeFields.includes(key) && typeof value === 'string') {
      result[key] = sanitizeTime(value) || value;
      continue;
    }

    // Strings gerais
    if (typeof value === 'string') {
      result[key] = sanitizeString(value, {
        lowercase: lowercaseFields.includes(key),
        allowBasicHtml: htmlFields.includes(key),
        maxLength,
      });
      continue;
    }

    // Outros tipos (boolean, number já validados)
    result[key] = value;
  }

  return result as T;
}

// ============================================================================
// INTEGRAÇÃO COM ZOD
// ============================================================================

import { z } from 'zod';

/**
 * Cria um schema Zod com sanitização automática de string
 */
export function sanitizedString(options: {
  minLength?: number;
  maxLength?: number;
  lowercase?: boolean;
  trim?: boolean;
  message?: string;
} = {}) {
  const { minLength, maxLength = 10000, lowercase = false, trim = true, message } = options;

  let schema = z.string();

  // Combina transformações em uma única
  const transformedSchema = schema.transform(v => {
    let result = v;
    if (trim) {
      result = result.trim();
    }
    return sanitizeString(result, { lowercase, maxLength });
  });

  if (minLength !== undefined) {
    return transformedSchema.refine(v => v.length >= minLength, {
      message: message || `Deve ter pelo menos ${minLength} caracteres`,
    });
  }

  return transformedSchema;
}

/**
 * Schema para email sanitizado
 */
export const sanitizedEmail = z.string()
  .transform(v => sanitizeEmail(v))
  .refine(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: 'E-mail inválido',
  });

/**
 * Schema para telefone sanitizado
 */
export const sanitizedPhone = z.string()
  .transform(v => sanitizePhone(v))
  .refine(v => v.length >= 10, {
    message: 'Telefone deve ter pelo menos 10 dígitos',
  });

/**
 * Schema para UUID sanitizado
 */
export const sanitizedUuid = z.string()
  .transform(v => sanitizeUuid(v))
  .refine((v): v is string => v !== null, {
    message: 'UUID inválido',
  });

/**
 * Schema para data sanitizada
 */
export const sanitizedDate = z.string()
  .transform(v => sanitizeDate(v))
  .refine((v): v is string => v !== null, {
    message: 'Data inválida (formato: YYYY-MM-DD)',
  });

/**
 * Schema para horário sanitizado
 */
export const sanitizedTime = z.string()
  .transform(v => sanitizeTime(v))
  .refine((v): v is string => v !== null, {
    message: 'Horário inválido (formato: HH:MM)',
  });

/**
 * Schema para URL sanitizada
 */
export const sanitizedUrl = z.string()
  .transform(v => sanitizeUrl(v))
  .refine((v): v is string => v !== null, {
    message: 'URL inválida ou não permitida',
  });

// ============================================================================
// VERIFICAÇÃO DE SEGURANÇA
// ============================================================================

/**
 * Resultado da verificação de segurança
 */
interface SecurityCheckResult {
  safe: boolean;
  threats: string[];
  sanitizedValue: string;
}

/**
 * Verifica e sanitiza um valor com relatório de ameaças
 */
export function securityCheck(value: string): SecurityCheckResult {
  const threats: string[] = [];

  if (hasSqlInjection(value)) {
    threats.push('SQL_INJECTION');
  }

  if (hasXssPattern(value)) {
    threats.push('XSS');
  }

  if (DANGEROUS_UNICODE.some(char => value.includes(char))) {
    threats.push('DANGEROUS_UNICODE');
  }

  const sanitizedValue = sanitizeString(value);

  return {
    safe: threats.length === 0,
    threats,
    sanitizedValue,
  };
}

/**
 * Sanitiza dados de formulário para uso seguro
 */
export function sanitizeFormData<T extends Record<string, unknown>>(
  data: T,
  fieldConfig?: SanitizeObjectOptions
): T {
  return sanitizeObject(data, {
    emailFields: ['email', 'userEmail', 'clientEmail'],
    phoneFields: ['phone', 'telephone', 'celular', 'telefone'],
    uuidFields: ['id', 'userId', 'barberId', 'barbershopId', 'serviceId', 'clientId', 'bookingId'],
    dateFields: ['date', 'bookingDate', 'birthDate', 'startDate', 'endDate'],
    timeFields: ['time', 'bookingTime', 'startTime', 'endTime'],
    lowercaseFields: ['email', 'userEmail'],
    ...fieldConfig,
  });
}

// ============================================================================
// EXPORTS PARA EDGE FUNCTIONS (formato compatível com Deno)
// ============================================================================

/**
 * Versão simplificada para Edge Functions (sem DOMPurify)
 * Para uso em supabase/functions
 */
export function sanitizeForEdge(value: string): string {
  if (typeof value !== 'string') return '';
  
  let result = value;
  
  // Remove caracteres perigosos
  result = removeDangerousUnicode(result);
  
  // Escape HTML básico
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  // Normaliza espaços
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}
