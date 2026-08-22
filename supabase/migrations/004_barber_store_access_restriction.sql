-- Migration 004: Restringe cuts_data por loja do barbeiro (H9)
--
-- ATENÇÃO — LEIA ANTES DE EXECUTAR:
-- Este arquivo é APENAS gerado, ele NÃO foi (e não deve ser) executado
-- automaticamente contra nenhum banco Supabase.
--
-- Esta é a migration MAIS sensível até agora: ela troca a policy de RLS de
-- `cuts_data` — a tabela com os dados de faturamento de verdade — por uma
-- que restringe leitura/escrita por loja, usando o vínculo cadastrado em
-- `barber_stores` (migration 003). Admin continua vendo tudo; um barbeiro
-- só vê as lojas que foram liberadas pra ele no painel de Administração.
--
-- PRÉ-REQUISITOS (nessa ordem, sem pular nenhum):
--   1. A migration 003_stores_roles_barber_access.sql já foi aplicada
--      (precisa de `is_admin()` e da tabela `barber_stores`).
--   2. O bootstrap do primeiro admin já foi feito.
--   3. TODO barbeiro que hoje usa o painel já foi convidado/cadastrado e
--      já tem pelo menos uma loja liberada pra ele em
--      Administração → Barbeiros → Editar acesso.
--   4. Login (VITE_REQUIRE_AUTH=true) já foi testado em produção e a
--      equipe já foi avisada — mesma ordem de sempre, ver README.
--
-- Pule o passo 3 e alguém fica bloqueado de ver os próprios dados assim
-- que esta migration rodar — não é destrutivo (nenhuma linha de dado é
-- apagada), mas a pessoa fica sem enxergar nada até um admin liberar o
-- acesso dela. RODE A QUERY DE VERIFICAÇÃO ABAIXO ANTES de aplicar.

-- ─── Verificação antes de aplicar (rode e leia o resultado primeiro) ──────
-- Lista qualquer usuário autenticado que NÃO é admin e NÃO tem nenhuma
-- loja liberada em barber_stores — cada linha aqui é alguém que ficaria
-- sem acesso a nada assim que esta migration for aplicada.
--
--   select au.id, au.email
--   from auth.users au
--   left join profiles p on p.user_id = au.id
--   left join barber_stores bs on bs.user_id = au.id
--   where coalesce(p.role, 'barbeiro') <> 'admin'
--     and bs.user_id is null;
--
-- Resultado vazio = seguro pra prosseguir. Se aparecer alguém, libere o
-- acesso dessa pessoa pelo painel de Administração antes de continuar.

-- ─── A troca de policy em si ───────────────────────────────────────────────
-- Remove qualquer policy anterior de cuts_data, seja qual for o estado
-- atual do projeto (schema original "Allow all for anon", ou já com a
-- migration 002 "Require authenticated user" aplicada) — os dois nomes
-- são cobertos, então esta migration funciona independente de 002 ter
-- rodado ou não. A partir daqui, 002 fica obsoleta: esta policy já exige
-- autenticação (e mais: exige acesso à loja específica).

DROP POLICY IF EXISTS "Allow all for anon" ON cuts_data;
DROP POLICY IF EXISTS "Require authenticated user" ON cuts_data;

CREATE POLICY "cuts_data: acesso por loja do barbeiro" ON cuts_data
  FOR ALL
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM barber_stores bs
      WHERE bs.user_id = auth.uid() AND bs.store_id = cuts_data.store_id
    )
  )
  WITH CHECK (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM barber_stores bs
      WHERE bs.user_id = auth.uid() AND bs.store_id = cuts_data.store_id
    )
  );

-- Depois de aplicar: teste logado como um barbeiro que só tem acesso a
-- UMA loja — o seletor de loja no topo do app já deve mostrar só essa
-- loja (mudança feita em `hooks/useAccessibleStores.ts`, H9), e tentar
-- carregar dados de outra loja pelo console do navegador deve voltar
-- vazio/erro, nunca dado de verdade.
