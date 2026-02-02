/**
 * Cloudflare Turnstile CAPTCHA Component
 * Integração com o serviço de verificação de bots da Cloudflare
 * 
 * Para configurar:
 * 1. Acesse https://dash.cloudflare.com/sign-up?to=/:account/turnstile
 * 2. Crie um novo widget e obtenha o Site Key
 * 3. Configure a secret key na edge function para validação server-side
 */

import { useEffect, useRef, useCallback } from 'react';
import { Shield } from 'lucide-react';

// Site Key público do Turnstile
// Para desenvolvimento, use a chave de teste: 1x00000000000000000000AA (sempre passa)
// Para produção, substitua pela sua chave real do Cloudflare
const TURNSTILE_SITE_KEY = '1x00000000000000000000AA'; // Chave de teste (sempre passa)

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error: Error) => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (error: Error) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function TurnstileCaptcha({
  onVerify,
  onError,
  onExpire,
  className = '',
}: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    // Remover widget existente
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // Ignorar erro se widget não existir
      }
    }

    // Renderizar novo widget
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: onVerify,
      'error-callback': onError,
      'expired-callback': onExpire,
      theme: 'auto',
      size: 'normal',
    });
  }, [onVerify, onError, onExpire]);

  useEffect(() => {
    // Se o script já foi carregado
    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Se já iniciamos o carregamento do script
    if (scriptLoadedRef.current) {
      return;
    }

    scriptLoadedRef.current = true;

    // Callback quando o script carregar
    window.onTurnstileLoad = () => {
      renderWidget();
    };

    // Carregar o script do Turnstile
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignorar
        }
      }
    };
  }, [renderWidget]);

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4 text-primary" />
        <span>Verificação de segurança necessária</span>
      </div>
      <div 
        ref={containerRef} 
        className="min-h-[65px] flex items-center justify-center"
      />
    </div>
  );
}

export default TurnstileCaptcha;
