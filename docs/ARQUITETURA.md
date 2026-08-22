# LevelzCut — Documentação Técnica

Estado do sistema em 2026-08-22, ao final das histórias H1–H9 do backlog de
hardening. Este documento é para quem for dar manutenção no código depois —
descreve arquitetura, modelo de dados, autenticação/autorização, feature
flags, CI, monitoramento, deploy e a dívida técnica conhecida.

## 1. Visão geral

LevelzCut é um dashboard gerencial de faturamento para uma rede de
barbearias. Hoje em produção real, usado diariamente pela equipe pra lançar
cortes (diários/mensais) por loja e visualizar relatórios/insights. É um
app **estático** — sem servidor próprio, todo o "backend" é Supabase
(Postgres + Auth + Edge Functions) acessado direto do browser.

**Regra de ouro do projeto**: o painel já está em uso real. Nenhuma mudança
pode alterar a experiência de quem já usa o dashboard sem aviso prévio e
sem estar deliberadamente ativada. É por isso que login, painel de
administração e Sentry existem no código mas ficam atrás de feature flags
desligadas por padrão — ver seção 4.

## 2. Stack

| Camada       | Tecnologia                                                |
|--------------|------------------------------------------------------------|
| UI           | React 19 + TypeScript, Tailwind CSS, Recharts (gráficos), lucide-react (ícones) |
| Build        | Vite 8                                                     |
| Dados        | Supabase (Postgres + Row Level Security + Auth + Edge Functions) |
| Testes       | Vitest + Testing Library                                   |
| CI           | GitHub Actions (lint + tsc + test + build a cada PR/push)  |
| Monitoramento| Sentry (erros em runtime), UptimeRobot (disponibilidade)   |
| Deploy       | Render (site estático), a partir do build do Vite          |

Sem Supabase configurado (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
ausentes), o app roda em **modo local**: os dados de faturamento ficam só
no `localStorage` do navegador. Isso é usado hoje só em desenvolvimento —
os dados reais de produção estão no Supabase.

## 3. Arquitetura de código

```
src/
  App.tsx                 # composição raiz: sessão, abas, gates de feature
  components/
    Header.tsx, Login.tsx, StoreSelector.tsx
    DataEntry/             # lançamento de cortes (diário/mensal)
    Reports/                # relatórios, gráficos, tabela mensal
    AIInsights.tsx           # insights derivados dos dados
    Admin/                    # painel de administração (H6–H8)
      index.tsx                 # sub-tabs Lojas / Barbeiros
      StoresPanel.tsx            # cadastro de lojas
      BarbersPanel.tsx            # convite + gestão de acesso de barbeiros
  hooks/
    useBarberData.ts        # carrega/salva dados de faturamento por loja
    useStores.ts              # carrega TODAS as lojas (só usado no painel de admin, H6)
    useAccessibleStores.ts      # lojas que O USUÁRIO ATUAL pode acessar (H9)
    useUserRole.ts                # resolve role do usuário logado (H6)
  lib/
    supabase.ts              # client Supabase + helpers de auth + flag isAuthRequired (VITE_REQUIRE_AUTH)
    sentry.ts                    # init + reportError, atrás de VITE_SENTRY_DSN
    stores.ts                     # CRUD de lojas + fetchAccessibleStores (H6/H9)
    profile.ts                      # fetchMyRole — nunca assume admin (H6)
    adminApi.ts                       # chamadas à Edge Function admin-barbers (H8)
  utils/
    storage.ts               # persistência local/Supabase de cuts_data
    analytics.ts, insights.ts  # cálculos derivados
  types/                    # tipos compartilhados (Store, StoreData, ...)
supabase/
  schema.sql                # schema original (não editar)
  migrations/                 # alterações incrementais, sempre aditivas
    002_require_auth.sql        # policy de auth em cuts_data (H1, manual — dispensável após H9)
    003_stores_roles_barber_access.sql  # stores/profiles/barber_stores (H6, manual)
    004_barber_store_access_restriction.sql  # restringe cuts_data por loja (H9, manual)
  functions/
    admin-barbers/              # Edge Function (Deno) — convite/gestão de barbeiros (H8)
```

