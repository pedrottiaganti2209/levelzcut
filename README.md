# LevelzCut

Dashboard gerencial de faturamento para a barbearia LevelzCut. Permite lançar
cortes diários/mensais por loja e visualizar relatórios, estatísticas e
insights de faturamento.

## Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) (build e dev server)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (Postgres + Auth) — persistência opcional
  na nuvem; sem Supabase configurado, o app funciona em modo local usando
  `localStorage`
- [Vitest](https://vitest.dev/) + Testing Library — testes
- Deploy estático no [Render](https://render.com/) (ver `render.yaml`)

## Rodando localmente

```bash
npm install
npm run dev
```

Outros scripts úteis:

```bash
npm run build   # tsc -b && vite build
npm run lint    # eslint .
npm run test    # vitest run
npm run preview # serve o build de produção localmente
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha com as credenciais do seu
projeto Supabase (Project Settings → API):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_REQUIRE_AUTH=false
```

- Sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`: app roda em **modo
  local**, dados só no `localStorage` do navegador.
- Com as duas variáveis do Supabase definidas mas `VITE_REQUIRE_AUTH`
  ausente ou diferente de `true`: o app sincroniza com o Supabase
  normalmente, **sem exigir login** — este é o comportamento padrão e
  deve ser o único usado em produção até a equipe estar avisada.
- Só com `VITE_REQUIRE_AUTH=true` (e as duas variáveis do Supabase
  definidas) o app passa a bloquear o dashboard sem sessão ativa
  (Supabase Auth) e mostra o formulário de login.

### Por que essa flag existe

Uma primeira versão do login (história H1) acoplava a exigência de
autenticação diretamente à presença das variáveis do Supabase. Isso foi ao
ar em produção e travou o acesso de quem já usava o painel (barbeiros
lançando dados) sem aviso prévio — precisou ser revertido. `VITE_REQUIRE_AUTH`
existe para que o login fique pronto no código mas **desligado por padrão**,
só sendo ativado deliberadamente depois que a equipe for avisada e os
usuários existirem no Supabase.

## Ativando o login em produção (checklist)

Antes de setar `VITE_REQUIRE_AUTH=true` no Render:

1. **Avisar a equipe** que vai passar a existir login e que as credenciais
   atuais (anon key) deixarão de dar acesso de leitura/escrita sem sessão
   — combine um horário para a mudança.
2. **Criar usuário(s)** no Supabase Dashboard → Authentication → Users →
   Add user (um por barbeiro/gerente que precisa lançar dados). Não há
   cadastro público no app — apenas login.
3. **Confirmar o email do usuário** — marque "Auto Confirm User" ao criar,
   ou desabilite a confirmação obrigatória em Authentication → Providers →
   Email → Confirm email.
4. **Configurar recovery de senha por email** em Authentication → Emails
   (ou SMTP customizado), para não haver risco de ficar sem acesso caso
   alguém esqueça a senha — não existe fluxo de cadastro público para criar
   uma conta nova depois.
5. Só então, no serviço do Render, adicionar/alterar a env var
   `VITE_REQUIRE_AUTH=true` e fazer deploy.
6. Testar login em produção com os usuários criados antes de considerar a
   ativação concluída.

Nota: esta flag controla apenas a exigência de login na interface. A tabela
`cuts_data` no Supabase ainda usa a policy de RLS original (`USING (true)`),
que permite acesso com a anon key independentemente do login do app —
travar isso no banco é uma migration separada, aditiva e aplicada
manualmente (fora do escopo desta história).

## Estrutura do projeto

```
src/
  components/     # UI (Header, Login, StoreSelector, DataEntry, Reports, AIInsights)
  hooks/          # useBarberData — carrega/salva dados por loja
  lib/supabase.ts # client Supabase + helpers de auth + flag VITE_REQUIRE_AUTH
  utils/          # storage (local/Supabase), analytics, insights
  types/          # tipos compartilhados
supabase/
  schema.sql      # schema atual (RLS permissivo — ver nota acima)
```
