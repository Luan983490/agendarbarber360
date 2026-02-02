import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import {
  ServiceResponse,
  ValidationResult,
  ErrorCodes,
  success,
  failure,
  zodToValidationResult,
  emailSchema,
  passwordSchema,
} from './types';
import { createLogger } from './logger';
import { rateLimiterService } from './rate-limiter.service';
import { isRateLimitError } from '@/lib/errors';
import { sanitizeEmail, sanitizeString } from '@/lib/sanitizer';

// ============================================================================
// TYPES
// ============================================================================

export interface SignUpDTO {
  email: string;
  password: string;
  userType: 'client' | 'barbershop_owner' | 'barber';
}

export interface SignInDTO {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  userType?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  userType: z.enum(['client', 'barbershop_owner', 'barber']),
});

const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// ============================================================================
// AUTH SERVICE
// ============================================================================

const logger = createLogger('AuthService');

export class AuthService {
  /**
   * Validates sign up data
   */
  validateSignUp(data: SignUpDTO): ValidationResult {
    const result = signUpSchema.safeParse(data);
    return zodToValidationResult(result);
  }

  /**
   * Validates sign in data
   */
  validateSignIn(data: SignInDTO): ValidationResult {
    const result = signInSchema.safeParse(data);
    return zodToValidationResult(result);
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpDTO): Promise<ServiceResponse<AuthUser>> {
    // Sanitizar dados de entrada
    const sanitizedData = {
      ...data,
      email: sanitizeEmail(data.email),
    };

    const timer = logger.startTimer();
    logger.info('signUp', 'Starting user registration', { email: sanitizedData.email, userType: sanitizedData.userType });

    // Rate limit check
    try {
      await rateLimiterService.checkRateLimit('signup');
    } catch (error) {
      if (isRateLimitError(error)) {
        return failure(
          'RATE_LIMIT_SIGNUP',
          'Muitos cadastros do mesmo IP. Aguarde 1 hora para tentar novamente.'
        );
      }
    }

    // Validate input
    const validation = this.validateSignUp(sanitizedData);
    if (!validation.valid) {
      logger.warn('signUp', 'Validation failed', { errors: validation.errors });
      return failure(
        ErrorCodes.VALIDATION_ERROR,
        'Dados inválidos',
        { errors: validation.errors }
      );
    }

    try {
      // Use dedicated callback route for email confirmation
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { data: authData, error } = await supabase.auth.signUp({
        email: sanitizedData.email,
        password: sanitizedData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            user_type: sanitizedData.userType,
            full_name: '',
          },
        },
      });

      if (error) {
        logger.error('signUp', 'Supabase auth error', error);

        if (error.message.includes('already registered') || 
            error.message.includes('User already registered')) {
          return failure(ErrorCodes.AUTH_EMAIL_IN_USE, 'Este email já está cadastrado. Faça login ou recupere sua senha.');
        }
        if (error.message.includes('weak password')) {
          return failure(ErrorCodes.AUTH_WEAK_PASSWORD, 'Senha muito fraca');
        }

        return failure(ErrorCodes.DATABASE_ERROR, error.message);
      }

      if (!authData.user) {
        return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao criar usuário');
      }