Nenhuma migration roda automaticamente contra o Supabase real — todas
exigem copiar o SQL e rodar manualmente no SQL Editor, deliberadamente,
pra nunca alterar produção sem controle explícito de quem tem acesso.

## 4. Feature flags

Como o app é estático, toda flag é uma variável `VITE_*` lida em
**build time** (`import.meta.env.VITE_*`) — mudar uma variável no Render
só faz efeito depois de um novo build/deploy, nunca em runtime, e nunca
basta reiniciar o serviço.

| Flag | Padrão | Efeito quando ligada |
|---|---|---|
| `VITE_REQUIRE_AUTH` | desligada (`false`/ausente) | Exige login (Supabase Auth) pra acessar o dashboard. Habilita também a existência de sessão, que é pré-requisito pra qualquer coisa relacionada a admin (ver abaixo). |
| `VITE_SENTRY_DSN` | ausente (Sentry não inicializa) | Reporta erros de runtime/Supabase pro Sentry. |

Convenção do projeto: toda flag nova segue o mesmo padrão — **ausente ou
false = comportamento de hoje, inalterado**. Isso foi formalizado depois de
um incidente em que uma mudança de auth foi ao ar sem aviso e bloqueou
usuários reais (revertido via PR revert; o código foi refeito atrás de
`VITE_REQUIRE_AUTH` antes de voltar).

## 5. Autenticação e autorização (RBAC)

### 5.1 Login (H1)

Supabase Auth (email/senha). Sem cadastro público — usuários são criados
manualmente no Supabase Dashboard (`Authentication → Users`). A tabela
`cuts_data` tem RLS habilitado; a migration `002_require_auth.sql` troca a
policy `"Allow all for anon"` por uma que exige `auth.uid() IS NOT NULL` —
essa migration só deve rodar depois de testar login em produção e avisar a
equipe (passo a passo completo no `README.md`).

**Nota pós-H9**: a migration `004_barber_store_access_restriction.sql`
(seção 5.3) já exige autenticação por conta própria (além de exigir a loja
certa), então ela torna a 002 dispensável — dá pra pular direto pra 004
depois da 003, sem precisar rodar a 002 antes.

### 5.2 Roles e administração (H6–H8)

Modelo de dados novo (migration `003_stores_roles_barber_access.sql`,
aditiva, RLS em todas as tabelas):

- **`stores`** — `id` (text, slug), `name`, `display_name`. Hoje só
  `moema`, mas o modelo já suporta N lojas. Seed via
  `ON CONFLICT (id) DO NOTHING`, então rodar a migration não duplica nem
  altera a loja existente.
- **`profiles`** — `user_id` (→ `auth.users`), `role` (`'admin'` |
  `'barbeiro'`, padrão `'barbeiro'`). Todo usuário novo entra como
  barbeiro; virar admin é uma ação deliberada (via UI, por outro admin, ou
  manualmente por SQL pro primeiro admin — "bootstrap", ver README).
- **`barber_stores`** — `user_id` + `store_id` (chave composta). Quais
  lojas cada barbeiro pode acessar — aplicado como restrição real em
  `cuts_data` desde o H9 (seção 5.3).

RLS: `stores` legível por qualquer autenticado, gravável só por admin;
`profiles` legível por si mesmo ou por admin, gravável só por admin;
`barber_stores` idem. Pra evitar recursão de RLS (a policy de `profiles`
precisaria consultar `profiles` pra saber se quem pede é admin), a
checagem usa `is_admin(uid uuid) RETURNS boolean SECURITY DEFINER SET
search_path = public` — roda com privilégios da função, não do usuário
chamador, então não reaciona a própria RLS que está avaliando.

