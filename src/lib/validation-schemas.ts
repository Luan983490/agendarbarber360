import { z } from 'zod';

// ============================================================================
// CONSTANTES DE VALIDAÇÃO
// ============================================================================

export const VALIDATION_CONSTANTS = {
  // Comprimentos
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ADDRESS_MAX_LENGTH: 255,
  PHONE_MAX_LENGTH: 20,
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 1000,
  COMMENT_MAX_LENGTH: 500,
  REASON_MAX_LENGTH: 255,
  
  // Valores numéricos
  PRICE_MIN: 0,
  PRICE_MAX: 100000,
  DURATION_MIN: 5,
  DURATION_MAX: 480,
  STOCK_MIN: 0,
  STOCK_MAX: 999999,
  RATING_MIN: 1,
  RATING_MAX: 5,
  SESSIONS_MIN: 1,
  SESSIONS_MAX: 100,
  VALIDITY_DAYS_MIN: 1,
  VALIDITY_DAYS_MAX: 365,
} as const;

// ============================================================================
// MENSAGENS DE ERRO EM PORTUGUÊS
// ============================================================================

export const ERROR_MESSAGES = {
  required: 'Campo obrigatório',
  invalidEmail: 'Email inválido',
  invalidPhone: 'Telefone inválido',
  invalidDate: 'Data inválida (formato: YYYY-MM-DD)',
  invalidTime: 'Horário inválido (formato: HH:MM)',
  invalidUuid: 'ID inválido',
  invalidUrl: 'URL inválida',
  
  // Comprimento
  nameMin: `Nome deve ter pelo menos ${VALIDATION_CONSTANTS.NAME_MIN_LENGTH} caracteres`,
  nameMax: `Nome deve ter no máximo ${VALIDATION_CONSTANTS.NAME_MAX_LENGTH} caracteres`,
  descriptionMax: `Descrição deve ter no máximo ${VALIDATION_CONSTANTS.DESCRIPTION_MAX_LENGTH} caracteres`,
  addressMax: `Endereço deve ter no máximo ${VALIDATION_CONSTANTS.ADDRESS_MAX_LENGTH} caracteres`,
  passwordMin: `Senha deve ter pelo menos ${VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
  passwordMax: `Senha deve ter no máximo ${VALIDATION_CONSTANTS.PASSWORD_MAX_LENGTH} caracteres`,
  
  // Valores
  priceMin: 'Preço não pode ser negativo',
  priceMax: `Preço máximo é R$ ${VALIDATION_CONSTANTS.PRICE_MAX.toLocaleString('pt-BR')}`,
  ratingMin: 'Avaliação mínima é 1 estrela',
  ratingMax: 'Avaliação máxima é 5 estrelas',
  
  // Autenticação
  passwordsDoNotMatch: 'As senhas não conferem',
  invalidUserType: 'Tipo de usuário inválido',
} as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================

export const PATTERNS = {
  phone: /^[\d\s()+-]{8,20}$/,
  cep: /^\d{5}-?\d{3}$/,
  cpf: /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/,
  cnpj: /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^\d{2}:\d{2}(:\d{2})?$/,
  url: /^https?:\/\/.+/,
} as const;

// ============================================================================
// SCHEMAS BASE
// ============================================================================

// Strings
export const nameSchema = z
  .string({ required_error: ERROR_MESSAGES.required })
  .trim()
  .min(VALIDATION_CONSTANTS.NAME_MIN_LENGTH, ERROR_MESSAGES.nameMin)
  .max(VALIDATION_CONSTANTS.NAME_MAX_LENGTH, ERROR_MESSAGES.nameMax);

export const emailSchema = z
  .string({ required_error: ERROR_MESSAGES.required })
  .trim()
  .toLowerCase()
  .email(ERROR_MESSAGES.invalidEmail)
  .max(VALIDATION_CONSTANTS.EMAIL_MAX_LENGTH, `Email deve ter no máximo ${VALIDATION_CONSTANTS.EMAIL_MAX_LENGTH} caracteres`);

export const passwordSchema = z
  .string({ required_error: ERROR_MESSAGES.required })
  .min(VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH, ERROR_MESSAGES.passwordMin)
  .max(VALIDATION_CONSTANTS.PASSWORD_MAX_LENGTH, ERROR_MESSAGES.passwordMax);

export const phoneSchema = z
  .string()
  .trim()
  .max(VALIDATION_CONSTANTS.PHONE_MAX_LENGTH, `Telefone deve ter no máximo ${VALIDATION_CONSTANTS.PHONE_MAX_LENGTH} caracteres`)
  .regex(PATTERNS.phone, ERROR_MESSAGES.invalidPhone)
  .optional()
  .or(z.literal(''));

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(VALIDATION_CONSTANTS.PHONE_MAX_LENGTH, `Telefone deve ter no máximo ${VALIDATION_CONSTANTS.PHONE_MAX_LENGTH} caracteres`)
  .optional()
  .nullable()
  .transform(val => val || null);

export const descriptionSchema = z
  .string()
  .trim()
  .max(VALIDATION_CONSTANTS.DESCRIPTION_MAX_LENGTH, ERROR_MESSAGES.descriptionMax)
  .optional()
  .nullable()
  .transform(val => val || null);

export const addressSchema = z
  .string({ required_error: ERROR_MESSAGES.required })
  .trim()
  .min(1, ERROR_MESSAGES.required)
  .max(VALIDATION_CONSTANTS.ADDRESS_MAX_LENGTH, ERROR_MESSAGES.addressMax);

export const notesSchema = z
  .string()
  .trim()
  .max(VALIDATION_CONSTANTS.NOTES_MAX_LENGTH, `Observações devem ter no máximo ${VALIDATION_CONSTANTS.NOTES_MAX_LENGTH} caracteres`)
  .optional()
  .nullable()
  .transform(val => val || null);

export const urlSchema = z
  .string()
  .trim()
  .url(ERROR_MESSAGES.invalidUrl)
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform(val => val || null);

// IDs
export const uuidSchema = z
  .string({ required_error: ERROR_MESSAGES.required })
  .uuid(ERROR_MESSAGES.invalidUuid);

export const optionalUuidSchema = z
  .string()
  .uuid(ERROR_MESSAGES.invalidUuid)
  .optional()
  .nullable();

// Data e Hora
export const dateSchema = z
  .string({ required_error: ERROR_MESSAGES.required })
  .regex(PATTERNS.date, ERROR_MESSAGES.invalidDate);

export const timeSchema = z
  .string({ required_error: ERROR_MESSAGES.required })
  .regex(PATTERNS.time, ERROR_MESSAGES.invalidTime);

// Números
export const priceSchema = z
  .number({ required_error: ERROR_MESSAGES.required })
  .min(VALIDATION_CONSTANTS.PRICE_MIN, ERROR_MESSAGES.priceMin)
  .max(VALIDATION_CONSTANTS.PRICE_MAX, ERROR_MESSAGES.priceMax);

export const priceStringSchema = z
  .string({ required_error: ERROR_MESSAGES.required })
  .transform(val => parseFloat(val))
  .refine(val => !isNaN(val), { message: 'Preço inválido' })
  .refine(val => val >= VALIDATION_CONSTANTS.PRICE_MIN, { message: ERROR_MESSAGES.priceMin })
  .refine(val => val <= VALIDATION_CONSTANTS.PRICE_MAX, { message: ERROR_MESSAGES.priceMax });

export const durationSchema = z
  .number({ required_error: ERROR_MESSAGES.required })
  .int('Duração deve ser um número inteiro')
  .min(VALIDATION_CONSTANTS.DURATION_MIN, `Duração mínima é ${VALIDATION_CONSTANTS.DURATION_MIN} minutos`)
  .max(VALIDATION_CONSTANTS.DURATION_MAX, `Duração máxima é ${VALIDATION_CONSTANTS.DURATION_MAX} minutos`);

export const ratingSchema = z
  .number({ required_error: ERROR_MESSAGES.required })
  .int('Avaliação deve ser um número inteiro')
  .min(VALIDATION_CONSTANTS.RATING_MIN, ERROR_MESSAGES.ratingMin)
  .max(VALIDATION_CONSTANTS.RATING_MAX, ERROR_MESSAGES.ratingMax);

export const stockSchema = z
  .number()
  .int('Quantidade deve ser um número inteiro')
  .min(VALIDATION_CONSTANTS.STOCK_MIN, 'Estoque não pode ser negativo')
  .max(VALIDATION_CONSTANTS.STOCK_MAX, `Estoque máximo é ${VALIDATION_CONSTANTS.STOCK_MAX}`);

// ============================================================================
// SCHEMAS DE AUTENTICAÇÃO
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: ERROR_MESSAGES.required }).min(1, ERROR_MESSAGES.required),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string({ required_error: ERROR_MESSAGES.required }),
  userType: z.enum(['client', 'barbershop_owner', 'barber'], {
    errorMap: () => ({ message: ERROR_MESSAGES.invalidUserType }),
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: ERROR_MESSAGES.passwordsDoNotMatch,
  path: ['confirmPassword'],
});

export const signUpSimpleSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  userType: z.enum(['client', 'barbershop_owner', 'barber'], {
    errorMap: () => ({ message: ERROR_MESSAGES.invalidUserType }),
  }),
});

// ============================================================================
// SCHEMAS DE ENDEREÇO
// ============================================================================

export const addressObjectSchema = z.object({
  country: z.string().trim().default('Brasil'),
  postal_code: z.string().trim().max(10).optional().nullable(),
  street: z.string().trim().max(255).optional().nullable(),
  neighborhood: z.string().trim().max(100).optional().nullable(),
  number: z.string().trim().max(20).optional().nullable(),
  complement: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(50).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
}).optional().nullable();

export const cepSchema = z
  .string()
  .trim()
  .regex(PATTERNS.cep, 'CEP inválido (formato: 00000-000)')
  .optional()
  .or(z.literal(''));

// ============================================================================
// SCHEMAS DE PERFIL
// ============================================================================

export const profileUpdateSchema = z.object({
  display_name: nameSchema.optional(),
  phone: optionalPhoneSchema,
  birth_date: z.string().regex(PATTERNS.date, ERROR_MESSAGES.invalidDate).optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  address: addressObjectSchema,
});

// ============================================================================
// SCHEMAS DE BARBEARIA
// ============================================================================

export const barbershopCreateSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  address: addressSchema,
  phone: z.string({ required_error: ERROR_MESSAGES.required }).trim().min(1, ERROR_MESSAGES.required),
  email: emailSchema,
  image_url: urlSchema,
  amenities: z.array(z.string().trim().max(50)).max(20).optional().default([]),
});

export const barbershopUpdateSchema = barbershopCreateSchema.partial().extend({
  id: uuidSchema,
});

// ============================================================================
// SCHEMAS DE BARBEIRO
// ============================================================================

export const barberCreateSchema = z.object({
  name: nameSchema,
  phone: optionalPhoneSchema,
  specialty: z.string().trim().max(100).optional().nullable(),
  image_url: urlSchema,
  barbershop_id: uuidSchema,
});

export const barberUpdateSchema = barberCreateSchema.partial().omit({ barbershop_id: true }).extend({
  is_active: z.boolean().optional(),
});

export const barberLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema.optional(),
});

// ============================================================================
// SCHEMAS DE SERVIÇO
// ============================================================================

export const serviceCreateSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  price: priceSchema,
  duration: durationSchema,
  barbershop_id: uuidSchema,
  is_active: z.boolean().default(true),
});

export const serviceUpdateSchema = serviceCreateSchema.partial().omit({ barbershop_id: true });

export const serviceFormSchema = z.object({
  name: z.string({ required_error: ERROR_MESSAGES.required }).trim().min(1, ERROR_MESSAGES.required),
  description: z.string().trim().optional().default(''),
  price: z.string({ required_error: ERROR_MESSAGES.required }).min(1, 'Preço é obrigatório'),
  duration: z.string({ required_error: ERROR_MESSAGES.required }).min(1, 'Duração é obrigatória'),
});

// ============================================================================
// SCHEMAS DE PRODUTO
// ============================================================================

export const productCreateSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  price: priceSchema,
  stock_quantity: stockSchema,
  barbershop_id: uuidSchema,
  is_active: z.boolean().default(true),
});

export const productUpdateSchema = productCreateSchema.partial().omit({ barbershop_id: true });

export const productFormSchema = z.object({
  name: z.string({ required_error: ERROR_MESSAGES.required }).trim().min(1, ERROR_MESSAGES.required),
  description: z.string().trim().optional().default(''),
  price: z.string({ required_error: ERROR_MESSAGES.required }).min(1, 'Preço é obrigatório'),
  stock_quantity: z.string({ required_error: ERROR_MESSAGES.required }).min(1, 'Estoque é obrigatório'),
});

// ============================================================================
// SCHEMAS DE AGENDAMENTO
// ============================================================================

export const bookingCreateSchema = z.object({
  barbershop_id: uuidSchema,
  barber_id: optionalUuidSchema,
  service_id: uuidSchema,
  client_id: optionalUuidSchema,
  client_name: z.string().trim().max(100).optional().nullable(),
  booking_date: dateSchema,
  booking_time: timeSchema,
  total_price: priceSchema,
  notes: notesSchema,
  is_external_booking: z.boolean().default(false),
});

export const bookingCancelSchema = z.object({
  bookingId: uuidSchema,
  reason: z.string().trim().max(VALIDATION_CONSTANTS.REASON_MAX_LENGTH).optional().nullable(),
});

export const bookingUpdateStatusSchema = z.object({
  bookingId: uuidSchema,
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']),
});

export const externalBookingSchema = z.object({
  client_name: z.string({ required_error: 'Nome do cliente é obrigatório' })
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  service_id: uuidSchema,
  booking_date: dateSchema,
  booking_time: timeSchema,
});

// ============================================================================
// SCHEMAS DE AVALIAÇÃO
// ============================================================================

export const reviewCreateSchema = z.object({
  barbershop_id: uuidSchema,
  rating: ratingSchema,
  comment: z.string()
    .trim()
    .max(VALIDATION_CONSTANTS.COMMENT_MAX_LENGTH, `Comentário deve ter no máximo ${VALIDATION_CONSTANTS.COMMENT_MAX_LENGTH} caracteres`)
    .optional()
    .nullable()
    .transform(val => val || null),
});

export const reviewUpdateSchema = reviewCreateSchema.omit({ barbershop_id: true });

// ============================================================================
// SCHEMAS DE BLOQUEIO DE HORÁRIO
// ============================================================================

export const blockTimeSchema = z.object({
  barber_id: uuidSchema,
  block_date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  reason: z.string().trim().max(VALIDATION_CONSTANTS.REASON_MAX_LENGTH).optional().nullable(),
}).refine(data => data.start_time < data.end_time, {
  message: 'Horário de início deve ser anterior ao horário de fim',
  path: ['end_time'],
});

export const blockPeriodSchema = z.object({
  barber_id: uuidSchema,
  start_date: dateSchema,
  end_date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  reason: z.string().trim().max(VALIDATION_CONSTANTS.REASON_MAX_LENGTH).optional().nullable(),
}).refine(data => data.start_date <= data.end_date, {
  message: 'Data de início deve ser anterior ou igual à data de fim',
  path: ['end_date'],
}).refine(data => data.start_time < data.end_time, {
  message: 'Horário de início deve ser anterior ao horário de fim',
  path: ['end_time'],
});

// ============================================================================
// SCHEMAS DE PACOTE
// ============================================================================

export const packageCreateSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  price: priceSchema,
  sessions_included: z.number()
    .int('Número de sessões deve ser inteiro')
    .min(VALIDATION_CONSTANTS.SESSIONS_MIN, `Mínimo de ${VALIDATION_CONSTANTS.SESSIONS_MIN} sessão`)
    .max(VALIDATION_CONSTANTS.SESSIONS_MAX, `Máximo de ${VALIDATION_CONSTANTS.SESSIONS_MAX} sessões`),
  validity_days: z.number()
    .int('Validade deve ser em dias inteiros')
    .min(VALIDATION_CONSTANTS.VALIDITY_DAYS_MIN, `Mínimo de ${VALIDATION_CONSTANTS.VALIDITY_DAYS_MIN} dia`)
    .max(VALIDATION_CONSTANTS.VALIDITY_DAYS_MAX, `Máximo de ${VALIDATION_CONSTANTS.VALIDITY_DAYS_MAX} dias`),
  barbershop_id: uuidSchema,
  is_active: z.boolean().default(true),
});

export const packageFormSchema = z.object({
  name: z.string({ required_error: ERROR_MESSAGES.required }).trim().min(1, ERROR_MESSAGES.required),
  description: z.string().trim().optional().default(''),
  price: z.string({ required_error: ERROR_MESSAGES.required }).min(1, 'Preço é obrigatório'),
  sessions_included: z.string({ required_error: ERROR_MESSAGES.required }).min(1, 'Número de sessões é obrigatório'),
  validity_days: z.string({ required_error: ERROR_MESSAGES.required }).min(1, 'Validade é obrigatória'),
  is_active: z.boolean().default(true),
});

// ============================================================================
// SCHEMAS DE HORÁRIO DE TRABALHO
// ============================================================================

export const workingHourSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  period1_start: timeSchema.optional().nullable(),
  period1_end: timeSchema.optional().nullable(),
  period2_start: timeSchema.optional().nullable(),
  period2_end: timeSchema.optional().nullable(),
  is_day_off: z.boolean().default(false),
});

export const workingHoursArraySchema = z.array(workingHourSchema).length(7, 'Deve conter exatamente 7 dias');

// ============================================================================
// SCHEMAS DE CRIAÇÃO DE CLIENTE
// ============================================================================

export const clientCreateSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  display_name: nameSchema,
  phone: optionalPhoneSchema,
});

// ============================================================================
// TIPOS INFERIDOS
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type BarbershopCreateInput = z.infer<typeof barbershopCreateSchema>;
export type BarbershopUpdateInput = z.infer<typeof barbershopUpdateSchema>;
export type BarberCreateInput = z.infer<typeof barberCreateSchema>;
export type BarberUpdateInput = z.infer<typeof barberUpdateSchema>;
export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingCancelInput = z.infer<typeof bookingCancelSchema>;
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type BlockTimeInput = z.infer<typeof blockTimeSchema>;
export type PackageCreateInput = z.infer<typeof packageCreateSchema>;
export type ClientCreateInput = z.infer<typeof clientCreateSchema>;

// ============================================================================
// TIPOS PARA RESULTADO DE VALIDAÇÃO
// ============================================================================

type ValidationSuccess<T> = { success: true; data: T; errors?: never };
type ValidationFailure = { success: false; errors: { field: string; message: string }[]; data?: never };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Valida dados com um schema Zod e retorna resultado formatado
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  
  return { success: false, errors };
}

/**
 * Obtém a primeira mensagem de erro de um resultado de validação
 */
export function getFirstError(errors: { field: string; message: string }[]): string {
  return errors[0]?.message || 'Erro de validação';
}

/**
 * Formata erros para exibição em toast
 */
export function formatValidationErrors(errors: { field: string; message: string }[]): string {
  return errors.map(e => e.message).join('. ');
}

/**
 * Sanitiza string removendo caracteres perigosos
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Sanitiza objeto removendo campos não permitidos
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in obj) {
      const value = obj[field];
      if (typeof value === 'string') {
        sanitized[field] = sanitizeString(value) as T[keyof T];
      } else {
        sanitized[field] = value;
      }
    }
  }
  
  return sanitized;
}
