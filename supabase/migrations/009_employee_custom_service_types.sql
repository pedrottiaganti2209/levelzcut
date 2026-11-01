-- Migration 009: Serviços personalizados por barbeiro (sobrancelha, pezinho,
-- depilação nariz, orelha, etc.) no app employee
--
-- ATENÇÃO — LEIA ANTES DE EXECUTAR:
-- Este arquivo é APENAS gerado, ele NÃO foi (e não deve ser) executado
-- automaticamente contra nenhum banco Supabase. Rode no SQL Editor do
-- projeto da BARBEARIA (onde employee_prices/employee_daily_entries vivem
-- desde a migration 008) — confirme com a query abaixo ANTES de colar
-- qualquer coisa que grava dado, igual fizemos na migração do Marcelo:
--
--   select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
--
-- Precisa aparecer employee_prices e employee_daily_entries na lista.
--
-- CONTEXTO: até aqui, cada barbeiro só podia ter 4 tipos de serviço fixos
-- (cabelo, combo, barba, premium) — travado por um CHECK em
-- employee_prices.service_type, e por employee_daily_entries ter uma
-- COLUNA PRÓPRIA pra cada um desses 4 tipos. Pra deixar o barbeiro
-- cadastrar serviços novos (sobrancelha, pezinho, depilação nariz,
-- orelha, o que for), employee_prices vira o catálogo de serviços de cada
-- barbeiro (com nome, emoji, cor, ordem — não só preço), e
-- employee_daily_entries passa a guardar as quantidades do dia num campo
-- `counts` (JSONB, chave = tipo de serviço) em vez de uma coluna por tipo
-- — mesmo padrão que `cuts_data.daily_cuts` já usa no projeto da
-- barbearia, então não é um padrão novo por aqui.
--
-- SEGURANÇA DOS DADOS JÁ MIGRADOS (os 128 lançamentos + 4 preços do
-- Marcelo, migration 008):
--   - As 4 colunas antigas de employee_daily_entries (cabelo, combo,
--     barba, premium) NÃO são apagadas nesta migration — ficam ali,
--     paradas, como cópia de segurança. Dá pra remover numa migration
--     futura, depois de confirmar que o app novo está 100% em produção.
--   - O `counts` de cada linha existente é preenchido a partir dessas 4
--     colunas (passo 2 abaixo) — ninguém perde histórico.
--   - employee_prices ganha colunas novas (não perde nenhuma linha).
--
-- 100% aditivo + idempotente: pode rodar mais de uma vez sem duplicar
-- nada (usa IF NOT EXISTS / ON CONFLICT / DO blocks que checam o estado
-- atual antes de agir).

-- ─── 1. employee_prices vira o catálogo de serviços ───────────────────────

ALTER TABLE employee_prices
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS emoji TEXT NOT NULL DEFAULT '✂️',
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#D4AF37',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Preenche label/emoji/cor/ordem/is_core pros 4 tipos que já existem hoje,
-- pra TODO barbeiro (não só o Marcelo) — mesmos valores que estavam
-- hardcoded no front (src/types/index.ts do app employee). Só mexe nas
-- linhas que ainda não têm label (idempotente: rodar de novo não sobrescreve
-- um label que o barbeiro já tenha personalizado por conta própria).
UPDATE employee_prices SET
  label = 'Cabelo', emoji = '✂️', color = '#D4AF37', sort_order = 0, is_core = true
WHERE service_type = 'cabelo' AND label IS NULL;

UPDATE employee_prices SET
  label = 'Combo', emoji = '🔥', color = '#f97316', sort_order = 1, is_core = true
WHERE service_type = 'combo' AND label IS NULL;

UPDATE employee_prices SET
  label = 'Barba', emoji = '🧔', color = '#60a5fa', sort_order = 2, is_core = true
WHERE service_type = 'barba' AND label IS NULL;

UPDATE employee_prices SET
  label = 'Premium', emoji = '⭐', color = '#a855f7', sort_order = 3, is_core = true
WHERE service_type = 'premium' AND label IS NULL;

-- Qualquer linha que sobrou sem label (não deveria, mas por segurança —
-- ex.: um service_type que não é um dos 4 originais) usa o próprio
-- service_type como label, pra nunca ficar com label NULL depois daqui.
UPDATE employee_prices SET label = service_type WHERE label IS NULL;

ALTER TABLE employee_prices ALTER COLUMN label SET NOT NULL;

-- Remove o CHECK que travava service_type nos 4 valores fixos — acha o
-- nome real da constraint em vez de chutar (Postgres gera o nome
-- automaticamente), pra não depender de adivinhar certo.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'employee_prices'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%service_type%IN%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE employee_prices DROP CONSTRAINT %I', cname);
  END IF;
END $$;

-- ─── 2. employee_daily_entries ganha `counts` (JSONB) ─────────────────────

ALTER TABLE employee_daily_entries
  ADD COLUMN IF NOT EXISTS counts JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE employee_daily_entries
  DROP CONSTRAINT IF EXISTS counts_is_object;
ALTER TABLE employee_daily_entries
  ADD CONSTRAINT counts_is_object CHECK (jsonb_typeof(counts) = 'object');

-- Preenche `counts` a partir das 4 colunas antigas, só pra linhas que
-- ainda estão com counts vazio (idempotente — não sobrescreve counts que
-- já tenha sido editado pelo app novo).
UPDATE employee_daily_entries
SET counts = jsonb_strip_nulls(jsonb_build_object(
  'cabelo', NULLIF(cabelo, 0),
  'combo', NULLIF(combo, 0),
  'barba', NULLIF(barba, 0),
  'premium', NULLIF(premium, 0)
))
WHERE counts = '{}'::jsonb;

-- ─── Verificação (rode depois de aplicar) ─────────────────────────────────
--   select service_type, label, emoji, color, sort_order, is_core, price
--   from employee_prices order by user_id, sort_order;
--
--   select year, month, day, counts, cabelo, combo, barba, premium
--   from employee_daily_entries order by user_id, year, month, day;
--   (counts precisa bater com as 4 colunas antigas pra cada linha)
