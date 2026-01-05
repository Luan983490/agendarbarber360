/**
 * Hook para tratamento de erros em componentes React
 * Fornece funções utilitárias para exibir erros amigáveis via toast
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  getErrorMessage, 
  handleServiceError, 
  requiresLogout,
  isRetryableError,
  logError,
  isRateLimitingError,
} from '@/lib/error-handler';
import { isAppError, AppError, ERROR_MESSAGES, ErrorCode, isRateLimitError, RateLimitError } from '@/lib/errors';
import { ServiceResponse } from '@/services/types';

interface UseErrorHandlerOptions {
  /** Contexto para logging (nome do componente/hook) */
  context?: string;
  /** Callback quando erro requer logout */
  onRequireLogout?: () => void;
}

interface ErrorHandlerResult {
  /** Exibe toast de erro com mensagem amigável */
  showError: (error: unknown) => void;
  /** Exibe toast de erro com título customizado */
  showErrorWithTitle: (title: string, error: unknown) => void;
  /** Trata resposta de service e exibe erro se necessário */
  handleServiceResponse: <T>(response: ServiceResponse<T>) => T | null;
  /** Retorna mensagem amigável para um erro */
  getErrorMessage: (error: unknown) => string;
  /** Verifica se erro requer nova tentativa */
  isRetryable: (error: unknown) => boolean;
}

/**
 * Hook para tratamento padronizado de erros
 * 
 * @example
 * ```tsx
 * const { showError, handleServiceResponse } = useErrorHandler({ context: 'BookingPage' });
 * 
 * const handleSubmit = async () => {
 *   const response = await bookingService.create(data);
 *   const booking = handleServiceResponse(response);
 *   if (booking) {
 *     // Sucesso
 *   }
 * };
 * ```
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): ErrorHandlerResult {
  const { toast } = useToast();
  const { context = 'App', onRequireLogout } = options;

  /**
   * Exibe toast de erro com mensagem amigável
   */
  const showError = useCallback((error: unknown) => {
    const appError = isAppError(error) ? error : handleServiceError(error);
    const message = getErrorMessage(appError);

    // Log do erro
    logError(context, appError);

    // Verifica se requer logout
    if (requiresLogout(appError)) {
      toast({
        variant: 'destructive',
        title: 'Sessão expirada',
        description: 'Faça login novamente para continuar.',
      });
      onRequireLogout?.();
      return;
    }

    // Verifica se é erro de rate limiting
    if (isRateLimitError(appError)) {
      const rateLimitErr = appError as RateLimitError;
      toast({
        variant: 'destructive',
        title: 'Limite de tentativas excedido',
        description: `Muitas tentativas. Aguarde ${rateLimitErr.getTimeRemainingMessage()}.`,
      });
      return;
    }

    // Exibe toast
    toast({
      variant: 'destructive',
      title: 'Erro',
      description: message,
    });
  }, [context, toast, onRequireLogout]);

  /**
   * Exibe toast de erro com título customizado
   */
  const showErrorWithTitle = useCallback((title: string, error: unknown) => {
    const appError = isAppError(error) ? error : handleServiceError(error);
    const message = getErrorMessage(appError);

    logError(context, appError);

    if (requiresLogout(appError)) {
      toast({
        variant: 'destructive',
        title: 'Sessão expirada',
        description: 'Faça login novamente para continuar.',
      });
      onRequireLogout?.();
      return;
    }

    toast({
      variant: 'destructive',
      title,
      description: message,
    });
  }, [context, toast, onRequireLogout]);

  /**
   * Trata resposta de service e exibe erro se necessário
   * Retorna dados se sucesso, null se erro
   */
  const handleServiceResponse = useCallback(<T,>(response: ServiceResponse<T>): T | null => {
    if (!response.success) {
      if (response.error) {
        showError(response.error);
      }
      return null;
    }
    return response.data;
  }, [showError]);

  /**
   * Verifica se erro permite nova tentativa
   */
  const isRetryable = useCallback((error: unknown): boolean => {
    return isRetryableError(error);
  }, []);

  return {
    showError,
    showErrorWithTitle,
    handleServiceResponse,
    getErrorMessage,
    isRetryable,
  };
}

/**
 * Constantes de mensagens de erro para uso direto
 */
export const ErrorMessages = ERROR_MESSAGES;

/**
 * Tipo de código de erro para uso externo
 */
export type { ErrorCode, AppError };

/**
 * Hook simplificado que apenas exibe toasts de erro
 */
export function useErrorToast() {
  const { toast } = useToast();

  const showError = useCallback((message: string) => {
    toast({
      variant: 'destructive',
      title: 'Erro',
      description: message,
    });
  }, [toast]);

  const showSuccess = useCallback((message: string) => {
    toast({
      title: 'Sucesso',
      description: message,
    });
  }, [toast]);

  const showWarning = useCallback((message: string) => {
    toast({
      variant: 'destructive',
      title: 'Atenção',
      description: message,
    });
  }, [toast]);

  return { showError, showSuccess, showWarning };
}
