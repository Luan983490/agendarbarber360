/**
 * Hook para integração de Rate Limiting no frontend
 * Fornece verificação de rate limit antes de ações críticas
 */

import { useState, useCallback } from 'react';
import { rateLimiterService, RateLimitAction, RATE_LIMIT_CONFIG } from '@/services';
import { isRateLimitError, RateLimitError } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';

interface UseRateLimitOptions {
  showToastOnError?: boolean;
}

interface UseRateLimitResult {
  checkRateLimit: (action: RateLimitAction, userId?: string) => Promise<boolean>;
  withRateLimit: <T>(action: RateLimitAction, fn: () => Promise<T>, userId?: string) => Promise<T | null>;
  isRateLimited: boolean;
  rateLimitError: RateLimitError | null;
  getRateLimitInfo: (action: RateLimitAction) => { maxAttempts: number; windowMinutes: number; description: string };
  clearRateLimitError: () => void;
}

export function useRateLimit(options: UseRateLimitOptions = {}): UseRateLimitResult {
  const { showToastOnError = true } = options;
  const { toast } = useToast();
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);

  const handleRateLimitError = useCallback((error: RateLimitError) => {
    setIsRateLimited(true);
    setRateLimitError(error);

    if (showToastOnError) {
      toast({
        variant: 'destructive',
        title: 'Limite de tentativas excedido',
        description: `Muitas tentativas. Tente novamente em ${error.getTimeRemainingMessage()}.`,
      });
    }
  }, [showToastOnError, toast]);

  const checkRateLimit = useCallback(async (action: RateLimitAction, userId?: string): Promise<boolean> => {
    try {
      await rateLimiterService.checkRateLimit(action, userId);
      setIsRateLimited(false);
      setRateLimitError(null);
      return true;
    } catch (error) {
      if (isRateLimitError(error)) {
        handleRateLimitError(error);
        return false;
      }
      // Erro inesperado - permitir a ação (fail open)
      return true;
    }
  }, [handleRateLimitError]);

  const withRateLimit = useCallback(async <T>(
    action: RateLimitAction,
    fn: () => Promise<T>,
    userId?: string
  ): Promise<T | null> => {
    const allowed = await checkRateLimit(action, userId);
    if (!allowed) {
      return null;
    }
    return fn();
  }, [checkRateLimit]);

  const clearRateLimitError = useCallback(() => {
    setIsRateLimited(false);
    setRateLimitError(null);
  }, []);

  const getRateLimitInfo = useCallback((action: RateLimitAction) => {
    return RATE_LIMIT_CONFIG[action];
  }, []);

  return {
    checkRateLimit,
    withRateLimit,
    isRateLimited,
    rateLimitError,
    getRateLimitInfo,
    clearRateLimitError,
  };
}