      // CRITICAL: Check if user already exists
      // Supabase returns a user with empty identities array if email already exists
      // This happens when the email is already registered (confirmed or not)
      if (authData.user.identities && authData.user.identities.length === 0) {
        logger.warn('signUp', 'Email already registered (empty identities)', { email: sanitizedData.email });
        return failure(ErrorCodes.AUTH_EMAIL_IN_USE, 'Este email já está cadastrado. Faça login ou recupere sua senha.');
      }

      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email || sanitizedData.email,
        userType: sanitizedData.userType,
      };

      const duration = timer();
      logger.logWithDuration('info', 'signUp', 'User registered successfully', duration, { userId: user.id });

      return success(user);
    } catch (err) {
      logger.error('signUp', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao criar conta');
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(data: SignInDTO): Promise<ServiceResponse<AuthSession>> {
    // Sanitizar dados de entrada
    const sanitizedData = {
      ...data,
      email: sanitizeEmail(data.email),
    };

    const timer = logger.startTimer();
    // Usar console.log em vez de logger para evitar erro 401 em app_logs
    console.log('[AuthService.signIn] Starting sign in:', sanitizedData.email);

    // Rate limit check
    try {
      await rateLimiterService.checkRateLimit('login');
    } catch (error) {
      if (isRateLimitError(error)) {
        return failure(
          'RATE_LIMIT_LOGIN',
          'Muitas tentativas de login. Aguarde 15 minutos para tentar novamente.'
        );
      }
    }

    // Validate input
    const validation = this.validateSignIn(sanitizedData);
    if (!validation.valid) {
      console.warn('[AuthService.signIn] Validation failed:', validation.errors);
      return failure(
        ErrorCodes.VALIDATION_ERROR,
        'Dados inválidos',
        { errors: validation.errors }
      );
    }

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: sanitizedData.email,
        password: sanitizedData.password,
      });

      if (error) {
        // CRÍTICO: Usar console em vez de logger para evitar erro 401 em app_logs
        console.error('[AuthService.signIn] Supabase auth error:', error.message);

        if (error.message.includes('Invalid login credentials')) {
          return failure(ErrorCodes.AUTH_INVALID_CREDENTIALS, 'Email ou senha incorretos');
        }

        return failure(ErrorCodes.DATABASE_ERROR, error.message);
      }

      if (!authData.user || !authData.session) {
        return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao fazer login');
      }

      // Check subscription for barbershop owners
      const subscriptionCheck = await this.checkBarbershopSubscription(authData.user.id);
      if (!subscriptionCheck.success && subscriptionCheck.error) {
        await supabase.auth.signOut();
        return failure(subscriptionCheck.error.code, subscriptionCheck.error.message, subscriptionCheck.error.details);
      }

      const session: AuthSession = {
        user: {
          id: authData.user.id,
          email: authData.user.email || sanitizedData.email,
          userType: authData.user.user_metadata?.user_type,
        },
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresAt: authData.session.expires_at || 0,
      };

      const duration = timer();
      // Log de sucesso com logger (usuário agora está autenticado)
      logger.logWithDuration('info', 'signIn', 'User signed in successfully', duration, { userId: session.user.id });

      return success(session);
    } catch (err) {
      // Usar console para erros de login para evitar erro 401
      console.error('[AuthService.signIn] Unexpected error:', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao fazer login');
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<ServiceResponse<void>> {
    logger.info('signOut', 'Signing out user');

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error('signOut', 'Supabase sign out error', error);
        return failure(ErrorCodes.DATABASE_ERROR, error.message);
      }

      logger.info('signOut', 'User signed out successfully');
      return success(undefined);
    } catch (err) {
      logger.error('signOut', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao fazer logout');
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<ServiceResponse<AuthSession | null>> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        logger.error('getSession', 'Error getting session', error);
        return failure(ErrorCodes.DATABASE_ERROR, error.message);
      }

      if (!session) {
        return success(null);
      }

      const authSession: AuthSession = {
        user: {
          id: session.user.id,
          email: session.user.email || '',
          userType: session.user.user_metadata?.user_type,
        },
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at || 0,
      };

      return success(authSession);
    } catch (err) {
      logger.error('getSession', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao obter sessão');
    }
  }

  /**
   * Check if barbershop owner has active subscription
   */
  private async checkBarbershopSubscription(userId: string): Promise<ServiceResponse<void>> {
    try {
      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', userId)
        .single();

      if (profileData?.user_type !== 'barbershop_owner') {
        return success(undefined);
      }

      // Get barbershop
      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', userId)
        .single();

      if (!barbershopData) {
        return success(undefined);
      }

      // Check subscription
      const { data: subscriptionData } = await supabase
        .rpc('check_subscription_status', { barbershop_uuid: barbershopData.id });

      if (subscriptionData && subscriptionData.length > 0) {
        const sub = subscriptionData[0];
        if (!sub.is_active) {
          logger.warn('checkBarbershopSubscription', 'Subscription expired', { userId });
          return failure(
            ErrorCodes.AUTH_SUBSCRIPTION_EXPIRED,
            'Seu teste gratuito terminou. Faça upgrade para continuar.'
          );
        }
      }

      return success(undefined);
    } catch (err) {
      logger.error('checkBarbershopSubscription', 'Error checking subscription', err);
      // Don't block login on subscription check error
      return success(undefined);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
