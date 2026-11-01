-- Migration 010: Corrige a remoção do CHECK antigo de employee_prices
-- (a migration 009 não conseguiu removê-lo de verdade)
--
-- ATENÇÃO — LEIA ANTES DE EXECUTAR:
-- Este arquivo é APENAS gerado, ele NÃO foi (e não deve ser) executado
-- automaticamente contra nenhum banco Supabase. Rode no SQL Editor do
-- projeto da BARBEARIA — confirme primeiro:
--
--   select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
--
-- BUG que motivou esta migration: a migration 009 tentava achar o nome do
-- CHECK constraint antigo de employee_prices.service_type procurando a
-- substring "IN" no texto da definição (pg_get_constraintdef). Só que o
-- Postgres reescreve internamente `x IN (a,b,c)` como
-- `x = ANY (ARRAY['a','b','c'])` quando devolve essa definição — então a
-- busca nunca encontrava o constraint, ele nunca era removido, e
-- cadastrar um serviço novo (ex.: "sobrancelha") continuava sendo
-- rejeitado pelo banco. O app revertia isso em silêncio (bug duplo,
-- corrigido também no código: agora mostra erro na tela em vez de sumir
-- sem avisar).
--
-- Esta migration acha e remove esse constraint de um jeito que funciona
-- com qualquer uma das duas formas de representação (busca por um valor
-- real, 'cabelo', em vez de pela palavra "IN"), e também tenta pelo nome
-- padrão mais provável, por garantia. 100% idempotente — pode rodar
-- quantas vezes quiser.

DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'employee_prices'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%cabelo%'
  LOOP
    EXECUTE format('ALTER TABLE employee_prices DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

-- Por garantia extra, tenta também pelo nome padrão que o Postgres dá a
-- um CHECK de coluna sem nome explícito (<tabela>_<coluna>_check) — não
-- faz nada se já tiver sido removido acima ou nunca tiver existido com
-- esse nome.
ALTER TABLE employee_prices DROP CONSTRAINT IF EXISTS employee_prices_service_type_check;

-- ─── Verificação (rode depois de aplicar) ─────────────────────────────────
-- Não deve sobrar NENHUM check constraint envolvendo service_type:
--
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'employee_prices'::regclass and contype = 'c';
--
-- E este insert de teste precisa funcionar sem erro (apaga a linha de
-- teste em seguida, não deixa lixo pra trás):
--
--   insert into employee_prices (user_id, service_type, label, emoji, color, price)
--   values ((select id from auth.users limit 1), 'teste_migration_010', 'Teste', '🧪', '#ffffff', 0);
--
--   delete from employee_prices where service_type = 'teste_migration_010';
