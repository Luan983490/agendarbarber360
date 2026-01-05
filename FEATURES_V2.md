# 🚀 Barber360 - Features v2.0 (Pós-Validação MVP)

**Data de Desativação:** 15/12/2024  
**Critério de Reativação:** 10+ barbearias ativas usando o MVP

---

## 📋 Resumo

Este documento lista todas as features temporariamente removidas do MVP para focar na validação do core do produto (agendamentos).

---

## ✅ Features ATIVAS no MVP v1.0

| Feature | Descrição | Componentes |
|---------|-----------|-------------|
| **Dashboard** | Visão geral simplificada | `Dashboard.tsx` |
| **Agenda** | Calendário visual de agendamentos | `BarberScheduleCalendar.tsx` |
| **Bloqueios** | Bloqueio/desbloqueio de horários | `BlockTimeDialog.tsx`, `BlockOptionsDialog.tsx` |
| **Cadastro de Serviços** | CRUD de serviços da barbearia | `ServiceForm.tsx` |
| **Cadastro de Barbeiros** | CRUD de barbeiros | `BarberForm.tsx` |
| **Configurações** | Edição da barbearia | `BarbershopEdit.tsx` |

### Sistema de Bloqueios de Horários

O sistema de bloqueios permite gerenciar a disponibilidade dos barbeiros:

#### Funcionalidades de Bloqueio
- **Horário específico**: Bloqueia um único slot de 15 minutos
- **Dia inteiro**: Bloqueia todos os horários de trabalho de um dia (criado como um único bloco contínuo)
- **Semana inteira**: Bloqueia todos os dias da semana
- **Período personalizado**: Bloqueia um intervalo de datas selecionado

#### Funcionalidades de Desbloqueio
- **Horário específico**: Desbloqueia apenas o slot selecionado
- **Dia inteiro**: Desbloqueia todos os bloqueios do dia de uma vez
- Interface intuitiva: ao clicar em um horário bloqueado, o usuário escolhe se quer desbloquear apenas aquele slot ou o dia todo

#### Implementação Técnica
- **Service Layer**: `barberService.createBlock()`, `barberService.createFullDayBlock()`, `barberService.deleteBlock()`, `barberService.deleteBlocks()`, `barberService.deleteBlocksByDate()`
- **Hooks**: `useCreateBarberBlock`, `useCreateFullDayBlock`, `useDeleteBarberBlock`, `useDeleteBarberBlocks`, `useDeleteBlocksByDate`
- **Tabela**: `barber_blocks` (barber_id, block_date, start_time, end_time, reason)
- **Índices**: `idx_barber_blocks_barber_date_time` para performance

---

## 🔒 Features DESATIVADAS (v2.0)

### 1. Produtos (E-commerce)
- **Descrição:** Venda de produtos da barbearia
- **Componentes:**
  - `src/components/ProductForm.tsx`
- **Tabelas DB:**
  - `products`
  - `booking_products`
- **Status:** Código preservado com header de desativação

### 2. Pacotes (Combos de Serviços)
- **Descrição:** Pacotes de sessões com desconto
- **Componentes:**
  - `src/components/PackagesManagement.tsx`
- **Tabelas DB:**
  - `packages`
  - `client_packages`
- **Status:** Código preservado com header de desativação

### 3. Assinaturas (Planos Recorrentes)
- **Descrição:** Planos mensais para clientes
- **Componentes:**
  - `src/components/SubscriptionsManagement.tsx`
  - `src/pages/Subscriptions.tsx`
- **Tabelas DB:**
  - `subscription_plans`
  - `client_subscriptions`
- **Status:** Código preservado com header de desativação

### 4. Fidelidade (Programa de Pontos)
- **Descrição:** Sistema de acúmulo e resgate de pontos
- **Componentes:**
  - `src/components/LoyaltyManagement.tsx`
- **Tabelas DB:**
  - `loyalty_settings`
  - `loyalty_rewards`
  - `loyalty_transactions`
  - `client_loyalty_points`
- **Status:** Código preservado com header de desativação

### 5. Funcionários (Gestão de Equipe)
- **Descrição:** Cadastro de atendentes e gestão de permissões
- **Componentes:**
  - `src/components/StaffManagement.tsx`
- **Tabelas DB:**
  - `user_roles`
- **Status:** Código preservado com header de desativação

### 6. Comandas (Sistema PDV)
- **Descrição:** Gestão de comandas e fechamento
- **Componentes:**
  - `src/components/ViewComandaDialog.tsx`
  - `src/components/ScheduleManagement.tsx`