Gate de UI: a aba "Administração" em `App.tsx` só renderiza quando
`isAuthRequired && isAdmin` — ambas as condições precisam ser verdadeiras.
`isAdmin` vem de `useUserRole(session)`, que por sua vez usa
`fetchMyRole()` (`lib/profile.ts`), que **nunca assume admin por
omissão**: qualquer situação incerta (sem Supabase configurado, sem
sessão, erro de rede, sem linha em `profiles`) resolve pra `'barbeiro'`.
Isso é testado explicitamente (`__tests__/profile.test.ts`,
`__tests__/App.adminTab.test.tsx`).

### 5.3 Restrição de acesso por loja (H9)

A migration `004_barber_store_access_restriction.sql` troca a policy de
RLS de `cuts_data` (a tabela com os dados de faturamento de verdade) por:

```sql
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM barber_stores bs
    WHERE bs.user_id = auth.uid() AND bs.store_id = cuts_data.store_id
  )
)
```

Admin sempre passa; barbeiro só passa pra lojas em que tem uma linha em
`barber_stores`. É a migration mais sensível do projeto até agora — o
próprio arquivo documenta uma query de verificação pra rodar antes de
aplicar (lista qualquer usuário não-admin sem nenhuma loja liberada, que
ficaria sem ver nada assim que a policy entrar em vigor) e a ordem
obrigatória de pré-requisitos (003 aplicada, bootstrap feito, todo
barbeiro já com pelo menos uma loja liberada, login já testado e equipe
avisada).

No cliente, `hooks/useAccessibleStores.ts` substitui `useStores()` no
seletor de loja do topo do app (`App.tsx`) — mas só ali: os painéis de
administração (`StoresPanel`/`BarbersPanel`) continuam usando `useStores()`
puro, porque admin precisa ver/gerenciar TODAS as lojas, não só as
próprias. `useAccessibleStores` decide a fonte pela combinação de flag +
role:

- Flag desligada, ou usuário admin → `fetchStores()` (todas as lojas,
  igual sempre foi).
- Barbeiro autenticado → `fetchAccessibleStores(userId)`, que lê
  `barber_stores` e retorna só as lojas vinculadas — pode vir vazio.

Um barbeiro sem nenhuma loja liberada não vê um dashboard vazio/quebrado:
`App.tsx` computa `noAccessibleStores` e mostra um aviso explícito em vez
da tela normal, orientando a pedir acesso a um admin.

### 5.4 Edge Function `admin-barbers` (H8)

Convidar um barbeiro (`auth.admin.inviteUserByEmail`) e listar todos os
usuários (`auth.admin.listUsers`) são operações admin-only da API do
Supabase que exigem a **service_role key** — uma chave que ignora RLS por
completo e **nunca** pode ir pro bundle do cliente. Por isso essas ações
passam por uma Edge Function (Deno, hospedada no próprio Supabase, fora do
bundle do Vite):

1. Recebe o request com o JWT de quem está chamando (`Authorization`
   header).
2. Cria um client com a **anon key** + esse JWT só pra identificar quem é o
   usuário (`auth.getUser()`).
3. Confirma no banco que `profiles.role === 'admin'` pra esse usuário.
4. **Só então** cria um client com a service_role key e executa a ação
   (`list`, `invite`, `update_access`).

Ou seja, a função reverifica admin no servidor — nunca confia numa claim de
role vinda do cliente. Deploy e a secret `SUPABASE_SERVICE_ROLE_KEY` são
passos manuais fora do acesso deste squad (comandos no README).

## 6. CI (H3)

GitHub Actions (`.github/workflows/ci.yml`) roda em todo push/PR:
`npm ci` → `npm run lint` → `npx tsc -b` → `npm run test` → `npm run
build`. Não faz deploy — é só gate de qualidade antes do merge.

## 7. Monitoramento

