# LevelzCut — Documentação Técnica

Estado do sistema em 2026-08-22, ao final das histórias H1–H11 do backlog
de hardening. Este documento é para quem for dar manutenção no código
depois —
descreve arquitetura, modelo de dados, autenticação/autorização, feature
flags, CI, monitoramento, deploy e a dívida técnica conhecida.

## 1. Visão geral

LevelzCut é um dashboard gerencial de faturamento para uma rede de
barbearias. Hoje em produção real, usado diariamente pela equipe pra lançar
cortes (diários/mensais) por loja e visualizar relatórios/insights. É um
app **estático** — sem servidor próprio, todo o "backend" é Supabase
(Postgres + Auth + Edge Functions) acessado direto do browser.

Desde o H11, "LevelzCut" não é mais um único app: é **dois** apps
estáticos publicados separadamente a partir do mesmo repositório e
compartilhando o mesmo projeto Supabase — o app de barbeiro (Relatórios,
Lançar Dados) e o app de administração (Lojas, Barbeiros). Ver seção 5.6.

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

Dois pontos de entrada Vite, um `src/` compartilhado (H11 — ver seção 5.6):

```
index.html               # entrada do app de barbeiro (build padrão, sem mudança)
admin.html                # entrada do app de administração (H11)
vite.config.ts             # build do app de barbeiro
vite.config.admin.ts        # build do app de administração — outDir dist-admin (H11)
src/
  App.tsx                 # app de barbeiro: sessão, abas (Relatórios/Lançar Dados), gates de feature
  AdminApp.tsx              # app de administração (H11): sessão, gate de role, painel de Lojas/Barbeiros
  main.tsx                   # entry do app de barbeiro
  main.admin.tsx               # entry do app de administração (H11)
  components/
    Header.tsx, Login.tsx, StoreSelector.tsx    # compartilhados pelos dois apps
    ChangePassword.tsx        # troca de senha obrigatória (H10) — só o app de barbeiro monta isso
    DataEntry/             # lançamento de cortes (diário/mensal) — só app de barbeiro
    Reports/                # relatórios, gráficos, tabela mensal — só app de barbeiro
    AIInsights.tsx           # insights derivados dos dados — só app de barbeiro
    Admin/                    # painel de administração (H6–H8, H10) — só o AdminApp importa isto
      index.tsx                 # sub-tabs Lojas / Barbeiros
      StoresPanel.tsx            # cadastro de lojas
      BarbersPanel.tsx            # cadastro (senha temporária) + gestão de acesso
  hooks/
    useBarberData.ts        # carrega/salva dados de faturamento por loja (app de barbeiro)
    useStores.ts              # carrega TODAS as lojas (só usado no app de administração)
    useAccessibleStores.ts      # lojas que O USUÁRIO ATUAL pode acessar (H9, app de barbeiro)
    useUserRole.ts                # resolve role + must_change_password (H6, H10) — usado pelos dois apps
  lib/
    supabase.ts              # client Supabase + helpers de auth + flag isAuthRequired (VITE_REQUIRE_AUTH) — compartilhado
    sentry.ts                    # init + reportError, atrás de VITE_SENTRY_DSN — compartilhado
    stores.ts                     # CRUD de lojas + fetchAccessibleStores (H6/H9)
    profile.ts                      # fetchMyRole + fetchMustChangePassword (H6, H10)
    adminApi.ts                       # chamadas à Edge Function admin-barbers (H8, H10) — só AdminApp
  utils/
    storage.ts               # persistência local/Supabase de cuts_data (app de barbeiro)
    analytics.ts, insights.ts  # cálculos derivados (app de barbeiro)
  types/                    # tipos compartilhados (Store, StoreData, ...)
supabase/
  schema.sql                # schema original (não editar)
  migrations/                 # alterações incrementais, sempre aditivas
    002_require_auth.sql        # policy de auth em cuts_data (H1, manual — dispensável após H9)
    003_stores_roles_barber_access.sql  # stores/profiles/barber_stores (H6, manual)
    004_barber_store_access_restriction.sql  # restringe cuts_data por loja (H9, manual)
    005_must_change_password.sql  # coluna must_change_password em profiles (H10, manual)
  functions/
    admin-barbers/              # Edge Function (Deno) — cadastro/gestão de barbeiros (H8, H10)
```

