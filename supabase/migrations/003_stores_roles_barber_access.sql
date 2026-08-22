-- Migration 003: Lojas, papéis e acesso de barbeiro por loja (H6)
--
-- ATENÇÃO — LEIA ANTES DE EXECUTAR:
-- Este arquivo é APENAS gerado, ele NÃO foi (e não deve ser) executado
-- automaticamente contra nenhum banco Supabase.
--
-- É 100% aditivo: cria 3 tabelas novas (stores, profiles, barber_stores).
-- NÃO altera nem apaga nada em cuts_data. Não depende da migration 002
-- ter sido aplicada — funciona com ou sem ela.
--
-- Depois de rodar este SQL, siga o passo "BOOTSTRAP DO PRIMEIRO ADMIN"
-- no final deste arquivo — sem ele, ninguém consegue usar o painel de
-- administração (é um problema de ovo-e-galinha: só um admin pode
-- promover outro usuário a admin, então o primeiro precisa ser criado
-- manualmente).

-- ─── stores ──────────────────────────────────────────────────────────────
-- Substitui o array fixo STORES do código (src/types/index.ts) por uma
-- tabela de verdade — assim uma loja nova não exige deploy.

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,              -- mesmo formato do store_id usado em cuts_data (ex.: 'moema')
  name TEXT NOT NULL,               -- ex.: 'Moema'
  display_name TEXT NOT NULL,       -- ex.: 'LevelzCut Moema'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Semeia a loja que já existe hoje, sem duplicar se já tiver sido inserida.
INSERT INTO stores (id, name, display_name)
VALUES ('moema', 'Moema', 'LevelzCut Moema')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- ─── profiles ────────────────────────────────────────────────────────────
-- Um papel por usuário autenticado. Sem linha em profiles = tratado como
-- "barbeiro" pelo app (nunca como admin por omissão — vazio é o estado
-- menos privilegiado, de propósito).

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'barbeiro' CHECK (role IN ('admin', 'barbeiro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─── barber_stores ───────────────────────────────────────────────────────
-- Quais lojas cada barbeiro pode acessar. N:N entre usuário e loja.

CREATE TABLE IF NOT EXISTS barber_stores (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, store_id)
);

ALTER TABLE barber_stores ENABLE ROW LEVEL SECURITY;

-- ─── is_admin(): função auxiliar pras policies ──────────────────────────
-- SECURITY DEFINER é necessário aqui: uma policy em `profiles` que
-- consultasse `profiles` diretamente causaria recursão infinita. A função
-- roda com privilégio elevado só pra fazer essa checagem específica.

CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = uid AND role = 'admin'
  );
$$;

-- ─── Policies: stores ────────────────────────────────────────────────────
-- Qualquer autenticado pode ler (precisa pra popular o seletor de loja).
-- Só admin cria/edita/apaga.

CREATE POLICY "stores: leitura para autenticados" ON stores
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "stores: escrita só admin" ON stores
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ─── Policies: profiles ──────────────────────────────────────────────────
-- Cada um lê o próprio papel; admin lê/escreve qualquer um.

CREATE POLICY "profiles: leitura própria ou admin" ON profiles
  FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "profiles: escrita só admin" ON profiles
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "profiles: update só admin" ON profiles
  FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "profiles: delete só admin" ON profiles
  FOR DELETE USING (is_admin(auth.uid()));

-- ─── Policies: barber_stores ─────────────────────────────────────────────
-- Cada um lê os próprios vínculos; admin lê/escreve qualquer um.
-- (A restrição de acesso aos DADOS de cuts_data por loja fica pra uma
-- história futura — esta migration só guarda o mapeamento.)

CREATE POLICY "barber_stores: leitura própria ou admin" ON barber_stores
  FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "barber_stores: escrita só admin" ON barber_stores
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════
-- BOOTSTRAP DO PRIMEIRO ADMIN (passo manual obrigatório, uma vez só)
-- ═══════════════════════════════════════════════════════════════════════
--
-- 1. No Supabase Dashboard → Authentication → Users, clique no seu próprio
--    usuário e copie o "User UID" (um UUID).
-- 2. Rode o comando abaixo no SQL Editor, substituindo o UUID:
--
--    insert into profiles (user_id, role) values ('COLE-SEU-UUID-AQUI', 'admin');
--
-- Sem esse passo, ninguém vê a aba "Administração" no app — todo mundo
-- fica como "barbeiro" (o padrão seguro), e as policies acima não deixam
-- ninguém se promover sozinho.
