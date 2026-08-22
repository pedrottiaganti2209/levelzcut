-- Migration 002: Require authentication to read/write cuts_data
--
-- ATENÇÃO — LEIA ANTES DE EXECUTAR:
-- Este arquivo é APENAS gerado, ele NÃO foi (e não deve ser) executado
-- automaticamente contra nenhum banco Supabase.
--
-- Só rode este SQL manualmente no SQL Editor do Supabase DEPOIS de:
--   1. Ter criado ao menos um usuário em Authentication → Users;
--   2. Ter confirmado que o login funciona em produção (o app já faz
--      deploy com autenticação e você consegue entrar com esse usuário);
--   3. Ter configurado recovery de senha por email, para não correr o
--      risco de ficar sem acesso à conta depois que a policy anônima
--      for removida.
--
-- Esta migration é aditiva/incremental: ela troca apenas a POLICY de
-- RLS da tabela cuts_data. Ela NÃO apaga, trunca ou recria a tabela,
-- e não afeta nenhuma linha de dado existente.

DROP POLICY IF EXISTS "Allow all for anon" ON cuts_data;

CREATE POLICY "Require authenticated user" ON cuts_data
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
