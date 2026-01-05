# Regras de Validação - Barber360

Este documento descreve todas as regras de validação implementadas no sistema Barber360 usando Zod.

## Índice

1. [Constantes de Validação](#constantes-de-validação)
2. [Schemas de Autenticação](#schemas-de-autenticação)
3. [Schemas de Perfil](#schemas-de-perfil)
4. [Schemas de Barbearia](#schemas-de-barbearia)
5. [Schemas de Barbeiro](#schemas-de-barbeiro)
6. [Schemas de Serviço](#schemas-de-serviço)
7. [Schemas de Produto](#schemas-de-produto)
8. [Schemas de Agendamento](#schemas-de-agendamento)
9. [Schemas de Avaliação](#schemas-de-avaliação)
10. [Schemas de Bloqueio](#schemas-de-bloqueio)
11. [Schemas de Pacote](#schemas-de-pacote)
12. [Funções Utilitárias](#funções-utilitárias)

---

## Constantes de Validação

Arquivo: `src/lib/validation-schemas.ts`

```typescript
VALIDATION_CONSTANTS = {
  // Comprimentos de texto
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ADDRESS_MAX_LENGTH: 255,
  PHONE_MAX_LENGTH: 20,
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 1000,
  COMMENT_MAX_LENGTH: 500,
  REASON_MAX_LENGTH: 255,
  
  // Valores numéricos
  PRICE_MIN: 0,
  PRICE_MAX: 100000,
  DURATION_MIN: 5,       // minutos
  DURATION_MAX: 480,     // 8 horas
  STOCK_MIN: 0,
  STOCK_MAX: 999999,
  RATING_MIN: 1,
  RATING_MAX: 5,
  SESSIONS_MIN: 1,
  SESSIONS_MAX: 100,
  VALIDITY_DAYS_MIN: 1,
  VALIDITY_DAYS_MAX: 365,
}
```

---

## Schemas de Autenticação

### loginSchema

| Campo    | Tipo   | Obrigatório | Validação                    |
|----------|--------|-------------|------------------------------|
| email    | string | ✅          | Email válido, lowercase, trim |
| password | string | ✅          | Mínimo 1 caractere           |

**Exemplo:**
```typescript
import { loginSchema } from '@/lib/validation-schemas';

const result = loginSchema.safeParse({
  email: 'usuario@email.com',
  password: 'minhasenha'
});
```

### signUpSchema

| Campo           | Tipo   | Obrigatório | Validação                              |
|-----------------|--------|-------------|----------------------------------------|
| email           | string | ✅          | Email válido, lowercase, trim          |
| password        | string | ✅          | 6-100 caracteres                       |
| confirmPassword | string | ✅          | Deve ser igual à password              |
| userType        | enum   | ✅          | 'client' \| 'barbershop_owner' \| 'barber' |

**Regras de Negócio:**
- Senha e confirmação devem ser iguais
- Email é convertido para minúsculas automaticamente

---

## Schemas de Perfil

### profileUpdateSchema

| Campo        | Tipo     | Obrigatório | Validação                    |
|--------------|----------|-------------|------------------------------|
| display_name | string   | ❌          | 2-100 caracteres, trim       |
| phone        | string   | ❌          | Máx 20 chars, formato válido |
| birth_date   | string   | ❌          | Formato YYYY-MM-DD           |
| gender       | enum     | ❌          | 'male' \| 'female' \| 'other' |
| address      | object   | ❌          | Ver addressObjectSchema      |

### addressObjectSchema

| Campo        | Tipo   | Obrigatório | Validação          |
|--------------|--------|-------------|--------------------|
| country      | string | ❌          | Default: 'Brasil'  |
| postal_code  | string | ❌          | Máx 10 caracteres  |
| street       | string | ❌          | Máx 255 caracteres |
| neighborhood | string | ❌          | Máx 100 caracteres |
| number       | string | ❌          | Máx 20 caracteres  |
| complement   | string | ❌          | Máx 100 caracteres |
| state        | string | ❌          | Máx 50 caracteres  |
| city         | string | ❌          | Máx 100 caracteres |

---

## Schemas de Barbearia

### barbershopCreateSchema

| Campo       | Tipo     | Obrigatório | Validação                      |
|-------------|----------|-------------|--------------------------------|
| name        | string   | ✅          | 2-100 caracteres, trim         |
| description | string   | ❌          | Máx 500 caracteres             |
| address     | string   | ✅          | Máx 255 caracteres             |
| phone       | string   | ✅          | Mínimo 1 caractere             |
| email       | string   | ✅          | Email válido, lowercase        |
| image_url   | string   | ❌          | URL válida ou vazio            |
| amenities   | string[] | ❌          | Máx 20 itens, 50 chars cada    |

**Exemplo:**
```typescript
import { barbershopCreateSchema } from '@/lib/validation-schemas';

const validation = validateWithSchema(barbershopCreateSchema, {
  name: 'Barbearia Premium',
  address: 'Rua Exemplo, 123',
  phone: '(11) 99999-9999',
  email: 'contato@barbearia.com',
  amenities: ['Wi-Fi Grátis', 'Ar Condicionado']
});
```

---

## Schemas de Barbeiro

### barberCreateSchema

| Campo        | Tipo   | Obrigatório | Validação                |
|--------------|--------|-------------|--------------------------|
| name         | string | ✅          | 2-100 caracteres, trim   |
| phone        | string | ❌          | Máx 20 caracteres        |
| specialty    | string | ❌          | Máx 100 caracteres       |
| image_url    | string | ❌          | URL válida ou vazio      |
| barbershop_id| UUID   | ✅          | UUID válido              |

### barberUpdateSchema

Mesmos campos que `barberCreateSchema`, mas todos opcionais.
Adicional:
- `is_active`: boolean (opcional)

---

## Schemas de Serviço

### serviceFormSchema (Frontend)

| Campo       | Tipo   | Obrigatório | Validação                    |
|-------------|--------|-------------|------------------------------|
| name        | string | ✅          | Mínimo 1 caractere, trim     |
| description | string | ❌          | String (sem limite no form)  |
| price       | string | ✅          | Mínimo 1 caractere           |
| duration    | string | ✅          | Mínimo 1 caractere           |

### serviceCreateSchema (Backend)

| Campo        | Tipo    | Obrigatório | Validação                |
|--------------|---------|-------------|--------------------------|
| name         | string  | ✅          | 2-100 caracteres         |
| description  | string  | ❌          | Máx 500 caracteres       |
| price        | number  | ✅          | 0 - 100.000              |
| duration     | number  | ✅          | 5 - 480 minutos          |
| barbershop_id| UUID    | ✅          | UUID válido              |
| is_active    | boolean | ❌          | Default: true            |

**Regras de Negócio:**
- Preço não pode ser negativo
- Duração mínima de 5 minutos (permite intervalos rápidos)
- Duração máxima de 8 horas (480 minutos)

---

## Schemas de Produto

### productFormSchema (Frontend)

| Campo          | Tipo   | Obrigatório | Validação                |
|----------------|--------|-------------|--------------------------|
| name           | string | ✅          | Mínimo 1 caractere       |
| description    | string | ❌          | String                   |
| price          | string | ✅          | Mínimo 1 caractere       |
| stock_quantity | string | ✅          | Mínimo 1 caractere       |

### productCreateSchema (Backend)

| Campo          | Tipo    | Obrigatório | Validação                |
|----------------|---------|-------------|--------------------------|
| name           | string  | ✅          | 2-100 caracteres         |
| description    | string  | ❌          | Máx 500 caracteres       |
| price          | number  | ✅          | 0 - 100.000              |
| stock_quantity | number  | ✅          | 0 - 999.999              |
| barbershop_id  | UUID    | ✅          | UUID válido              |
| is_active      | boolean | ❌          | Default: true            |

---

## Schemas de Agendamento

### bookingCreateSchema

| Campo              | Tipo     | Obrigatório | Validação                |
|--------------------|----------|-------------|--------------------------|
| barbershop_id      | UUID     | ✅          | UUID válido              |
| barber_id          | UUID     | ❌          | UUID válido              |
| service_id         | UUID     | ✅          | UUID válido              |
| client_id          | UUID     | ❌          | UUID válido              |
| client_name        | string   | ❌          | Máx 100 caracteres       |
| booking_date       | string   | ✅          | Formato YYYY-MM-DD       |
| booking_time       | string   | ✅          | Formato HH:MM            |
| total_price        | number   | ✅          | Valor >= 0               |
| notes              | string   | ❌          | Máx 1000 caracteres      |
| is_external_booking| boolean  | ❌          | Default: false           |

### bookingCancelSchema

| Campo     | Tipo   | Obrigatório | Validação                |
|-----------|--------|-------------|--------------------------|
| bookingId | UUID   | ✅          | UUID válido              |
| reason    | string | ❌          | Máx 255 caracteres       |

**Regras de Negócio:**
- Não permite agendar para data/hora passada
- Verifica conflitos com outros agendamentos do barbeiro
- Verifica bloqueios de horário do barbeiro

---

## Schemas de Avaliação

### reviewCreateSchema

| Campo        | Tipo   | Obrigatório | Validação                |
|--------------|--------|-------------|--------------------------|
| barbershop_id| UUID   | ✅          | UUID válido              |
| rating       | number | ✅          | 1-5 (inteiro)            |
| comment      | string | ❌          | Máx 500 caracteres       |

**Regras de Negócio:**
- Avaliação mínima: 1 estrela
- Avaliação máxima: 5 estrelas
- Comentário é opcional

---

## Schemas de Bloqueio

### blockTimeSchema

| Campo      | Tipo   | Obrigatório | Validação                         |
|------------|--------|-------------|-----------------------------------|
| barber_id  | UUID   | ✅          | UUID válido                       |
| block_date | string | ✅          | Formato YYYY-MM-DD                |
| start_time | string | ✅          | Formato HH:MM                     |
| end_time   | string | ✅          | Formato HH:MM, > start_time       |
| reason     | string | ❌          | Máx 255 caracteres                |

### blockPeriodSchema

| Campo      | Tipo   | Obrigatório | Validação                         |
|------------|--------|-------------|-----------------------------------|
| barber_id  | UUID   | ✅          | UUID válido                       |
| start_date | string | ✅          | Formato YYYY-MM-DD                |
| end_date   | string | ✅          | Formato YYYY-MM-DD, >= start_date |
| start_time | string | ✅          | Formato HH:MM                     |
| end_time   | string | ✅          | Formato HH:MM, > start_time       |
| reason     | string | ❌          | Máx 255 caracteres                |

---

## Schemas de Pacote

### packageFormSchema (Frontend)

| Campo             | Tipo    | Obrigatório | Validação                |
|-------------------|---------|-------------|--------------------------|
| name              | string  | ✅          | Mínimo 1 caractere       |
| description       | string  | ❌          | String                   |
| price             | string  | ✅          | Mínimo 1 caractere       |
| sessions_included | string  | ✅          | Mínimo 1 caractere       |
| validity_days     | string  | ✅          | Mínimo 1 caractere       |
| is_active         | boolean | ❌          | Default: true            |

### packageCreateSchema (Backend)

| Campo             | Tipo    | Obrigatório | Validação                |
|-------------------|---------|-------------|--------------------------|
| name              | string  | ✅          | 2-100 caracteres         |
| description       | string  | ❌          | Máx 500 caracteres       |
| price             | number  | ✅          | 0 - 100.000              |
| sessions_included | number  | ✅          | 1 - 100 sessões          |
| validity_days     | number  | ✅          | 1 - 365 dias             |
| barbershop_id     | UUID    | ✅          | UUID válido              |
| is_active         | boolean | ❌          | Default: true            |

---

## Funções Utilitárias

### validateWithSchema

Valida dados contra um schema Zod e retorna resultado tipado.

```typescript
import { validateWithSchema, loginSchema } from '@/lib/validation-schemas';

const result = validateWithSchema(loginSchema, data);

if (result.success) {
  // result.data está tipado e validado
  console.log(result.data.email);
} else {
  // result.errors contém lista de erros
  console.log(result.errors);
}
```

### formatValidationErrors

Formata erros de validação para exibição em toast.

```typescript
import { formatValidationErrors } from '@/lib/validation-schemas';

if (!result.success) {
  toast({
    title: 'Erro de validação',
    description: formatValidationErrors(result.errors),
    variant: 'destructive'
  });
}
```

### sanitizeString

Remove caracteres perigosos de strings para prevenir XSS.

```typescript
import { sanitizeString } from '@/lib/validation-schemas';

const safeName = sanitizeString(userInput);
// Remove: < > javascript: on*=
```

---

## Padrões Regex

```typescript
PATTERNS = {
  phone: /^[\d\s()+-]{8,20}$/,
  cep: /^\d{5}-?\d{3}$/,
  cpf: /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/,
  cnpj: /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^\d{2}:\d{2}(:\d{2})?$/,
  url: /^https?:\/\/.+/,
}
```

---

## Camadas de Validação

O sistema implementa **defesa em profundidade** com múltiplas camadas:

1. **Frontend (Componentes)**
   - Validação em tempo real
   - Feedback imediato ao usuário
   - Mensagens em português

2. **Services Layer**
   - Validação antes de chamadas ao banco
   - Sanitização de dados
   - Logging de erros

3. **Database (RLS)**
   - Validação final via RLS policies
   - Proteção contra bypass de frontend

---

## Mensagens de Erro

Todas as mensagens são em português brasileiro:

```typescript
ERROR_MESSAGES = {
  required: 'Campo obrigatório',
  invalidEmail: 'Email inválido',
  invalidPhone: 'Telefone inválido',
  invalidDate: 'Data inválida (formato: YYYY-MM-DD)',
  invalidTime: 'Horário inválido (formato: HH:MM)',
  invalidUuid: 'ID inválido',
  invalidUrl: 'URL inválida',
  nameMin: 'Nome deve ter pelo menos 2 caracteres',
  nameMax: 'Nome deve ter no máximo 100 caracteres',
  passwordMin: 'Senha deve ter pelo menos 6 caracteres',
  passwordsDoNotMatch: 'As senhas não conferem',
  priceMin: 'Preço não pode ser negativo',
  ratingMin: 'Avaliação mínima é 1 estrela',
  ratingMax: 'Avaliação máxima é 5 estrelas',
}
```

---

## Checklist de Validação por Formulário

### ✅ Implementados

| Formulário           | Schema                    | Sanitização | Arquivo                          |
|---------------------|---------------------------|-------------|----------------------------------|
| Login               | loginSchema               | ✅          | src/pages/Auth.tsx               |
| Cadastro            | signUpSchema              | ✅          | src/pages/Auth.tsx               |
| Perfil              | profileUpdateSchema       | ✅          | src/pages/Profile.tsx            |
| Criar Barbearia     | barbershopCreateSchema    | ✅          | src/components/BarbershopSetup.tsx |
| Editar Barbearia    | barbershopCreateSchema    | ✅          | src/components/BarbershopEdit.tsx |
| Criar Serviço       | serviceFormSchema         | ✅          | src/components/ServiceForm.tsx   |
| Criar Produto       | productFormSchema         | ✅          | src/components/ProductForm.tsx   |
| Avaliação           | reviewCreateSchema        | ✅          | src/components/ReviewsSection.tsx |
| Agendamento (API)   | createBookingSchema       | ✅          | src/services/booking.service.ts  |
| Auth (API)          | signUpSchema/signInSchema | ✅          | src/services/auth.service.ts     |
| Barbeiro (API)      | createBarberSchema        | ✅          | src/services/barber.service.ts   |

---

## Como Adicionar Validação a Novos Formulários

1. **Defina o schema em `src/lib/validation-schemas.ts`**:
```typescript
export const myFormSchema = z.object({
  field1: nameSchema,
  field2: emailSchema,
  // ...
});
```

2. **Importe e use no componente**:
```typescript
import { myFormSchema, validateWithSchema, formatValidationErrors, sanitizeString } from '@/lib/validation-schemas';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Sanitizar
  const sanitizedData = {
    field1: sanitizeString(formData.field1),
    field2: formData.field2.trim().toLowerCase(),
  };
  
  // Validar
  const validation = validateWithSchema(myFormSchema, sanitizedData);
  if (!validation.success) {
    toast({
      title: 'Erro de validação',
      description: formatValidationErrors(validation.errors),
      variant: 'destructive'
    });
    return;
  }
  
  // Usar validation.data (dados validados e tipados)
  await saveData(validation.data);
};
```

---

## Última Atualização

Data: 2026-01-05
Versão: 1.0.0
