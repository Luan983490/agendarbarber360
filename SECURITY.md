# Segurança - Barber360

Este documento descreve as proteções de segurança implementadas no sistema Barber360.

## Índice

1. [Sanitização de Dados](#sanitização-de-dados)
2. [Rate Limiting](#rate-limiting)
3. [Headers de Segurança](#headers-de-segurança)
4. [Proteção contra Ataques](#proteção-contra-ataques)
5. [Row-Level Security (RLS)](#row-level-security-rls)
6. [Validação de Dados](#validação-de-dados)
7. [Auditoria de Segurança (OWASP Top 10)](#auditoria-de-segurança-owasp-top-10)
8. [Testes de Segurança](#testes-de-segurança)
9. [Recomendações para Produção](#recomendações-para-produção)

---

## Sanitização de Dados

### Visão Geral

O sistema implementa sanitização em múltiplas camadas para proteção contra XSS, SQL Injection e inputs maliciosos.

**Arquivo principal:** `src/lib/sanitizer.ts`

### Funções Disponíveis

| Função | Descrição | Uso |
|--------|-----------|-----|
| `sanitizeString()` | Sanitiza strings, remove HTML/XSS | Campos de texto geral |
| `sanitizeEmail()` | Normaliza e valida email | Campos de email |
| `sanitizePhone()` | Mantém apenas caracteres válidos | Campos de telefone |
| `sanitizeNumber()` | Converte para número seguro | Campos numéricos |
| `sanitizeDate()` | Valida formato YYYY-MM-DD | Campos de data |
| `sanitizeTime()` | Valida formato HH:MM | Campos de horário |
| `sanitizeUuid()` | Valida formato UUID | IDs de entidades |
| `sanitizeUrl()` | Bloqueia protocolos perigosos | Links externos |
| `sanitizeObject()` | Sanitiza objetos recursivamente | Dados de formulário |
| `sanitizeFormData()` | Sanitização com config padrão | Formulários |
| `securityCheck()` | Detecta ameaças + sanitiza | Auditoria de inputs |

### Proteção XSS com DOMPurify

```typescript
import DOMPurify from 'dompurify';

// Configuração padrão - remove TODAS as tags HTML
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

// Para campos com HTML básico (descrições)
const BASIC_HTML_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
  ALLOWED_ATTR: [],
};
```

### Detecção de Ameaças

```typescript
// SQL Injection patterns
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION)\b)/gi,
  /(--)|(\/\*)|(\*\/)/g, // Comentários SQL
  /(\bOR\b|\bAND\b)\s*[\d'"]?\s*=\s*[\d'"]/gi, // OR 1=1
];

// XSS patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onload=
  /<iframe/gi,
  /<object/gi,
];
```

### Integração com Zod

```typescript
import { sanitizedString, sanitizedEmail, sanitizedUuid } from '@/lib/sanitizer';

// Schema com sanitização automática
const formSchema = z.object({
  name: sanitizedString({ minLength: 2, maxLength: 100 }),
  email: sanitizedEmail,
  barberId: sanitizedUuid,
});
```

### Uso nos Services

```typescript
// AuthService
async signUp(data: SignUpDTO) {
  const sanitizedData = {
    ...data,
    email: sanitizeEmail(data.email),
  };
  // ... resto do código
}

// BookingService
async create(data: CreateBookingDTO) {
  const sanitizedData = {
    ...data,
    notes: sanitizeString(data.notes, { maxLength: 500 }),
    clientName: sanitizeString(data.clientName, { maxLength: 100 }),
  };
  // ... resto do código
}
```

---

## Rate Limiting

### Configurações por Ação

| Ação | Máximo Tentativas | Janela de Tempo | Bloqueio |
|------|-------------------|-----------------|----------|
| `login` | 5 | 15 minutos | 30 minutos |
| `signup` | 3 | 60 minutos | 2 horas |
| `booking_create` | 10 | 60 minutos | 2 horas |
| `slots_query` | 60 | 1 minuto | 2 minutos |
| `password_reset` | 3 | 60 minutos | 2 horas |
| `api_call` | 100 | 1 minuto | 2 minutos |

### Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Rate Limiting Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Cliente faz requisição                                      │
│         │                                                       │
│         ▼                                                       │
│  2. Edge Function recebe IP e ação                             │
│         │                                                       │
│         ▼                                                       │
│  3. Verifica blocked_ips (lista negra)                         │
│         │                                                       │
│         ├── IP bloqueado? ─► Retorna 429 + tempo restante      │
│         │                                                       │
│         ▼                                                       │
│  4. Verifica rate_limits (contadores)                          │
│         │                                                       │
│         ├── Limite excedido? ─► Bloqueia + Retorna 429         │
│         │                                                       │
│         ▼                                                       │
│  5. Incrementa contador                                        │
│         │                                                       │
│         ▼                                                       │
│  6. Retorna 200 + headers de rate limit                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tabelas no Banco

```sql
-- Tabela de contadores
CREATE TABLE rate_limits (
  id uuid PRIMARY KEY,
  user_id uuid,
  ip_address text NOT NULL,
  action_type rate_limit_action NOT NULL,
  attempt_count integer DEFAULT 1,
  first_attempt_at timestamptz,
  last_attempt_at timestamptz,
  blocked_until timestamptz
);

-- Tabela de IPs bloqueados
CREATE TABLE blocked_ips (
  id uuid PRIMARY KEY,
  ip_address text UNIQUE NOT NULL,
  reason text,
  blocked_until timestamptz,
  is_permanent boolean DEFAULT false
);
```

---

## Headers de Segurança

Todos os responses das Edge Functions incluem:

```javascript
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; ...",
};
```

| Header | Proteção |
|--------|----------|
| `Strict-Transport-Security` | Força HTTPS |
| `X-Content-Type-Options` | Previne MIME sniffing |
| `X-Frame-Options` | Previne clickjacking |
| `Referrer-Policy` | Controla vazamento de URL |
| `Content-Security-Policy` | Controla recursos carregados |

---

## Proteção contra Ataques

### Brute Force
- ✅ Login limitado a 5 tentativas em 15 minutos
- ✅ Signup limitado a 3 por hora por IP
- ✅ Bloqueio automático após exceder limite
- ✅ Mensagens de erro não revelam existência de usuários

### SQL Injection
- ✅ Supabase Client usa queries parametrizadas automaticamente
- ✅ Detecção de padrões SQL maliciosos em inputs
- ✅ Validação de tipos antes de queries
- ✅ Nenhuma query SQL raw no código

### XSS (Cross-Site Scripting)
- ✅ DOMPurify para sanitização de HTML
- ✅ React escape automático via JSX
- ✅ Detecção de scripts maliciosos
- ✅ Bloqueio de event handlers (onclick, onload)
- ✅ Bloqueio de protocolos perigosos (javascript:, data:)

### CSRF (Cross-Site Request Forgery)
- ✅ Tokens JWT com expiração curta (1h)
- ✅ Refresh token rotation habilitado
- ✅ Headers de CORS configurados
- ✅ Validação de origem em Edge Functions

### DDoS/Abuso
- ✅ Rate limiting por IP
- ✅ Rate limiting por usuário
- ✅ Bloqueio temporário de IPs
- ✅ Lista negra de IPs permanente

---

## Row-Level Security (RLS)

Todas as tabelas têm RLS habilitado. Exemplo de políticas:

```sql
-- Usuários só veem seus próprios dados
POLICY "Users can view own data"
USING (auth.uid() = user_id);

-- Owners podem ver dados de sua barbearia
POLICY "Owners can view barbershop data"
USING (barbershop_id IN (
  SELECT id FROM barbershops WHERE owner_id = auth.uid()
));

-- Rate limits só acessíveis pelo sistema
POLICY "Only system can manage rate limits"
USING (false) WITH CHECK (false);
```

---

## Validação de Dados

### Camadas de Validação

1. **Frontend** - React Hook Form + Zod
2. **Sanitização** - DOMPurify + funções customizadas
3. **Services** - Zod validation
4. **Edge Functions** - Validação de input
5. **Database** - Constraints, triggers, RLS

### Schemas Principais

```typescript
// src/lib/validation-schemas.ts
export const signInSchema = z.object({
  email: z.string().email().transform(s => s.toLowerCase().trim()),
  password: z.string().min(6),
});

export const bookingSchema = z.object({
  barbershopId: z.string().uuid(),
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});
```

---

## Auditoria de Segurança (OWASP Top 10)

### Cobertura OWASP Top 10 2021

| # | Vulnerabilidade | Status | Implementação |
|---|-----------------|--------|---------------|
| A01 | Broken Access Control | ✅ Coberto | RLS em todas as tabelas, validação de ownership |
| A02 | Cryptographic Failures | ✅ Coberto | HTTPS forçado, senhas hasheadas pelo Supabase |
| A03 | Injection | ✅ Coberto | Queries parametrizadas, sanitização de inputs |
| A04 | Insecure Design | ✅ Coberto | Rate limiting, validação em múltiplas camadas |
| A05 | Security Misconfiguration | ✅ Coberto | Headers seguros, CSP configurado |
| A06 | Vulnerable Components | ⚠️ Parcial | Dependências atualizadas, mas requer monitoramento |
| A07 | Auth Failures | ✅ Coberto | Rate limiting, session management, MFA disponível |
| A08 | Software/Data Integrity | ✅ Coberto | Validação Zod, sanitização, RLS |
| A09 | Logging Failures | ✅ Coberto | Logging estruturado em services e Edge Functions |
| A10 | SSRF | ✅ Coberto | URLs validadas, protocolos bloqueados |

### Resultados da Auditoria

**Data:** 2026-01-05

**Vulnerabilidades Críticas:** 0
**Vulnerabilidades Altas:** 0
**Vulnerabilidades Médias:** 0
**Avisos:** 1 (Leaked Password Protection pendente)

### Ações Pendentes

1. **Habilitar "Leaked Password Protection"**
   - Local: Supabase Dashboard > Auth > Providers > Settings
   - Status: Ação manual necessária

---

## Testes de Segurança

### Arquivos de Teste

- `__tests__/security/sanitization.test.ts` - Testes de sanitização
- `__tests__/security/xss.test.ts` - Testes de proteção XSS
- `__tests__/security/rate-limit.test.ts` - Testes de rate limiting

### Cobertura de Testes

```bash
# Executar testes de segurança
npm run test -- __tests__/security/
```

### Payloads Testados

**XSS:**
- Script tags (`<script>alert(1)</script>`)
- Event handlers (`<img onerror="alert(1)">`)
- JavaScript protocol (`javascript:alert(1)`)
- Data protocol (`data:text/html,...`)
- SVG vectors
- Encoded payloads

**SQL Injection:**
- `' OR 1=1 --`
- `'; DROP TABLE users;--`
- `UNION SELECT * FROM users`
- Timing attacks

---

## Recomendações para Produção

### Configurações Obrigatórias

1. **Habilitar Leaked Password Protection**
   ```
   Dashboard > Auth > Providers > Settings
   ```

2. **Configurar MFA (recomendado)**
   ```
   Dashboard > Auth > Multi-Factor Authentication
   ```

3. **Configurar WAF/CDN**
   - Cloudflare, AWS WAF, ou similar
   - Proteção DDoS adicional

### Monitoramento

1. **Alertas de Segurança**
   - Alto volume de rate limit hits
   - IPs com múltiplos bloqueios
   - Tentativas de SQL Injection/XSS detectadas

2. **Logs para Análise**
   - Todas as Edge Functions têm logging estruturado
   - Formato JSON para fácil integração com SIEM

### Manutenção

1. **Limpeza Diária**
   ```sql
   SELECT cleanup_rate_limits();
   ```

2. **Revisão Mensal**
   - Tabela `blocked_ips`
   - Dependências vulneráveis
   - Políticas RLS

### Checklist Final de Segurança

- [x] Sanitização implementada em todos os inputs
- [x] DOMPurify para proteção XSS
- [x] Rate limiting em rotas críticas
- [x] Headers de segurança configurados
- [x] RLS em todas as tabelas
- [x] Validação Zod em formulários e services
- [x] Logging estruturado
- [x] Testes de segurança automatizados
- [x] OWASP Top 10 coberto
- [ ] Leaked Password Protection (ação manual)
- [ ] WAF/CDN (recomendado para produção)
- [ ] Penetration test profissional (recomendado)

---

## Arquivos de Segurança

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/sanitizer.ts` | Utilitário de sanitização global |
| `src/lib/errors.ts` | Classes de erro (RateLimitError) |
| `src/lib/validation-schemas.ts` | Schemas Zod centralizados |
| `src/services/rate-limiter.service.ts` | Service de rate limiting |
| `src/hooks/useRateLimit.ts` | React hook para rate limiting |
| `supabase/functions/rate-limiter/` | Edge Function de rate limiting |
| `__tests__/security/` | Testes de segurança |
| `SECURITY.md` | Este documento |
| `VALIDATION_RULES.md` | Regras de validação |
