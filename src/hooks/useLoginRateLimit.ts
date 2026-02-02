/**
 * Hook para Rate Limiting de Login no Frontend
 * Implementa proteção contra força bruta com:
 * - Contagem de falhas no localStorage
 * - Bloqueio temporário após 3 tentativas
 * - Flag para exibir captcha após 5 tentativas
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'login_rate_limit';
const BLOCK_DURATION_SECONDS = 60;
const ATTEMPTS_FOR_BLOCK = 3;
const ATTEMPTS_FOR_CAPTCHA = 5;

interface RateLimitData {
  failedAttempts: number;
  blockedUntil: number | null; // timestamp
  lastAttempt: number; // timestamp
}

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

const getStoredData = (): RateLimitData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('[LoginRateLimit] Error reading localStorage:', e);
  }
  return {
    failedAttempts: 0,
    blockedUntil: null,
    lastAttempt: 0,
  };
};

const setStoredData = (data: RateLimitData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[LoginRateLimit] Error writing localStorage:', e);
  }
};

const clearStoredData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[LoginRateLimit] Error clearing localStorage:', e);
  }
};

export function useLoginRateLimit(): UseLoginRateLimitResult {
  const [data, setData] = useState<RateLimitData>(getStoredData);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [captchaVerified, setCaptchaVerifiedState] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calcular se está bloqueado
  const isBlocked = data.blockedUntil !== null && Date.now() < data.blockedUntil;

  // Calcular se precisa de captcha
  const requiresCaptcha = data.failedAttempts >= ATTEMPTS_FOR_CAPTCHA;

  // Atualizar contador de segundos restantes
  useEffect(() => {
    if (isBlocked && data.blockedUntil) {
      const updateRemaining = () => {
        const remaining = Math.max(0, Math.ceil((data.blockedUntil! - Date.now()) / 1000));
        setRemainingSeconds(remaining);

        // Se o bloqueio expirou, limpar
        if (remaining <= 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          // Atualizar estado mas manter contagem de falhas
          const newData = { ...data, blockedUntil: null };
          setData(newData);
          setStoredData(newData);
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
  }, [data.blockedUntil, isBlocked]);

  // Carregar dados ao montar
  useEffect(() => {
    const stored = getStoredData();
    
    // Verificar se o bloqueio expirou
    if (stored.blockedUntil && Date.now() >= stored.blockedUntil) {
      stored.blockedUntil = null;
      setStoredData(stored);
    }
    
    setData(stored);
  }, []);

  const recordFailedAttempt = useCallback(() => {
    const newAttempts = data.failedAttempts + 1;
    const now = Date.now();

    let blockedUntil = data.blockedUntil;

    // Bloquear após 3 tentativas
    if (newAttempts >= ATTEMPTS_FOR_BLOCK && !blockedUntil) {
      blockedUntil = now + BLOCK_DURATION_SECONDS * 1000;
    }

    const newData: RateLimitData = {
      failedAttempts: newAttempts,
      blockedUntil,
      lastAttempt: now,
    };

    setData(newData);
    setStoredData(newData);

    // Resetar captcha quando bloquear (forçar reverificação)
    if (newAttempts >= ATTEMPTS_FOR_CAPTCHA) {
      setCaptchaVerifiedState(false);
    }

    console.log('[LoginRateLimit] Failed attempt recorded:', {
      attempts: newAttempts,
      blocked: !!blockedUntil,
      requiresCaptcha: newAttempts >= ATTEMPTS_FOR_CAPTCHA,
    });
  }, [data]);

  const resetOnSuccess = useCallback(() => {
    clearStoredData();
    setData({
      failedAttempts: 0,
      blockedUntil: null,
      lastAttempt: 0,
    });
    setCaptchaVerifiedState(false);
    console.log('[LoginRateLimit] Reset on successful login');
  }, []);

  const setCaptchaVerified = useCallback((verified: boolean) => {
    setCaptchaVerifiedState(verified);
    console.log('[LoginRateLimit] Captcha verified:', verified);
  }, []);

  // Pode tentar login se não estiver bloqueado E (não precisa de captcha OU captcha verificado)
  const canAttemptLogin = !isBlocked && (!requiresCaptcha || captchaVerified);

  return {
    failedAttempts: data.failedAttempts,
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