- **Erros em runtime (H5, Sentry)**: atrás de `VITE_SENTRY_DSN` (ausente =
  Sentry nem inicializa, zero custo/overhead). `sendDefaultPii: false`,
  `tracesSampleRate: 0`, nunca chama `Sentry.setUser()`. Os erros de
  Supabase em `utils/storage.ts` reportam só o objeto de erro (mensagem/
  código do Postgres) — nunca o payload com valores de faturamento.
- **Disponibilidade (H2, UptimeRobot)**: monitor externo apontando pra URL
  pública do Render, check a cada 5 min, alerta por email. Configuração é
  numa conta externa (UptimeRobot) que o squad não tem acesso — passo
  manual documentado no README.

## 8. Lacunas conhecidas / dívida técnica

- **Lint**: `npm run lint` tinha 9 erros pré-existentes antes deste
  round (todos `@typescript-eslint/no-explicit-any` em código de
  gráficos/storage, mais um `react-hooks/set-state-in-effect` em
  `useBarberData.ts`). H6 introduziu mais 2 erros do mesmo tipo
  (`useStores.ts`, `useUserRole.ts`) e H9 mais 1
  (`useAccessibleStores.ts`) — total de 12, todos o mesmo padrão já
  aceito no código existente (chamar uma função que atualiza estado
  dentro de um `useEffect` de "carregar uma vez"). Não é regressão de
  comportamento (zero falha de teste/build), mas é uma refatoração
  pendente: nenhum desses hooks usa o padrão mais novo recomendado pelo
  eslint-plugin-react-hooks pra evitar o warning.
- **Um admin com muitas lojas ainda não tem UI de filtro**: `useStores()`
  no painel de admin sempre lista todas as lojas sem paginação/busca — não
  é problema com 1-2 lojas, mas se a rede crescer bastante vale revisitar.
- **Bundle size**: o build gera um chunk único de ~589 kB (176 kB
  gzip) — o Vite avisa que passou de 500 kB. Ainda não afeta a
  experiência (é um dashboard interno, não um site público otimizado
  pra Lighthouse), mas é candidato a code-splitting se a lista de
  telas continuar crescendo.
- **Testes de UI de administração são superficiais**: os testes de
  `App.adminTab.test.tsx` cobrem a regra crítica de visibilidade da aba
  (nunca aparece sem flag, aparece só pra admin), mas não há testes de
  componente pra `StoresPanel`/`BarbersPanel` isoladamente (fluxo de
  criar loja, convidar barbeiro, editar acesso).
- **Edge Function sem teste automatizado**: `admin-barbers/index.ts`
  roda em Deno e não tem cobertura de teste neste repo (rodar Deno/Docker
  localmente está fora do que este squad consegue validar sem acesso ao
  projeto Supabase real).
- **Push bloqueado em sessões anteriores**: parte deste trabalho (H1–H5)
  foi entregue como patches (`git format-patch`) por uma sessão sem push
  liberado, e aplicada numa sessão seguinte com acesso normal ao GitHub —
  não é uma limitação do projeto em si, só de como o trabalho foi
  distribuído entre sessões.

## 9. Passos manuais pendentes (fora do acesso deste squad)

1. Rodar `supabase/migrations/003_stores_roles_barber_access.sql` no SQL
   Editor do Supabase.
2. Bootstrap do primeiro admin (`insert into profiles ...`, ver README).
3. `supabase functions deploy admin-barbers` + `supabase secrets set
   SUPABASE_SERVICE_ROLE_KEY=...`.
4. Convidar/cadastrar cada barbeiro que já usa o painel e liberar a(s)
   loja(s) dele em Administração → Barbeiros.
5. Testar login em produção e avisar a equipe (mesma ordem de sempre).
6. Rodar a query de verificação do arquivo
   `004_barber_store_access_restriction.sql` e, só com resultado vazio,
   aplicar essa migration.
7. Só depois de tudo isso testado: decidir quando ligar
   `VITE_REQUIRE_AUTH=true` em produção.
