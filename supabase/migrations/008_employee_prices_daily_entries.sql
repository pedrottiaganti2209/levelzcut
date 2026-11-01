-- Migration 008: Tabelas do app "employee" (preço por corte e lançamento
-- diário por barbeiro), trazidas pra dentro deste projeto Supabase
--
-- ATENÇÃO — LEIA ANTES DE EXECUTAR:
-- Este arquivo é APENAS gerado, ele NÃO foi (e não deve ser) executado
-- automaticamente contra nenhum banco Supabase.
--
-- CONTEXTO: o app "employee" (trimnex-employee.onrender.com) roda hoje
-- num projeto Supabase separado do projeto deste repositório ("barbearia").
-- O plano Supabase free só permite 2 projetos, e a conta está com 3 — este
-- arquivo é o primeiro passo pra unificar os dois projetos, mantendo ESTE
-- (o da barbearia) como definitivo e aposentando o do employee depois.
--
-- 100% aditiva: cria 2 tabelas novas (employee_prices,
-- employee_daily_entries), idênticas ao schema do projeto antigo
-- (supabase/schema.sql daquele app). NÃO altera nada em cuts_data, stores,
-- profiles ou barber_stores. Pode rodar a qualquer momento, independente
-- das migrations 003-007 já terem sido aplicadas ou não.
--
-- O QUE ESTA MIGRATION NÃO FAZ (passos manuais separados, fora do SQL):
--   1. Não recria as contas de auth dos barbeiros do employee — Auth do
--      Supabase não permite copiar usuários (nem senha) entre projetos.
--      Pra cada barbeiro real do employee, cadastre-o de novo neste
--      projeto pelo painel de Administração (aba Barbeiros), igual foi
--      feito pro Marcelo — isso gera um UUID NOVO pra cada um.
--   2. Não copia as linhas de dado do projeto antigo. Depois do passo 1,
--      exporte `select * from employee_prices` e
--      `select * from employee_daily_entries` do projeto antigo (SQL
--      Editor → Download CSV), troque a coluna user_id de cada linha pelo
--      UUID NOVO do mesmo e-mail (criado no passo 1), e insira aqui.
--   3. Não aponta o app employee pra este projeto — isso é feito trocando
--      VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do serviço
--      trimnex-employee no Render pelas credenciais deste projeto.
--   4. Não apaga nem pausa o projeto antigo — só faça isso depois de
--      confirmar que todo barbeiro já conseguiu logar aqui com os dados
--      certos.

CREATE TABLE IF NOT EXISTS employee_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('cabelo', 'combo', 'barba', 'premium')),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_type)
);

CREATE TABLE IF NOT EXISTS employee_daily_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  cabelo INTEGER NOT NULL DEFAULT 0,
  combo INTEGER NOT NULL DEFAULT 0,
  barba INTEGER NOT NULL DEFAULT 0,
  premium INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month, day)
);

ALTER TABLE employee_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_daily_entries ENABLE ROW LEVEL SECURITY;

-- Mesma regra do projeto antigo: cada barbeiro só vê/edita as próprias
-- linhas. Diferente de cuts_data (por loja) — aqui é por usuário, porque é
-- comissão individual. Admin deste projeto (is_admin(), migration 003) não
-- ganha acesso ampliado aqui de propósito — se precisar disso depois, é
-- uma migration nova, não algo pra decidir de improviso nesta migração.
CREATE POLICY "employee_prices_self"
  ON employee_prices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "employee_daily_entries_self"
  ON employee_daily_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE employee_prices
  ADD CONSTRAINT valid_price CHECK (price >= 0 AND price <= 9999.99);

ALTER TABLE employee_daily_entries
  ADD CONSTRAINT valid_counts CHECK (
    cabelo >= 0 AND cabelo <= 999 AND
    combo  >= 0 AND combo  <= 999 AND
    barba  >= 0 AND barba  <= 999 AND
    premium >= 0 AND premium <= 999
  );