Não é preciso mover nenhum arquivo pra uma pasta "admin" separada pra
garantir que o bundle do app de barbeiro não carregue código de
administração (ou vice-versa): cada bundle só inclui o que o seu próprio
`App`/`AdminApp` importa, transitivamente — o Rollup (via Vite) resolve
isso pela árvore de imports de cada entry point, não pela localização física
dos arquivos.

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
  `'barbeiro'`, padrão `'barbeiro'`), e desde o H10 também
  `must_change_password` (boolean, padrão `true` — ver seção 5.5). Todo
  usuário novo entra como barbeiro; virar admin é uma ação deliberada
  (via UI, por outro admin, ou manualmente por SQL pro primeiro admin —
  "bootstrap", ver README).
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

Gate de UI (revisado no H11 — ver seção 5.6): até o H10, isso era uma aba
condicional dentro do mesmo `App.tsx`, controlada por `showAdminTab =
isAuthRequired && isAdmin`. Desde o H11, administração é o `AdminApp.tsx`
separado — não existe mais aba nenhuma pra mostrar/esconder em `App.tsx`,
o código simplesmente não está lá. `AdminApp.tsx` exige login
incondicionalmente e só passa da tela de login pro painel quando `isAdmin`
é `true`. `isAdmin` vem de `useUserRole(session)` nos dois apps, que por
sua vez usa `fetchMyRole()` (`lib/profile.ts`), que **nunca assume admin
por omissão**: qualquer situação incerta (sem Supabase configurado, sem
sessão, erro de rede, sem linha em `profiles`) resolve pra `'barbeiro'`.
Isso é testado explicitamente (`__tests__/profile.test.ts`,
`__tests__/AdminApp.test.tsx`, `__tests__/App.noAdmin.test.tsx`).

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

### 5.4 Edge Function `admin-barbers` (H8, H10)

Cadastrar um barbeiro e listar todos os usuários (`auth.admin.listUsers`)
são operações admin-only da API do Supabase que exigem a **service_role
key** — uma chave que ignora RLS por completo e **nunca** pode ir pro
bundle do cliente. Por isso essas ações passam por uma Edge Function
(Deno, hospedada no próprio Supabase, fora do bundle do Vite):

1. Recebe o request com o JWT de quem está chamando (`Authorization`
   header).
2. Cria um client com a **anon key** + esse JWT só pra identificar quem é o
   usuário (`auth.getUser()`).
3. Confirma no banco que `profiles.role === 'admin'` pra esse usuário —
   **exceto** pra ação `complete_password_setup` (H10), que qualquer
   usuário autenticado pode chamar, mas só pra limpar a PRÓPRIA flag de
   senha temporária (o `user.id` vem do JWT já verificado, nunca do corpo
   da requisição).
4. **Só então** cria um client com a service_role key e executa a ação
   (`list`, `create_barber`, `update_access`).

Ou seja, a função reverifica admin no servidor — nunca confia numa claim de
role vinda do cliente. Deploy e a secret `SUPABASE_SERVICE_ROLE_KEY` são
passos manuais fora do acesso deste squad (comandos no README).

### 5.5 Cadastro com senha temporária (H10)

O H8 original convidava por email (`auth.admin.inviteUserByEmail`) — o
barbeiro definia a própria senha, mas dependia do envio de email
funcionar no projeto (provedor padrão do Supabase, limite baixo, nunca
testado por este squad). O H10 troca isso por
`auth.admin.createUser({ email, password: tempPassword, email_confirm:
true })`, com uma senha temporária de 12 caracteres gerada na própria
Edge Function (`crypto.randomUUID()`), sem depender de email nenhum.

