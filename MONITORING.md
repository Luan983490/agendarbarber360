# Monitoramento de Erros - Barber360

Este documento descreve como configurar e usar o monitoramento de erros em tempo real com Sentry.

## Configuração do Sentry

### 1. Criar Conta no Sentry

1. Acesse [https://sentry.io](https://sentry.io)
2. Clique em **"Get Started Free"**
3. Crie uma conta (pode usar GitHub, Google, ou email)
4. O plano gratuito inclui:
   - 5.000 erros/mês
   - 10.000 spans de performance/mês
   - 500 replays de sessão/mês
   - 1 usuário
   - Retenção de 30 dias

### 2. Criar Projeto no Sentry

1. No dashboard do Sentry, clique em **"Create Project"**
2. Selecione **"React"** como plataforma
3. Escolha a opção **"JavaScript"** → **"React"**
4. Dê um nome ao projeto (ex: `barber360-frontend`)
5. Após criar, você receberá um **DSN** (Data Source Name)

### 3. Configurar DSN no Projeto

Adicione o DSN ao arquivo `.env`:

```env
VITE_SENTRY_DSN=https://xxxx@o1234.ingest.sentry.io/5678
```

> ⚠️ **IMPORTANTE**: Nunca commite o DSN real. Use `.env.example` como template.

### 4. Verificar Integração

Após configurar, acesse a aplicação e:
1. Abra o console do navegador
2. Deve aparecer: `[Sentry] Monitoramento inicializado com sucesso`
3. Para testar, você pode forçar um erro e verificar no dashboard do Sentry

## Funcionalidades Implementadas

### Captura Automática de Erros

- ✅ Erros não tratados (uncaught exceptions)
- ✅ Promises rejeitadas sem catch
- ✅ Erros do React (via ErrorBoundary)
- ✅ Erros de rede (fetch failures)

### Performance Monitoring

- ✅ Traces de navegação entre páginas
- ✅ Tempo de carregamento de componentes
- ✅ Métricas Web Vitals (LCP, FID, CLS)

### Session Replay

- ✅ Gravação de sessões com erro
- ✅ Reprodução visual do que o usuário fez
- ✅ Mascaramento de dados sensíveis

### Breadcrumbs

- ✅ Cliques do usuário
- ✅ Navegação entre páginas
- ✅ Console logs (exceto em produção)
- ✅ Requisições de rede

## Uso no Código

### Capturar Erro Manualmente

```typescript
import { captureException } from '@/lib/sentry';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, { 
    context: 'Nome do contexto',
    userId: user.id 
  });
}
```

### Definir Usuário Atual

```typescript
import { setUser } from '@/lib/sentry';

// Após login
setUser({ 
  id: user.id, 
  email: user.email 
});

// Após logout
setUser(null);
```

### Adicionar Tags para Filtrar

```typescript
import { setTag } from '@/lib/sentry';

setTag('barbershop_id', barbershopId);
setTag('user_role', 'barber');
```

### Adicionar Contexto Extra

```typescript
import { setContext } from '@/lib/sentry';

setContext('booking', {
  bookingId: booking.id,
  date: booking.date,
  barberId: booking.barberId,
});
```

### Breadcrumbs Personalizados

```typescript
import { addBreadcrumb } from '@/lib/sentry';

addBreadcrumb({
  category: 'booking',
  message: 'Usuário selecionou horário',
  level: 'info',
  data: { time: '14:00' },
});
```

## Configurações por Ambiente

| Config | Development | Production |
|--------|-------------|------------|
| `tracesSampleRate` | 100% | 10% |
| `replaysSessionSampleRate` | 50% | 10% |
| `replaysOnErrorSampleRate` | 100% | 100% |
| Console breadcrumbs | ✅ | ❌ |

## Dashboard do Sentry

### Visualizando Erros

1. Acesse [sentry.io](https://sentry.io) e faça login
2. Selecione o projeto `barber360-frontend`
3. Na aba **"Issues"**, veja todos os erros agrupados
4. Clique em um erro para ver:
   - Stack trace completo
   - Breadcrumbs (ações do usuário antes do erro)
   - Tags e contexto
   - Session replay (se disponível)

### Configurando Alertas

1. Vá em **"Alerts"** → **"Create Alert"**
2. Configure regras como:
   - Alertar quando um novo erro aparecer
   - Alertar se erros aumentarem X%
   - Alertar para erros em rotas específicas

### Integrações Recomendadas

- **Slack**: Receba alertas de erros críticos
- **GitHub**: Link issues do Sentry com PRs
- **Email**: Resumos diários/semanais

## Limites do Plano Gratuito

| Recurso | Limite Mensal |
|---------|---------------|
| Erros | 5.000 |
| Performance Spans | 10.000 |
| Session Replays | 500 |
| Retenção de dados | 30 dias |
| Usuários | 1 |

Para otimizar o uso:
- `tracesSampleRate` baixo em produção (0.1)
- `replaysSessionSampleRate` baixo (0.1)
- Use `ignoreErrors` para filtrar ruído

## Troubleshooting

### Sentry não inicializa

1. Verifique se `VITE_SENTRY_DSN` está no `.env`
2. Reinicie o servidor de desenvolvimento
3. Verifique o console por mensagens de erro

### Erros não aparecem no dashboard

1. Verifique se o DSN está correto
2. Confirme que `beforeSend` não está filtrando
3. Aguarde alguns minutos (pode haver delay)

### Performance traces não aparecem

1. Verifique `tracesSampleRate` > 0
2. Confirme que `browserTracingIntegration` está ativo

## Recursos Adicionais

- [Documentação Oficial do Sentry](https://docs.sentry.io/)
- [Guia React + Sentry](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Melhores Práticas](https://docs.sentry.io/platforms/javascript/best-practices/)
