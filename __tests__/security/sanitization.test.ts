/**
 * Testes de Sanitização de Dados
 * Verifica proteção contra XSS, SQL Injection e inputs maliciosos
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeDate,
  sanitizeTime,
  sanitizeUuid,
  sanitizeUrl,
  sanitizeObject,
  hasSqlInjection,
  hasXssPattern,
  securityCheck,
  sanitizeFormData,
} from '@/lib/sanitizer';

describe('Sanitização de Strings', () => {
  it('deve fazer trim e normalizar espaços', () => {
    expect(sanitizeString('  hello   world  ')).toBe('hello world');
  });

  it('deve remover tags HTML', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('');
    expect(sanitizeString('<b>bold</b>')).toBe('bold');
    expect(sanitizeString('<img src="x" onerror="alert(1)">')).toBe('');
  });

  it('deve respeitar maxLength', () => {
    const longString = 'a'.repeat(100);
    expect(sanitizeString(longString, { maxLength: 10 })).toHaveLength(10);
  });

  it('deve converter para lowercase quando solicitado', () => {
    expect(sanitizeString('HELLO', { lowercase: true })).toBe('hello');
  });

  it('deve remover caracteres Unicode perigosos', () => {
    expect(sanitizeString('hello\u0000world')).toBe('helloworld');
    expect(sanitizeString('test\u200Bvalue')).toBe('testvalue');
  });
});

describe('Sanitização de Email', () => {
  it('deve normalizar email', () => {
    expect(sanitizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
  });

  it('deve remover caracteres maliciosos', () => {
    expect(sanitizeEmail('<script>@test.com')).not.toContain('<script>');
  });
});

describe('Sanitização de Telefone', () => {
  it('deve manter apenas caracteres válidos', () => {
    expect(sanitizePhone('+55 (11) 99999-9999')).toBe('+55 (11) 99999-9999');
    expect(sanitizePhone('abc123def456')).toBe('123456');
  });

  it('deve limitar tamanho', () => {
    const longPhone = '1'.repeat(50);
    expect(sanitizePhone(longPhone)).toHaveLength(20);
  });
});

describe('Sanitização de Números', () => {
  it('deve converter string para número', () => {
    expect(sanitizeNumber('123.45')).toBe(123.45);
    expect(sanitizeNumber('R$ 100,00'.replace(',', '.'))).toBe(100);
  });

  it('deve retornar null para valores inválidos', () => {
    expect(sanitizeNumber('abc')).toBe(null);
    expect(sanitizeNumber('')).toBe(null);
    expect(sanitizeNumber(undefined)).toBe(null);
    expect(sanitizeNumber(NaN)).toBe(null);
    expect(sanitizeNumber(Infinity)).toBe(null);
  });

  it('deve retornar inteiro corretamente', () => {
    expect(sanitizeInteger('123.99')).toBe(123);
  });
});

describe('Sanitização de Data', () => {
  it('deve validar formato YYYY-MM-DD', () => {
    expect(sanitizeDate('2024-01-15')).toBe('2024-01-15');
    expect(sanitizeDate('15/01/2024')).toBe(null);
    expect(sanitizeDate('invalid')).toBe(null);
  });

  it('deve rejeitar datas inválidas', () => {
    expect(sanitizeDate('2024-13-01')).toBe(null); // Mês 13
    expect(sanitizeDate('2024-02-30')).toBe(null); // 30 de fevereiro
  });
});

describe('Sanitização de Horário', () => {
  it('deve validar formato HH:MM', () => {
    expect(sanitizeTime('09:30')).toBe('09:30');
    expect(sanitizeTime('9:30')).toBe(null); // Precisa de dois dígitos
    expect(sanitizeTime('25:00')).toBe(null); // Hora inválida
    expect(sanitizeTime('12:60')).toBe(null); // Minuto inválido
  });
});

describe('Sanitização de UUID', () => {
  it('deve validar UUIDs', () => {
    expect(sanitizeUuid('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(sanitizeUuid('not-a-uuid')).toBe(null);
    expect(sanitizeUuid('550e8400e29b41d4a716446655440000')).toBe(null); // Sem hífens
  });
});

describe('Sanitização de URL', () => {
  it('deve aceitar URLs válidas', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
  });

  it('deve bloquear protocolos perigosos', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe(null);
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe(null);
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe(null);
  });
});

describe('Detecção de SQL Injection', () => {
  it('deve detectar padrões de SQL Injection', () => {
    expect(hasSqlInjection("' OR 1=1 --")).toBe(true);
    expect(hasSqlInjection("'; DROP TABLE users;--")).toBe(true);
    expect(hasSqlInjection("UNION SELECT * FROM users")).toBe(true);
    expect(hasSqlInjection("1; EXEC xp_cmdshell")).toBe(true);
  });

  it('deve aceitar texto normal', () => {
    expect(hasSqlInjection("João da Silva")).toBe(false);
    expect(hasSqlInjection("user@email.com")).toBe(false);
  });
});

describe('Detecção de XSS', () => {
  it('deve detectar padrões de XSS', () => {
    expect(hasXssPattern('<script>alert(1)</script>')).toBe(true);
    expect(hasXssPattern('<img src=x onerror=alert(1)>')).toBe(true);
    expect(hasXssPattern('javascript:alert(1)')).toBe(true);
    expect(hasXssPattern('<a href="javascript:void(0)">')).toBe(true);
  });

  it('deve aceitar texto normal', () => {
    expect(hasXssPattern("Hello World")).toBe(false);
    expect(hasXssPattern("Nome completo")).toBe(false);
  });
});

describe('Security Check', () => {
  it('deve identificar múltiplas ameaças', () => {
    const result = securityCheck("<script>'; DROP TABLE users;--</script>");
    expect(result.safe).toBe(false);
    expect(result.threats).toContain('XSS');
    expect(result.threats).toContain('SQL_INJECTION');
  });

  it('deve retornar safe para texto normal', () => {
    const result = securityCheck("Nome do usuário");
    expect(result.safe).toBe(true);
    expect(result.threats).toHaveLength(0);
  });

  it('deve sempre retornar valor sanitizado', () => {
    const result = securityCheck('<script>alert(1)</script>');
    expect(result.sanitizedValue).not.toContain('<script>');
  });
});

describe('Sanitização de Objetos', () => {
  it('deve sanitizar campos específicos', () => {
    const obj = {
      email: '  USER@EXAMPLE.COM  ',
      phone: 'abc(11)99999-9999xyz',
      name: '  <b>John</b>  ',
    };

    const sanitized = sanitizeObject(obj, {
      emailFields: ['email'],
      phoneFields: ['phone'],
    });

    expect(sanitized.email).toBe('user@example.com');
    expect(sanitized.phone).toBe('(11)99999-9999');
    expect(sanitized.name).toBe('John');
  });

  it('deve sanitizar objetos aninhados', () => {
    const obj = {
      user: {
        name: '<script>hack</script>',
        email: 'TEST@TEST.COM',
      },
    };

    const sanitized = sanitizeObject(obj, {
      emailFields: ['email'],
    });

    expect(sanitized.user.name).not.toContain('<script>');
    expect(sanitized.user.email).toBe('test@test.com');
  });

  it('deve sanitizar arrays', () => {
    const obj = {
      tags: ['<script>xss</script>', 'normal'],
    };

    const sanitized = sanitizeObject(obj);
    expect(sanitized.tags[0]).not.toContain('<script>');
    expect(sanitized.tags[1]).toBe('normal');
  });
});

describe('Sanitização de Formulário', () => {
  it('deve usar configuração padrão para campos comuns', () => {
    const formData = {
      email: '  USER@EXAMPLE.COM  ',
      phone: '(11) 99999-9999',
      barberId: '550e8400-e29b-41d4-a716-446655440000',
      bookingDate: '2024-01-15',
      bookingTime: '09:30',
    };

    const sanitized = sanitizeFormData(formData);

    expect(sanitized.email).toBe('user@example.com');
    expect(sanitized.barberId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});

describe('Casos Edge', () => {
  it('deve lidar com valores null/undefined', () => {
    expect(sanitizeString(null as unknown as string)).toBe('');
    expect(sanitizeString(undefined as unknown as string)).toBe('');
    expect(sanitizeNumber(null)).toBe(null);
    expect(sanitizeNumber(undefined)).toBe(null);
  });

  it('deve lidar com strings vazias', () => {
    expect(sanitizeString('')).toBe('');
    expect(sanitizeEmail('')).toBe('');
    expect(sanitizePhone('')).toBe('');
  });

  it('deve lidar com tipos incorretos', () => {
    expect(sanitizeString(123 as unknown as string)).toBe('');
    expect(sanitizeEmail(123 as unknown as string)).toBe('');
    expect(sanitizeDate(123 as unknown as string)).toBe(null);
  });
});
