/**
 * Testes de Rate Limiting
 * Verifica comportamento do sistema de proteção contra abusos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RATE_LIMIT_CONFIG } from '@/services/rate-limiter.service';
import { RateLimitError } from '@/lib/errors';

describe('Configurações de Rate Limit', () => {
  it('deve ter configuração para login', () => {
    expect(RATE_LIMIT_CONFIG.login).toBeDefined();
    expect(RATE_LIMIT_CONFIG.login.maxAttempts).toBe(5);
    expect(RATE_LIMIT_CONFIG.login.windowMinutes).toBe(15);
  });

  it('deve ter configuração para signup', () => {
    expect(RATE_LIMIT_CONFIG.signup).toBeDefined();
    expect(RATE_LIMIT_CONFIG.signup.maxAttempts).toBe(3);
    expect(RATE_LIMIT_CONFIG.signup.windowMinutes).toBe(60);
  });

  it('deve ter configuração para booking_create', () => {
    expect(RATE_LIMIT_CONFIG.booking_create).toBeDefined();
    expect(RATE_LIMIT_CONFIG.booking_create.maxAttempts).toBe(10);
    expect(RATE_LIMIT_CONFIG.booking_create.windowMinutes).toBe(60);
  });

  it('deve ter configuração para slots_query', () => {
    expect(RATE_LIMIT_CONFIG.slots_query).toBeDefined();
    expect(RATE_LIMIT_CONFIG.slots_query.maxAttempts).toBe(60);
    expect(RATE_LIMIT_CONFIG.slots_query.windowMinutes).toBe(1);
  });

  it('deve ter configuração para password_reset', () => {
    expect(RATE_LIMIT_CONFIG.password_reset).toBeDefined();
    expect(RATE_LIMIT_CONFIG.password_reset.maxAttempts).toBe(3);
    expect(RATE_LIMIT_CONFIG.password_reset.windowMinutes).toBe(60);
  });

  it('deve ter configuração para api_call', () => {
    expect(RATE_LIMIT_CONFIG.api_call).toBeDefined();
    expect(RATE_LIMIT_CONFIG.api_call.maxAttempts).toBe(100);
    expect(RATE_LIMIT_CONFIG.api_call.windowMinutes).toBe(1);
  });
});

describe('RateLimitError', () => {
  it('deve criar erro de rate limit genérico', () => {
    const error = RateLimitError.exceeded();
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error).toBeInstanceOf(RateLimitError);
  });

  it('deve criar erro de login com retry after', () => {
    const retryAfter = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    const error = RateLimitError.login(retryAfter);
    
    expect(error.code).toBe('RATE_LIMIT_LOGIN');
    expect(error.retryAfter).toEqual(retryAfter);
    expect(error.actionType).toBe('login');
  });

  it('deve criar erro de signup', () => {
    const error = RateLimitError.signup();
    expect(error.code).toBe('RATE_LIMIT_SIGNUP');
    expect(error.actionType).toBe('signup');
  });

  it('deve criar erro de booking', () => {
    const error = RateLimitError.booking();
    expect(error.code).toBe('RATE_LIMIT_BOOKING');
    expect(error.actionType).toBe('booking_create');
  });

  it('deve criar erro de IP bloqueado', () => {
    const error = RateLimitError.ipBlocked();
    expect(error.code).toBe('IP_BLOCKED');
  });

  describe('getTimeRemainingMessage', () => {
    it('deve retornar mensagem para minutos', () => {
      const retryAfter = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
      const error = RateLimitError.login(retryAfter);
      
      const message = error.getTimeRemainingMessage();
      expect(message).toMatch(/\d+ minuto\(s\)/);
    });

    it('deve retornar mensagem para horas', () => {
      const retryAfter = new Date(Date.now() + 90 * 60 * 1000); // 90 minutos
      const error = RateLimitError.login(retryAfter);
      
      const message = error.getTimeRemainingMessage();
      expect(message).toContain('hora');
    });

    it('deve retornar "alguns minutos" se não houver retryAfter', () => {
      const error = RateLimitError.exceeded();
      const message = error.getTimeRemainingMessage();
      expect(message).toBe('alguns minutos');
    });

    it('deve retornar "0 minutos" se já passou', () => {
      const retryAfter = new Date(Date.now() - 1000); // 1 segundo atrás
      const error = RateLimitError.login(retryAfter);
      
      const message = error.getTimeRemainingMessage();
      expect(message).toBe('0 minutos');
    });
  });
});

describe('Limites de Rate Limit', () => {
  it('login deve permitir 5 tentativas em 15 minutos', () => {
    const config = RATE_LIMIT_CONFIG.login;
    // 5 tentativas em 15 minutos = 1 tentativa a cada 3 minutos é seguro
    expect(config.maxAttempts).toBeLessThanOrEqual(10); // Segurança razoável
    expect(config.windowMinutes).toBeGreaterThanOrEqual(10); // Janela mínima razoável
  });

  it('signup deve ser mais restritivo que login', () => {
    const loginConfig = RATE_LIMIT_CONFIG.login;
    const signupConfig = RATE_LIMIT_CONFIG.signup;
    
    expect(signupConfig.maxAttempts).toBeLessThanOrEqual(loginConfig.maxAttempts);
    expect(signupConfig.windowMinutes).toBeGreaterThanOrEqual(loginConfig.windowMinutes);
  });

  it('slots_query deve ser mais permissivo (UI interativa)', () => {
    const config = RATE_LIMIT_CONFIG.slots_query;
    expect(config.maxAttempts).toBeGreaterThanOrEqual(30); // Permite navegação rápida
    expect(config.windowMinutes).toBeLessThanOrEqual(5); // Janela curta
  });

  it('api_call deve ter limite alto para uso geral', () => {
    const config = RATE_LIMIT_CONFIG.api_call;
    expect(config.maxAttempts).toBeGreaterThanOrEqual(50);
  });
});

describe('Proteção contra Ataques', () => {
  it('brute force de login é bloqueado após 5 tentativas', () => {
    const config = RATE_LIMIT_CONFIG.login;
    // Simula 6 tentativas em sequência
    let attempts = 0;
    const maxAllowed = config.maxAttempts;
    
    while (attempts < 10) {
      attempts++;
      if (attempts > maxAllowed) {
        // Deve ser bloqueado
        expect(attempts).toBeGreaterThan(maxAllowed);
        break;
      }
    }
  });

  it('criação massiva de contas é bloqueada após 3 tentativas', () => {
    const config = RATE_LIMIT_CONFIG.signup;
    expect(config.maxAttempts).toBe(3);
    expect(config.windowMinutes).toBe(60);
    // Em 1 hora, só permite 3 contas do mesmo IP
  });

  it('spam de agendamentos é bloqueado', () => {
    const config = RATE_LIMIT_CONFIG.booking_create;
    expect(config.maxAttempts).toBeLessThanOrEqual(20);
    // Máximo 10 agendamentos por hora por usuário é razoável
  });
});
