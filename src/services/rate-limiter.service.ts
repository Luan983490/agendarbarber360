/**
 * Serviço de Rate Limiting
 * Integra com a Edge Function de rate limiting para proteção contra abusos
 * 
 * IMPORTANTE: Este serviço NÃO usa o logger para evitar erros 401 ao tentar
 * gravar em app_logs antes do usuário estar autenticado.
 */

import { supabase } from '@/integrations/supabase/client';
import { RateLimitError } from '@/lib/errors';

// Tipos de ação para rate limiting
export type RateLimitAction = 
  | 'login' 
  | 'signup' 
  | 'booking_create' 
  | 'slots_query' 
  | 'password_reset' 
  | 'api_call';

// Resposta do rate limiter
interface RateLimitResponse {
  allowed: boolean;
  remainingAttempts?: number;
  resetAt?: string;
  error?: string;
  message?: string;
  retryAfter?: string;
  warning?: string;
}

// Configurações de rate limit (espelhando a Edge Function)
export const RATE_LIMIT_CONFIG: Record<RateLimitAction, { maxAttempts: number; windowMinutes: number; description: string }> = {
  login: { maxAttempts: 5, windowMinutes: 15, description: 'Tentativas de login' },
  signup: { maxAttempts: 3, windowMinutes: 60, description: 'Criação de conta' },
  booking_create: { maxAttempts: 10, windowMinutes: 60, description: 'Criação de agendamentos' },
  slots_query: { maxAttempts: 60, windowMinutes: 1, description: 'Consultas de horários' },
  password_reset: { maxAttempts: 3, windowMinutes: 60, description: 'Redefinição de senha' },
  api_call: { maxAttempts: 100, windowMinutes: 1, description: 'Chamadas de API' },
};

class RateLimiterService {
  private readonly FUNCTION_URL = 'rate-limiter';
  
  /**
   * Verifica se a ação está dentro do rate limit
   * @throws RateLimitError se o limite foi excedido
   */
  async checkRateLimit(action: RateLimitAction, userId?: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke<RateLimitResponse>(
        this.FUNCTION_URL,
        {
          body: { action, userId },
        }
      );

      if (error) {
        // Log apenas no console (não gravar em app_logs antes de autenticação)
        console.warn('[RateLimiter] Erro ao verificar rate limit:', error.message);
        return;
      }

      // Verificar se foi bloqueado
      if (data && !data.allowed) {
        const retryAfter = data.retryAfter ? new Date(data.retryAfter) : undefined;
        
        console.warn('[RateLimiter] Rate limit excedido:', { action, retryAfter: retryAfter?.toISOString() });
        
        // Lançar erro específico por tipo de ação
        switch (action) {
          case 'login':
            throw RateLimitError.login(retryAfter);
          case 'signup':
            throw RateLimitError.signup(retryAfter);
          case 'booking_create':
            throw RateLimitError.booking(retryAfter);
          default:
            throw RateLimitError.exceeded(retryAfter, action);
        }
      }

      // Log apenas no console se houver warning
      if (data?.warning) {
        console.warn('[RateLimiter] Aviso:', data.warning, { action });
      }

    } catch (error) {
      // Se já é um RateLimitError, propaga
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      // Outros erros apenas no console (fail open)
      console.error('[RateLimiter] Erro inesperado:', error);
    }
  }

  /**
   * Wrapper para executar uma ação com verificação de rate limit
   */
  async withRateLimit<T>(
    action: RateLimitAction,
    fn: () => Promise<T>,
    userId?: string
  ): Promise<T> {
    await this.checkRateLimit(action, userId);
    return fn();
  }

  /**
   * Retorna informações sobre o rate limit de uma ação
   */
  getRateLimitInfo(action: RateLimitAction): { maxAttempts: number; windowMinutes: number; description: string } {
    return RATE_LIMIT_CONFIG[action];
  }
}

// Instância singleton
export const rateLimiterService = new RateLimiterService();