A senha volta na resposta do cadastro **uma única vez** — a UI
(`BarbersPanel.tsx`) mostra com um botão de copiar e um aviso de que ela
não aparece de novo; o admin repassa por fora (WhatsApp, verbalmente
etc.). A conta nasce com `profiles.must_change_password = true`
(coluna nova, migration `005_must_change_password.sql`), e
`App.tsx`/`hooks/useUserRole.ts` bloqueiam TODO o resto do dashboard —
inclusive antes de saber se a pessoa tem acesso a alguma loja — até
`components/ChangePassword.tsx` confirmar uma senha nova
(`supabase.auth.updateUser({ password })`, chamada padrão de
autenticação, sem privilégio nenhum) e chamar
`complete_password_setup` pra limpar a flag.

Contas que já existiam antes do H10 (o admin do bootstrap, e qualquer
barbeiro convidado pelo fluxo antigo de email) não são afetadas — a
migration zera a flag pra todo mundo que já tinha `profiles` na hora em
que ela roda; só contas criadas depois, via `create_barber`, nascem com
a flag ligada de propósito.

### 5.6 Dois apps, duas URLs (H11)

Até o H10, administração era uma aba a mais dentro do mesmo bundle que os
barbeiros usam (escondida por `showAdminTab`, mas presente no JS baixado
por qualquer um). O H11 separa isso em dois apps publicados
independentemente, cada um com sua própria URL/serviço Render:

| | App de barbeiro | App de administração |
|---|---|---|
| Entry | `index.html` → `src/main.tsx` → `App.tsx` | `admin.html` → `src/main.admin.tsx` → `AdminApp.tsx` |
| Build | `npm run build` (sem mudança) | `npm run build:admin` (novo, H11) |
| Conteúdo | Relatórios, Lançar Dados | Lojas, Barbeiros |
| Gate de login | Atrás de `VITE_REQUIRE_AUTH` (`isAuthRequired`) — igual sempre foi | **Sempre exigido**, incondicional — não lê `VITE_REQUIRE_AUTH` |
| Deploy | Serviço Render `levelzcut` (já existia) | Serviço Render `levelzcut-admin` (novo, `render.yaml`) |

