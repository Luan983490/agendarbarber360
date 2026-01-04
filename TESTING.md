# 🧪 Guia de Testes - Barber360

Este documento descreve como executar e escrever testes automatizados para o projeto.

## 📋 Stack de Testes

- **Vitest** - Framework de testes (compatível com Jest)
- **Testing Library** - Testes de componentes React
- **MSW (Mock Service Worker)** - Mock de APIs
- **jsdom** - Ambiente de DOM para testes

---

## 🚀 Comandos Disponíveis

### Rodar todos os testes
```bash
npx vitest
```

### Rodar com interface visual
```bash
npx vitest --ui
```
Abre uma interface web interativa para visualizar e gerenciar testes.

### Rodar com cobertura de código
```bash
npx vitest --coverage
```
Gera relatório de cobertura em `./coverage/`.

### Rodar teste específico
```bash
# Por arquivo
npx vitest __tests__/hooks/useAuth.test.tsx

# Por nome do teste
npx vitest -t "deve validar email correto"

# Por padrão de arquivo
npx vitest StarRating
```

### Modo watch (reroda ao salvar)
```bash
npx vitest --watch
```

### Rodar uma vez e sair
```bash
npx vitest run
```

### Rodar em modo silencioso (CI/CD)
```bash
npx vitest run --reporter=verbose
```

---

## 📁 Estrutura de Testes

```
├── __tests__/                    # Testes organizados por tipo
│   ├── components/               # Testes de componentes
│   │   └── StarRating.test.tsx
│   ├── hooks/                    # Testes de hooks
│   │   └── useAuth.test.tsx
│   └── utils/                    # Testes de utilitários
│       └── validation.test.ts
│
├── src/test/                     # Configuração e utilitários
│   ├── setup-tests.ts            # Setup global (mocks, cleanup)
│   ├── test-utils.tsx            # Helpers e custom render
│   └── mocks/
│       ├── handlers.ts           # MSW handlers para APIs
│       └── server.ts             # Servidor MSW
│
└── vitest.config.ts              # Configuração do Vitest
```

---

## ✍️ Como Escrever Testes

### Teste Básico de Componente

```tsx
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { MeuComponente } from '@/components/MeuComponente';

describe('MeuComponente', () => {
  it('deve renderizar corretamente', () => {
    renderWithProviders(<MeuComponente />);
    
    expect(screen.getByText('Texto esperado')).toBeInTheDocument();
  });
});
```

### Teste com Interação do Usuário

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import { BotaoAcao } from '@/components/BotaoAcao';

describe('BotaoAcao', () => {
  it('deve chamar onClick ao clicar', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    renderWithProviders(<BotaoAcao onClick={handleClick} />);
    
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Teste de Hook

```tsx
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMeuHook } from '@/hooks/useMeuHook';

describe('useMeuHook', () => {
  it('deve retornar valor inicial', () => {
    const { result } = renderHook(() => useMeuHook());
    
    expect(result.current.valor).toBe(0);
  });

  it('deve atualizar valor', async () => {
    const { result } = renderHook(() => useMeuHook());
    
    result.current.incrementar();
    
    await waitFor(() => {
      expect(result.current.valor).toBe(1);
    });
  });
});
```

### Teste de Função Utilitária

```ts
import { describe, it, expect } from 'vitest';
import { formatarMoeda } from '@/lib/utils';

describe('formatarMoeda', () => {
  it('deve formatar valor em reais', () => {
    expect(formatarMoeda(35.50)).toBe('R$ 35,50');
  });

  it('deve lidar com zero', () => {
    expect(formatarMoeda(0)).toBe('R$ 0,00');
  });
});
```

### Teste com Mock de API (Supabase)

```tsx
import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// O mock já está configurado em setup-tests.ts
describe('Operações de banco', () => {
  it('deve buscar dados', async () => {
    // Configurar retorno do mock
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: '1', name: 'Teste' }],
        error: null
      })
    } as any);

    // Testar sua função que usa supabase
    // ...
  });
});
```

---

## 🎯 Boas Práticas

### 1. Nomeação de Testes
```tsx
// ✅ Bom - descreve comportamento
it('deve exibir mensagem de erro quando email é inválido')

// ❌ Ruim - vago
it('testa validação')
```

### 2. Estrutura AAA (Arrange, Act, Assert)
```tsx
it('deve incrementar contador', async () => {
  // Arrange - preparar
  const user = userEvent.setup();
  renderWithProviders(<Contador />);
  
  // Act - executar
  await user.click(screen.getByText('+'));
  
  // Assert - verificar
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

### 3. Use `screen` para Queries
```tsx
// ✅ Preferido
const botao = screen.getByRole('button', { name: /enviar/i });

// ❌ Evitar
const { getByRole } = render(<Componente />);
const botao = getByRole('button');
```

### 4. Queries por Prioridade
1. `getByRole` - mais acessível
2. `getByLabelText` - formulários
3. `getByPlaceholderText` - inputs
4. `getByText` - conteúdo visível
5. `getByTestId` - último recurso

### 5. Aguarde Operações Assíncronas
```tsx
// ✅ Correto
await waitFor(() => {
  expect(screen.getByText('Carregado')).toBeInTheDocument();
});

// Ou com findBy (já inclui waitFor)
const elemento = await screen.findByText('Carregado');
```

---

## 🔧 Configuração de Coverage

O arquivo `vitest.config.ts` define thresholds mínimos:

```ts
coverage: {
  thresholds: {
    statements: 50,
    branches: 50,
    functions: 50,
    lines: 50
  }
}
```

Para aumentar gradualmente conforme o projeto evolui.

---

## 🐛 Debugging de Testes

### Ver o que está renderizado
```tsx
import { screen } from '@testing-library/react';

// No meio do teste
screen.debug(); // Imprime o DOM atual
screen.debug(elemento); // Imprime elemento específico
```

### Rodar teste isolado
```tsx
// Usar .only para focar em um teste
it.only('teste que quero debugar', () => {
  // ...
});
```

### Pular teste temporariamente
```tsx
it.skip('teste com problema', () => {
  // ...
});
```

---

## 📊 Relatórios

Após rodar `npx vitest --coverage`:

- **Terminal**: Resumo de cobertura
- **`./coverage/index.html`**: Relatório visual detalhado
- **`./coverage/lcov.info`**: Para integração com CI/CD

---

## 🔄 CI/CD

Para GitHub Actions, adicione `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx vitest run --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 📚 Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Docs](https://mswjs.io/docs/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
