-- Migration 007: preço médio por corte, por loja (H21)
--
-- ATENÇÃO — LEIA ANTES DE EXECUTAR:
-- Este arquivo é APENAS gerado, ele NÃO foi (e não deve ser) executado
-- automaticamente contra nenhum banco Supabase.
--
-- Renumerada de 006 pra 007: a numeração 006 já foi usada nesta mesma
-- squad pra outra migration (006_public_store_read.sql, correção de RLS
-- de leitura pública em `stores`) — ver esse arquivo se `stores` ainda
-- não tiver essa policy aplicada, ela é pré-requisito de UX (sem ela, o
-- app de barbeiro não lista lojas), mas não é pré-requisito técnico desta
-- migration em si.
--
-- 100% aditiva: só acrescenta uma coluna nullable em `stores`. Loja sem
-- preço cadastrado continua se comportando exatamente como hoje em
-- qualquer tela que já exista. Não roda sozinha — copiar no SQL Editor
-- do Supabase e executar manualmente, como todas as migrations deste
-- projeto.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS price_per_cut NUMERIC(10,2);

COMMENT ON COLUMN stores.price_per_cut IS
  'Preço médio cobrado por corte nesta loja (R$). NULL = não cadastrado; '
  'telas que dependem deste valor devem cair para exibir só contagem de '
  'cortes, nunca travar ou mostrar R$ 0,00 como se fosse um valor real.';

-- Nenhuma policy nova é necessária: `stores` já tem RLS (migration 003)
-- com "escrita só admin" — a coluna nova herda as mesmas regras da
-- tabela.