A diferença mais importante de arquitetura é a do login: o app de barbeiro
mantém a mesma doutrina de sempre (flag desligada = comportamento de hoje,
inalterado). Já o app de administração **não tem uma versão "sem login"**
— não faria sentido ter, dado que ele só existe pra fazer operações que já
exigem ser admin. Publicar esse app como um serviço à parte é, em si, o
passo deliberado de ativação (a doutrina de "nada muda sem ativação
explícita" continua valendo — só que a ativação aqui é "o serviço existe e
tem uma URL", não uma variável de ambiente).

Bundle: o app de barbeiro (~582 kB) não importa nada de
`components/Admin/`, `lib/adminApi.ts` nem `hooks/useStores.ts`; o app de
administração (~195 kB) não importa `components/DataEntry/`,
`components/Reports/`, `components/AIInsights.tsx`, `hooks/useBarberData.ts`
nem `utils/analytics.ts`/`insights.ts`. Isso não é enforcement manual —
é consequência direta de cada entry point (`App.tsx` / `AdminApp.tsx`) só
importar o que usa; o bundler resolve o resto sozinho.

**O que NÃO muda**: a segurança real continua sendo a RLS do banco (seção
5.3) e a Edge Function reconfirmando o papel de quem chama (seção 5.4) —
isso já valia antes do H11 e continua valendo depois, independente de qual
app foi usado pra fazer a chamada. Separar os apps é uma melhoria de
clareza de produto/UX (o barbeiro nunca vê nem baixa código de
administração) e reduz a superfície de cada bundle — não é, por si só, uma
nova camada de proteção.

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
  (`useStores.ts`, `useUserRole.ts`), H9 mais 1
  (`useAccessibleStores.ts`) e H11 mais 1 (`AdminApp.tsx`, mesmo padrão
  de "carregar sessão uma vez") — total de 13 erros + 1 warning
  pré-existente (`eslint-disable` não usado em `BarbersPanel.tsx`), todos
  o mesmo padrão já aceito no código existente (chamar uma função que
  atualiza estado dentro de um `useEffect` de "carregar uma vez"). H10
  não introduziu nenhum erro novo (a mudança em `useUserRole.ts`
  reaproveita o mesmo efeito já contado). Não é regressão de
  comportamento (zero falha de teste/build), mas é uma refatoração
  pendente: nenhum desses hooks/componentes usa o padrão mais novo
  recomendado pelo eslint-plugin-react-hooks pra evitar o warning.
- **CI ainda só builda o app de barbeiro (H11)**: o workflow de CI (H3,
  branch separada) roda `npm run build`, que valida só o app de barbeiro.
  Enquanto isso não for atualizado pra também rodar `npm run build:admin`,
  um erro de tipo/build exclusivo do `AdminApp.tsx` (ou de qualquer coisa
  só importada por ele) pode passar batido pelo CI e só aparecer no deploy
  manual do serviço `levelzcut-admin`. `npx tsc -b` já cobre os dois (typecheck
  é do projeto inteiro, não por entry point), então o risco é só de um
  erro específico do Rollup/Vite ao montar o bundle admin.
- **Entrega da senha temporária é 100% manual (H10)**: não tem email nem
  SMS — o admin vê a senha uma vez na tela e precisa repassar por fora
  (WhatsApp, verbalmente). Funciona, mas é um passo humano em toda
  contratação; se o volume de cadastro crescer, vale revisitar (SMTP
  customizado configurado + voltar a usar convite por email, por
  exemplo).
- **Senha temporária não expira sozinha**: `must_change_password` só
  vira `false` quando o barbeiro efetivamente troca a senha — não tem
  expiração automática por tempo. Se alguém nunca fizer o primeiro
  login, a senha temporária gerada continua válida indefinidamente até
  alguém (admin) desativar a conta manualmente pelo Supabase Dashboard.
- **Um admin com muitas lojas ainda não tem UI de filtro**: `useStores()`
  no painel de admin sempre lista todas as lojas sem paginação/busca — não
  é problema com 1-2 lojas, mas se a rede crescer bastante vale revisitar.
- **Bundle size do app de barbeiro**: ~582 kB (174 kB gzip) — o Vite
  avisa que passou de 500 kB. Ainda não afeta a experiência (é um
  dashboard interno, não um site público otimizado pra Lighthouse), mas é
  candidato a code-splitting se a lista de telas continuar crescendo. O
  app de administração (H11), por não carregar mais Recharts/DataEntry/
  Reports, já sai bem menor (~195 kB, 62 kB gzip) e não dispara esse
  aviso.
- **Testes de UI de administração são superficiais**: os testes de
  `AdminApp.test.tsx`/`App.noAdmin.test.tsx`/`App.mustChangePassword.test.tsx`
  cobrem as regras críticas de visibilidade e gate (administração nunca
  aparece no app de barbeiro, bloqueia barbeiro comum no app de
  administração, bloqueia até trocar a senha temporária), mas não há
  testes de componente pra `StoresPanel`/`BarbersPanel` isoladamente
  (fluxo de criar loja, cadastrar barbeiro, copiar senha temporária,
  editar acesso).
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
3. Rodar `supabase/migrations/005_must_change_password.sql` (pode ser
   antes ou depois do passo 2 — não depende de admin nenhum existir
   ainda).
4. `supabase functions deploy admin-barbers` + `supabase secrets set
   SUPABASE_SERVICE_ROLE_KEY=...`.
5. Criar o serviço `levelzcut-admin` no Render (H11) — a partir do
   `render.yaml` se este projeto usa blueprint sync, ou manualmente pelo
   dashboard (passo a passo no README, seção "Dois apps, duas URLs").
   Configurar as mesmas variáveis `VITE_SUPABASE_URL`/
   `VITE_SUPABASE_ANON_KEY` do serviço principal.
6. Cadastrar cada barbeiro que já usa o painel (no app de administração,
   recém-publicado no passo 5 → Barbeiros → Cadastrar barbeiro) e liberar
   a(s) loja(s) dele — anotar a senha temporária mostrada na hora e
   repassar por fora.
7. Testar login em produção (nos dois apps) e avisar a equipe (mesma
   ordem de sempre).
8. Rodar a query de verificação do arquivo
   `004_barber_store_access_restriction.sql` e, só com resultado vazio,
   aplicar essa migration.
9. Só depois de tudo isso testado: decidir quando ligar
   `VITE_REQUIRE_AUTH=true` em produção.
