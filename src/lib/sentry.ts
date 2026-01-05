import * as Sentry from '@sentry/react';

/**
 * Inicialização do Sentry para monitoramento de erros em tempo real
 * Documentação: https://docs.sentry.io/platforms/javascript/guides/react/
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const initSentry = () => {
  // Só inicializa se o DSN estiver configurado
  if (!SENTRY_DSN) {
    console.info('[Sentry] DSN não configurado. Monitoramento desabilitado.');
    return;
  }

  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Ambiente (development, staging, production)
    environment: isDevelopment ? 'development' : 'production',
    
    // Release version (pode ser configurado via CI/CD)
    release: import.meta.env.VITE_APP_VERSION || 'barber360@1.0.0',
    
    // Integrations
    integrations: [
      // Browser tracing para performance
      Sentry.browserTracingIntegration(),
      
      // Replay para reproduzir sessões com erros
      Sentry.replayIntegration({
        // Captura replays apenas quando há erro
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance Monitoring
    // Taxa de amostragem para traces (0.0 a 1.0)
    // Em produção, use valores menores para não exceder limites
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    
    // Session Replay
    // Taxa de amostragem para replays de sessão
    replaysSessionSampleRate: isProduction ? 0.1 : 0.5,
    
    // Taxa para replays quando há erro (100% em produção)
    replaysOnErrorSampleRate: 1.0,
    
    // Ignora erros de extensões do navegador
    ignoreErrors: [
      // Erros de rede/timeout
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'AbortError',
      // Erros de extensões
      'chrome-extension://',
      'moz-extension://',
      // Erros comuns não relevantes
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
    
    // Filtra URLs de extensões
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
    
    // Antes de enviar o evento, pode modificar ou filtrar
    beforeSend(event, hint) {
      // Em desenvolvimento, loga no console também
      if (isDevelopment) {
        console.error('[Sentry] Capturado:', hint.originalException || event);
      }
      
      // Remove dados sensíveis
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      
      return event;
    },
    
    // Antes de enviar breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Filtra breadcrumbs de console.log em produção
      if (isProduction && breadcrumb.category === 'console' && breadcrumb.level === 'log') {
        return null;
      }
      return breadcrumb;
    },
  });

  console.info('[Sentry] Monitoramento inicializado com sucesso');
};

/**
 * Captura uma exceção manualmente
 */
export const captureException = (error: Error, context?: Record<string, unknown>) => {
  if (!SENTRY_DSN) return;
  
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Captura uma mensagem manualmente
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (!SENTRY_DSN) return;
  
  Sentry.captureMessage(message, level);
};

/**
 * Define contexto do usuário para melhor rastreamento
 */
export const setUser = (user: { id: string; email?: string; username?: string } | null) => {
  if (!SENTRY_DSN) return;
  
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Adiciona tags para filtrar eventos
 */
export const setTag = (key: string, value: string) => {
  if (!SENTRY_DSN) return;
  Sentry.setTag(key, value);
};

/**
 * Adiciona contexto extra aos eventos
 */
export const setContext = (name: string, context: Record<string, unknown>) => {
  if (!SENTRY_DSN) return;
  Sentry.setContext(name, context);
};

/**
 * Adiciona breadcrumb para rastrear ações do usuário
 */
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  if (!SENTRY_DSN) return;
  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Wrapper para funções async com captura automática de erros
 */
export const withSentryScope = async <T>(
  fn: () => Promise<T>,
  scopeConfig?: { tags?: Record<string, string>; extra?: Record<string, unknown> }
): Promise<T> => {
  return Sentry.withScope(async (scope) => {
    if (scopeConfig?.tags) {
      Object.entries(scopeConfig.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    if (scopeConfig?.extra) {
      Object.entries(scopeConfig.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    return fn();
  });
};

// Re-exporta componentes do Sentry para uso direto
export { Sentry };
