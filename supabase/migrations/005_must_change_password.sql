-- Migration 005: Senha temporária obrigatória no primeiro login (H10)
--
-- ATENÇÃO — LEIA ANTES DE EXECUTAR:
-- Este arquivo é APENAS gerado, ele NÃO foi (e não deve ser) executado
-- automaticamente contra nenhum banco Supabase.
--
-- Aditiva: adiciona uma coluna em `profiles`. Não apaga nem altera
-- nenhuma outra tabela. Pode rodar a qualquer momento depois da
-- migration 003 (não depende de 004).
--
-- Contexto: a partir do H10, cadastrar um barbeiro pelo painel de
-- Administração passa a criar a conta já com uma senha temporária
-- (gerada pela Edge Function `admin-barbers`, ação `create_barber`),
-- em vez de mandar um email de convite. Essa coluna marca que a pessoa
-- ainda precisa trocar essa senha temporária por uma própria — o app
-- bloqueia o dashboard até isso acontecer (ver `ChangePassword.tsx`).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true;

-- IMPORTANTE: sem este UPDATE, qualquer `profiles` já existente (o admin
-- do bootstrap, ou barbeiros convidados pelo fluxo antigo de email do H8)
-- herdaria o DEFAULT true e seria barrado no próximo login, sem nunca ter
-- recebido senha temporária nenhuma. Isso zera a flag pra quem já existe
-- hoje — só contas criadas a partir de agora, via `create_barber`, nascem
-- com a flag ligada de propósito.
UPDATE profiles SET must_change_password = false;
