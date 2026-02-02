/**
 * Hook para Rate Limiting de Login no Frontend
 * Implementa proteção contra força bruta com:
 * - Contagem de falhas no localStorage
 * - Bloqueio temporário após 3 tentativas
 * - Flag para exibir captcha após 5 tentativas
 * 
 * CHAVES DO LOCALSTORAGE:
 * - 'auth_failures': número de tentativas falhas (string)
 * - 'auth_blocked_until': timestamp de quando o bloqueio expira (string)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const FAILURES_KEY = 'auth_failures';
const BLOCKED_KEY = 'auth_blocked_until';
const BLOCK_DURATION_MS = 60000; // 60 segundos
const ATTEMPTS_FOR_BLOCK = 3;
const ATTEMPTS_FOR_CAPTCHA = 5;

interface UseLoginRateLimitResult {
  /** Número de tentativas falhas */
  failedAttempts: number;
  /** Se o login está bloqueado temporariamente */
  isBlocked: boolean;
  /** Segundos restantes do bloqueio */
  remainingSeconds: number;
  /** Se deve exibir o captcha */
  requiresCaptcha: boolean;
  /** Se o captcha foi verificado */
  captchaVerified: boolean;
  /** Registrar uma tentativa falha */
  recordFailedAttempt: () => void;
  /** Resetar após login bem-sucedido */
  resetOnSuccess: () => void;
  /** Marcar captcha como verificado */
  setCaptchaVerified: (verified: boolean) => void;
  /** Se pode tentar login (não bloqueado e captcha ok se necessário) */
  canAttemptLogin: boolean;
}

// Funções utilitárias simples para localStorage
const getFailures = (): number => {
  const val = localStorage.getItem(FAILURES_KEY);
  return val ? Number(val) : 0;
};

const getBlockedUntil = (): number => {
  const val = localStorage.getItem(BLOCKED_KEY);
  return val ? Number(val) : 0;
};

const setFailures = (count: number): void => {
  localStorage.setItem(FAILURES_KEY, count.toString());
  console.log('[RateLimit] auth_failures =', count);
};

const setBlockedUntil = (timestamp: number): void => {
  localStorage.setItem(BLOCKED_KEY, timestamp.toString());
  console.log('[RateLimit] auth_blocked_until =', new Date(timestamp).toISOString());
};

const clearAll = (): void => {
  localStorage.setItem(FAILURES_KEY, '0');
  localStorage.removeItem(BLOCKED_KEY);
  console.log('[RateLimit] Cleared all');
};

export function useLoginRateLimit(): UseLoginRateLimitResult {
  // Estado local para forçar re-renders
  const [failedAttempts, setFailedAttempts] = useState(() => getFailures());
  const [blockedUntil, setBlockedUntilState] = useState(() => getBlockedUntil());
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [captchaVerified, setCaptchaVerifiedState] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calcular se está bloqueado
  const now = Date.now();
  const isBlocked = blockedUntil > 0 && now < blockedUntil;
  const requiresCaptcha = failedAttempts >= ATTEMPTS_FOR_CAPTCHA;

  // Carregar estado do localStorage ao montar
  useEffect(() => {
    const failures = getFailures();
    const blocked = getBlockedUntil();
    
    console.log('[RateLimit] Carregando estado:', { failures, blocked });
    
    setFailedAttempts(failures);
    setBlockedUntilState(blocked);
    
    // Se está bloqueado mas o tempo passou, resetar
    if (failures >= ATTEMPTS_FOR_BLOCK && blocked > 0 && Date.now() >= blocked) {
      console.log('[RateLimit] Bloqueio expirou, resetando...');
      clearAll();
      setFailedAttempts(0);
      setBlockedUntilState(0);
    }
  }, []);

  // Timer para atualizar contador de segundos restantes
  useEffect(() => {
    if (isBlocked && blockedUntil > 0) {
      const updateRemaining = () => {
        const remaining = Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
        setRemainingSeconds(remaining);

        if (remaining <= 0) {
          // Bloqueio expirou
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          clearAll();
          setFailedAttempts(0);
          setBlockedUntilState(0);
        }
      };

      updateRemaining();
      intervalRef.current = setInterval(updateRemaining, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      setRemainingSeconds(0);
    }
  }, [blockedUntil, isBlocked]);

  const recordFailedAttempt = useCallback(() => {
    const currentFailures = getFailures();
    const newCount = currentFailures + 1;
    
    console.log('[RateLimit] recordFailedAttempt:', { anterior: currentFailures, novo: newCount });
    
    // Salvar no localStorage
    setFailures(newCount);
    
    // Aplicar bloqueio se atingiu limite
    if (newCount >= ATTEMPTS_FOR_BLOCK) {
      const blockTime = Date.now() + BLOCK_DURATION_MS;
      setBlockedUntil(blockTime);
      setBlockedUntilState(blockTime);
    }
    
    // Atualizar estado React
    setFailedAttempts(newCount);
    
    // Resetar captcha se necessário
    if (newCount >= ATTEMPTS_FOR_CAPTCHA) {
      setCaptchaVerifiedState(false);
    }
  }, []);

  const resetOnSuccess = useCallback(() => {
    console.log('[RateLimit] resetOnSuccess');
    clearAll();
    setFailedAttempts(0);
    setBlockedUntilState(0);
    setCaptchaVerifiedState(false);
  }, []);

  const setCaptchaVerified = useCallback((verified: boolean) => {
    setCaptchaVerifiedState(verified);
    console.log('[RateLimit] captchaVerified =', verified);
  }, []);

  // Pode tentar login se não estiver bloqueado E (não precisa de captcha OU captcha verificado)
  const canAttemptLogin = !isBlocked && (!requiresCaptcha || captchaVerified);

  return {
    failedAttempts,
    isBlocked,
    remainingSeconds,
    requiresCaptcha,
    captchaVerified,
    recordFailedAttempt,
    resetOnSuccess,
    setCaptchaVerified,
    canAttemptLogin,
  };
}
