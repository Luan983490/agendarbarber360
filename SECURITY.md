# Segurança - Barber360

Este documento descreve as proteções de segurança implementadas no sistema Barber360.

## Índice

1. [Rate Limiting](#rate-limiting)
2. [Headers de Segurança](#headers-de-segurança)
3. [Proteção contra Ataques](#proteção-contra-ataques)
4. [Row-Level Security (RLS)](#row-level-security-rls)
5. [Validação de Dados](#validação-de-dados)
6. [Recomendações para Produção](#recomendações-para-produção)

---

## Rate Limiting

### Visão Geral

O sistema implementa rate limiting em múltiplas camadas para proteger contra abusos:

1. **Edge Function** (`supabase/functions/rate-limiter/`) - Middleware centralizado
2. **Banco de Dados** - Tabelas `rate_limits` e `blocked_ips` com funções RPC
3. **Frontend Service** (`src/services/rate-limiter.service.ts`) - Integração client-side
4. **React Hook** (`src/hooks/useRateLimit.ts`) - Facilita uso em componentes

### Configurações por Ação

| Ação | Máximo Tentativas | Janela de Tempo | Bloqueio |
|------|-------------------|-----------------|----------|
| `login` | 5 | 15 minutos | 30 minutos |
| `signup` | 3 | 60 minutos | 2 horas |
| `booking_create` | 10 | 60 minutos | 2 horas |
| `slots_query` | 60 | 1 minuto | 2 minutos |
| `password_reset` | 3 | 60 minutos | 2 horas |
| `api_call` | 100 | 1 minuto | 2 minutos |

### Funcionamento

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

### Uso no Frontend

```typescript
import { useRateLimit } from '@/hooks/useRateLimit';
import { rateLimiterService } from '@/services';

// Com Hook (recomendado para componentes)
function LoginForm() {
  const { checkRateLimit, isRateLimited, rateLimitError } = useRateLimit();

  const handleLogin = async () => {
    const allowed = await checkRateLimit('login');
    if (!allowed) return; // Toast já exibido automaticamente
    
    // Proceder com login...
  };
}

// Com Service (para services/logic)
async function createBooking(data: BookingData) {
  await rateLimiterService.checkRateLimit('booking_create', user.id);
  // Se chegar aqui, está dentro do limite
}
```

### Estrutura do Banco de Dados

```sql
-- Tabela de contadores de rate limit
CREATE TABLE rate_limits (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  ip_address text NOT NULL,
  action_type rate_limit_action NOT NULL,
  attempt_count integer DEFAULT 1,
  first_attempt_at timestamp with time zone,
  last_attempt_at timestamp with time zone,
  blocked_until timestamp with time zone,
  created_at timestamp with time zone
);

-- Tabela de IPs bloqueados
CREATE TABLE blocked_ips (
  id uuid PRIMARY KEY,
  ip_address text UNIQUE NOT NULL,
  reason text,
  blocked_at timestamp with time zone,
  blocked_until timestamp with time zone,
  is_permanent boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id)
);

-- Funções RPC
SELECT check_rate_limit('192.168.1.1', 'login', null, 5, 15);
SELECT reset_rate_limit('192.168.1.1', 'login');
SELECT block_ip('192.168.1.1', 'Atividade suspeita', 24, false);
SELECT cleanup_rate_limits(); -- Limpeza de registros antigos
```

---

## Headers de Segurança

Todos os responses das Edge Functions incluem headers de segurança:

```javascript
const securityHeaders = {
  // HSTS - Força HTTPS por 1 ano
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  
  // Previne MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Previne clickjacking
  'X-Frame-Options': 'DENY',
  
  // Controla referrer
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // CSP básico
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; ..."
};
```

### Detalhes dos Headers

| Header | Valor | Proteção |
|--------|-------|----------|
| `Strict-Transport-Security` | `max-age=31536000` | Força HTTPS |
| `X-Content-Type-Options` | `nosniff` | Previne MIME sniffing |
| `X-Frame-Options` | `DENY` | Previne clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controla vazamento de URL |
| `Content-Security-Policy` | Ver código | Controla recursos carregados |

---

## Proteção contra Ataques

### Brute Force

- **Login**: Máximo 5 tentativas em 15 minutos
- **Signup**: Máximo 3 contas por hora por IP
- **Password Reset**: Máximo 3 por hora
- **Bloqueio automático** após exceder limite

### DDoS/Abuso de API

- **Slots Query**: 60 req/min (consultas de horários)
- **API Geral**: 100 req/min
- **Fail Open**: Em caso de erro no rate limiter, permite requisição (evita lock-out)

### IP Blocking

- Bloqueio temporário automático após excesso de tentativas
- Bloqueio manual via função `block_ip()`
- Bloqueio permanente para IPs maliciosos conhecidos

---

## Row-Level Security (RLS)

Todas as tabelas têm RLS habilitado. Políticas principais:

### rate_limits / blocked_ips
```sql
-- Apenas sistema pode gerenciar (via service_role)
POLICY "Only system can manage rate limits"
USING (false) WITH CHECK (false);
```

### bookings
```sql
-- Usuários só veem seus próprios agendamentos
POLICY "Users can view relevant bookings"
USING (
  auth.uid() = client_id OR
  barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()) OR
  barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid())
);
```

---

## Validação de Dados

### Camadas de Validação

1. **Frontend** - Validação Zod em formulários
2. **Services** - Validação Zod antes de processar
3. **Edge Functions** - Validação de input
4. **Database** - Constraints e triggers

### Schemas Principais

Ver `src/lib/validation-schemas.ts` para schemas completos:

```typescript
// Exemplo: Validação de login
const signInSchema = z.object({
  email: z.string().email('E-mail inválido').transform(s => s.toLowerCase().trim()),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

// Exemplo: Validação de agendamento
const bookingSchema = z.object({
  barbershopId: z.string().uuid(),
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});
```

### Sanitização

- Todos os inputs são `trim()`
- Emails são convertidos para lowercase
- HTML é escapado em campos de texto
- XSS prevention via React (escape automático)

---

## Recomendações para Produção

### Configurações Supabase

1. **Habilitar "Leaked Password Protection"**
   - Dashboard > Auth > Providers > Settings
   - Verifica senhas em bases de dados vazadas

2. **Configurar MFA (opcional)**
   - Dashboard > Auth > Multi-Factor Authentication

3. **Revisar URLs permitidas**
   - Dashboard > Auth > URL Configuration

### Monitoramento

1. **Configurar alertas** para:
   - Alto volume de tentativas bloqueadas
   - IPs com múltiplos bloqueios
   - Erros de rate limiting

2. **Logs estruturados** já implementados nas Edge Functions

### Manutenção

1. **Limpeza periódica** de rate_limits:
   ```sql
   -- Executar diariamente via cron
   SELECT cleanup_rate_limits();
   ```

2. **Revisar blocked_ips** mensalmente

3. **Atualizar limites** conforme uso real

### Checklist de Segurança

- [x] Rate limiting implementado
- [x] Headers de segurança configurados
- [x] RLS em todas as tabelas
- [x] Validação Zod em formulários
- [x] Validação nos services
- [x] Sanitização de inputs
- [x] Logging estruturado
- [ ] Leaked Password Protection (ação manual no dashboard)
- [ ] Monitoramento de alertas (configurar conforme infra)
- [ ] WAF/CDN com proteção DDoS (recomendado para produção)

---

## Classes de Erro

```typescript
// Erros de rate limiting
class RateLimitError extends AppError {
  retryAfter?: Date;        // Quando pode tentar novamente
  remainingAttempts?: number; // Tentativas restantes
  actionType?: string;      // Tipo de ação bloqueada

  // Factory methods
  static exceeded(retryAfter?, actionType?)
  static login(retryAfter?)
  static signup(retryAfter?)
  static booking(retryAfter?)
  static ipBlocked()

  // Helper
  getTimeRemainingMessage(): string // "15 minuto(s)"
}
```

### Códigos de Erro

| Código | Descrição |
|--------|-----------|
| `RATE_LIMIT_EXCEEDED` | Limite genérico excedido |
| `RATE_LIMIT_LOGIN` | Muitas tentativas de login |
| `RATE_LIMIT_SIGNUP` | Muitos cadastros do mesmo IP |
| `RATE_LIMIT_BOOKING` | Muitos agendamentos |
| `RATE_LIMIT_API` | Limite de API excedido |
| `IP_BLOCKED` | IP na lista negra |

---

## Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/rate-limiter/index.ts` | Edge Function de rate limiting |
| `src/services/rate-limiter.service.ts` | Service client-side |
| `src/hooks/useRateLimit.ts` | React hook |
| `src/lib/errors.ts` | Classes de erro (incluindo RateLimitError) |
| `src/lib/validation-schemas.ts` | Schemas Zod centralizados |
| `SECURITY.md` | Este documento |