- **Tabelas DB:** Usa tabela `bookings`
- **Status:** Código preservado com header de desativação

### 7. Financeiro
- **Descrição:** Gestão financeira completa (receitas, despesas, fluxo de caixa)
- **Componentes:** A desenvolver na v2.0
- **Tabelas DB:** A criar na v2.0
- **Status:** Menu removido

### 8. Relatórios
- **Descrição:** Analytics e relatórios avançados
- **Componentes:** A desenvolver na v2.0
- **Tabelas DB:** Views a criar na v2.0
- **Status:** Menu removido

---

## 📁 Estrutura de Arquivos Desativados

```
src/components/
├── ProductForm.tsx           # [DESATIVADO v2.0]
├── PackagesManagement.tsx    # [DESATIVADO v2.0]
├── SubscriptionsManagement.tsx # [DESATIVADO v2.0]
├── LoyaltyManagement.tsx     # [DESATIVADO v2.0]
├── StaffManagement.tsx       # [DESATIVADO v2.0]
├── ViewComandaDialog.tsx     # [DESATIVADO v2.0]
└── ScheduleManagement.tsx    # [DESATIVADO v2.0]

src/pages/
└── Subscriptions.tsx         # [DESATIVADO v2.0]
```

---

## 🗄️ Tabelas do Banco (Preservadas)

As seguintes tabelas NÃO foram removidas e estão prontas para uso na v2.0:

- `products` - Produtos para venda
- `booking_products` - Produtos vinculados a agendamentos
- `packages` - Definição de pacotes
- `client_packages` - Pacotes adquiridos por clientes
- `subscription_plans` - Planos de assinatura
- `client_subscriptions` - Assinaturas ativas de clientes
- `loyalty_settings` - Configurações do programa de fidelidade
- `loyalty_rewards` - Recompensas disponíveis
- `loyalty_transactions` - Histórico de pontos
- `client_loyalty_points` - Saldo de pontos por cliente
- `user_roles` - Permissões de funcionários

---

## ✅ Checklist de Reativação

### Pré-requisitos
- [ ] 10+ barbearias ativas no MVP
- [ ] Feedback coletado sobre funcionalidades desejadas
- [ ] Priorização das features baseada em demanda

### Para cada feature:

#### Produtos
- [ ] Descomentar menu em `DashboardSidebar.tsx`
- [ ] Remover header de desativação de `ProductForm.tsx`
- [ ] Testar CRUD completo
- [ ] Verificar integração com comandas

#### Pacotes
- [ ] Descomentar menu em `DashboardSidebar.tsx`
- [ ] Remover header de desativação de `PackagesManagement.tsx`
- [ ] Testar fluxo de compra de pacotes
- [ ] Verificar uso de sessões em agendamentos

#### Assinaturas
- [ ] Descomentar menu em `DashboardSidebar.tsx`
- [ ] Remover header de desativação de `SubscriptionsManagement.tsx`
- [ ] Implementar cobrança recorrente (Stripe?)
- [ ] Testar fluxo completo

#### Fidelidade
- [ ] Descomentar menu em `DashboardSidebar.tsx`
- [ ] Remover header de desativação de `LoyaltyManagement.tsx`
- [ ] Testar acúmulo automático de pontos
- [ ] Testar resgate de recompensas

#### Funcionários
- [ ] Descomentar menu em `DashboardSidebar.tsx`
- [ ] Remover header de desativação de `StaffManagement.tsx`
- [ ] Testar criação de contas
- [ ] Verificar permissões por role

#### Comandas
- [ ] Descomentar menu em `DashboardSidebar.tsx`
- [ ] Remover header de desativação dos componentes
- [ ] Testar fechamento de comandas
- [ ] Integrar com formas de pagamento

#### Financeiro
- [ ] Desenvolver componentes
- [ ] Criar tabelas necessárias
- [ ] Implementar fluxo de caixa

#### Relatórios
- [ ] Desenvolver dashboards
- [ ] Criar views de agregação
- [ ] Implementar exportação

---

## 📝 Notas

- **NÃO DELETE** nenhum arquivo ou tabela listados aqui
- Todos os arquivos contêm headers identificando a desativação
- O menu lateral em `DashboardSidebar.tsx` contém todos os itens comentados
- As RLS policies das tabelas estão ativas e funcionais

---

**Última atualização:** 15/12/2024
