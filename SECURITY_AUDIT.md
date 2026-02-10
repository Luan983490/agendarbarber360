# 🔒 Auditoria de Segurança - RLS Policies

**Data da Auditoria:** 2026-01-05  
**Última Atualização:** 2026-02-10  
**Total de Tabelas:** 27+  
**Status Geral:** ✅ HARDENED - Todas as 20 ações de segurança aplicadas

---

## 📊 Resumo Executivo

| Status | Quantidade | Descrição |
|--------|------------|-----------|
| ✅ RLS Habilitado | 100% | Todas as tabelas (incluindo audit tables) |
| ✅ WITH CHECK | 100% | Todas as políticas ALL/INSERT/UPDATE |
| ✅ Audit Triggers | 18 tabelas | generic_audit_trigger() em app_logs |
| ✅ Soft Delete | 12 tabelas | Coluna deleted_at adicionada |
| ✅ CHECK Constraints | 11 novos | Validação de dados no banco |
| ✅ search_path | 100% | Todas as funções com search_path = public |

---

## 🛡️ Ações Aplicadas (2026-02-10)

### 1️⃣ Isolamento de Tenant ✅
- Todas as políticas RLS verificam ownership via `auth.uid()`
- Clientes nunca veem dados de outros clientes

### 2️⃣ Ownership ✅
- UPDATE/DELETE restritos ao próprio usuário em todas as tabelas
- `USING (auth.uid() = user_id)` ou via barbershop ownership

### 3️⃣ Default Deny ✅
- RLS habilitado em TODAS as tabelas (37/37)
- `barbershops_audit` e `favorites_audit` corrigidos (estavam sem RLS)
- `profiles_backup` com policy explícita de negação

### 4️⃣ Imutabilidade (Soft Delete) ✅
Tabelas com `deleted_at` adicionado:
- `barbers`, `barbershops`, `bookings`, `services`, `products`
- `packages`, `reviews`, `payment_cards`, `client_packages`
- `client_subscriptions`, `loyalty_rewards`, `subscription_plans`
- Trigger `trg_soft_delete_bookings` impede DELETE direto em bookings

### 5️⃣ Rastreamento (Audit Triggers) ✅
Função `generic_audit_trigger()` aplicada em 18 tabelas:
- barber_blocks, barber_schedule_overrides, barber_working_hours
- packages, products, payment_cards, reviews
- loyalty_rewards, loyalty_settings, loyalty_transactions
- client_loyalty_points, client_packages, client_subscriptions
- subscription_plans, subscriptions, report_alerts
- mfa_recovery_codes, blocked_ips

### 6️⃣ Validação no Banco (CHECK Constraints) ✅
Novos constraints adicionados:
| Tabela | Constraint | Regra |
|--------|-----------|-------|
| barbers | check_barber_name_not_empty | `length(trim(name)) > 0` |
| services | check_service_name_not_empty | `length(trim(name)) > 0` |
| products | check_product_name_not_empty | `length(trim(name)) > 0` |
| packages | check_package_name_not_empty | `length(trim(name)) > 0` |
| barber_blocks | check_block_time_order | `start_time < end_time` |
| loyalty_transactions | check_loyalty_points_nonzero | `points != 0` |
| report_alerts | check_alert_type_not_empty | `length(trim(alert_type)) > 0` |
| report_alerts | check_threshold_non_negative | `threshold >= 0` |
| payment_cards | check_card_last_four | `length(last_four_digits) = 4` |
| payment_cards | check_expiry_month_valid | `BETWEEN 1 AND 12` |
| payment_cards | check_expiry_year_valid | `>= 2024` |

### 1️⃣4️⃣ RLS Habilitado ✅
- 100% das tabelas com RLS habilitado
- Sem exceções

### 1️⃣5️⃣ Políticas WITH CHECK ✅
Corrigidas 15+ políticas que tinham WITH CHECK ausente:
- barber_blocks, barber_schedule_overrides, barber_services
- barber_working_hours, loyalty_rewards, loyalty_settings
- packages, products, services, subscription_plans
- payment_cards, reviews, report_alerts, mfa_recovery_codes
- mfa_attempts (removido WITH CHECK (true))

### 1️⃣7️⃣ Evitar Políticas Permissivas ✅
- `mfa_attempts`: `WITH CHECK (true)` → `WITH CHECK (auth.uid() = user_id)`
- Todas as políticas auditadas e especificadas

### 1️⃣8️⃣ Security Definer Functions ✅
- `generic_audit_trigger()` — SECURITY DEFINER com `search_path = public`
- `soft_delete_instead()` — SECURITY DEFINER com `search_path = public`
- Todas as 33 funções públicas com `search_path = public` definido

### 📁 Storage RLS ✅
Buckets existentes com políticas adequadas:
- `barber-images`: SELECT público, INSERT/UPDATE/DELETE via owner
- `barbershop-images`: SELECT público, INSERT/UPDATE/DELETE via owner

### 🔧 Correções Adicionais ✅
- `booking_products`: Adicionada policy INSERT faltante
- `app_logs`: Adicionada policy INSERT para audit triggers

---

## ⚠️ Ações Pendentes do Usuário

| Alerta | Ação Necessária |
|--------|-----------------|
| Leaked Password Protection | [Habilitar em Auth Settings](https://supabase.com/dashboard/project/ppmiandwpebzsfqqhhws/auth/providers) |
| Security Definer View | `vw_mfa_status` usa SECURITY DEFINER (intencional para MFA) |

---

## 📝 Histórico de Alterações

| Data | Alteração | Responsável |
|------|-----------|-------------|
| 2026-01-05 | Auditoria inicial | Sistema |
| 2026-02-10 | Hardening completo: RLS em audit tables, WITH CHECK em todas políticas, soft delete, audit triggers, CHECK constraints, search_path em todas funções | Sistema |

---

*Este documento deve ser atualizado a cada alteração nas RLS policies.*
