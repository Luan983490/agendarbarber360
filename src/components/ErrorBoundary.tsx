import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createLogger } from '@/services/logger';
import { getErrorMessage, logError } from '@/lib/error-handler';
import { captureException, setContext } from '@/lib/sentry';
import { supabase } from '@/integrations/supabase/client';

const logger = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

async function sendErrorToSupabase(
  error: Error,
  errorInfo: ErrorInfo | null,
  errorId: string
): Promise<void> {
  try {
    await (supabase.from('app_logs') as any).insert({
      level: 'error',
      service: 'ErrorBoundary',
      method: 'componentDidCatch',
      message: error.message || 'Unknown error',
      context: {
        errorId,
        componentStack: errorInfo?.componentStack,
      },
      error_stack: error.stack,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch (err) {
    console.error('[ErrorBoundary] Failed to send error to Supabase:', err);
  }
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Gera um ID único para o erro (para referência em suporte)
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    return { 
      hasError: true, 
      error,
      errorId,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorId = this.state.errorId || `ERR-${Date.now().toString(36).toUpperCase()}`;
    
    // Log estruturado do erro
    logError('ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
      errorId,
    });

    logger.error('componentDidCatch', 'Erro React não tratado capturado', error, {
      componentStack: errorInfo.componentStack,
    });

    // Envia erro para o Sentry
    setContext('react', {
      componentStack: errorInfo.componentStack,
      errorId,
    });
    captureException(error, {
      componentStack: errorInfo.componentStack,
      errorId,
      errorBoundary: true,
    });

    // Envia erro para o Supabase app_logs
    sendErrorToSupabase(error, errorInfo, errorId);

    this.setState({ errorInfo });

    // Callback opcional para tratamento adicional
    this.props.onError?.(error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  private handleReportError = (): void => {
    const { error, errorId, errorInfo } = this.state;
    
    // Aqui você pode integrar com um serviço de erro como Sentry
    // Por enquanto, abre um email com os detalhes
    const subject = encodeURIComponent(`Erro na aplicação - ${errorId}`);
    const body = encodeURIComponent(`
Código do erro: ${errorId}
Mensagem: ${error?.message || 'Erro desconhecido'}
Timestamp: ${new Date().toISOString()}

Por favor, descreva o que você estava fazendo quando o erro ocorreu:

---
Detalhes técnicos (não remova):
${error?.stack || 'Stack trace não disponível'}

Component Stack:
${errorInfo?.componentStack || 'Não disponível'}
    `.trim());

    window.location.href = `mailto:suporte@barber360.com?subject=${subject}&body=${body}`;
  };

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // Fallback customizado
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId } = this.state;
      const userMessage = getErrorMessage(error);

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Ops! Algo deu errado</CardTitle>
              <CardDescription className="text-base mt-2">
                {userMessage}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Código de referência</p>
                <p className="font-mono text-sm font-medium">{errorId}</p>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                Se o problema persistir, use o botão abaixo para reportar o erro 
                com o código de referência.
              </p>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={this.handleGoHome}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Ir para início
                </Button>
                <Button
                  className="flex-1"
                  onClick={this.handleReload}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={this.handleReportError}
              >
                <Bug className="mr-2 h-4 w-4" />
                Reportar erro
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC para usar com componentes funcionais
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
