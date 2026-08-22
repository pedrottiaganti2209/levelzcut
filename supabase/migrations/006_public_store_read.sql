-- Migration 006: Leitura pública de `stores` enquanto login não é obrigatório
--
-- ATENÇÃO — LEIA ANTES DE EXECUTAR:
-- Este arquivo é APENAS gerado, ele NÃO foi (e não deve ser) executado
-- automaticamente contra nenhum banco Supabase.
--
-- SINTOMA que motivou esta migration: lojas criadas pelo painel de
-- Administração não apareciam no app de barbeiro (`levelzcut`). Causa: a
-- policy de SELECT em `stores` (migration 003) exige `auth.uid() IS NOT
-- NULL`, mas o app de barbeiro ainda roda sem login (`VITE_REQUIRE_AUTH`
-- desligado) — então toda leitura de `stores` voltava com 0 linhas, e
-- `fetchStores()` (src/lib/stores.ts) caía no fallback fixo do código
-- (só "Moema", em src/types/index.ts).
--
-- NÃO é uma regressão de segurança: `cuts_data` — os dados que realmente
-- importa proteger (faturamento) — já é público hoje mesmo (policy
-- "Allow all for anon", USING (true), do schema original) até o login
-- ser ativado de propósito (ver README, "Ativando o login em produção").
-- Nome/id de loja sozinho não é dado sensível. Quando `VITE_REQUIRE_AUTH`
-- for ativado de vez, esta policy pode continuar assim sem problema — o
-- que protege os dados de verdade é a migration 004 em `cuts_data`, não
-- a listagem de nomes de loja.
--
-- Pode rodar a qualquer momento depois da migration 003.

DROP POLICY IF EXISTS "stores: leitura para autenticados" ON stores;

CREATE POLICY "stores: leitura pública" ON stores
  FOR SELECT USING (true);
