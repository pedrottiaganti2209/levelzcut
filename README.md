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
```

Se essas variáveis não forem definidas, o app roda em **modo local**: os
dados ficam apenas no `localStorage` do navegador, sem exigir login e sem
sincronizar com a nuvem. Esse modo é útil para desenvolvimento, mas não deve
ser usado para os dados reais de faturamento.

Com as variáveis definidas, o app passa a exigir login (Supabase Auth) antes
de exibir qualquer dado, e os lançamentos são persistidos na tabela
`cuts_data` do Supabase.

## Autenticação e proteção dos dados (RLS)

A tabela `cuts_data` tem Row Level Security (RLS) habilitado. O schema base
está em `supabase/schema.sql`; alterações posteriores de schema/policies
ficam em `supabase/migrations/`, sempre como arquivos novos e aditivos —
nunca editando o schema original nem apagando dados.

A migration `supabase/migrations/002_require_auth.sql` troca a policy atual
(`"Allow all for anon"`, que permite leitura/escrita para qualquer pessoa
com a anon key) por uma policy que exige usuário autenticado
(`auth.uid() IS NOT NULL`). Ela **não** foi aplicada automaticamente — siga
o passo a passo abaixo, na ordem, para não perder acesso ao painel:

1. **Criar usuário no Supabase Dashboard**
   Vá em `Authentication → Users → Add user` e crie o(s) usuário(s) que vão
   acessar o dashboard (email + senha). Não há cadastro público no app —
   apenas login.

2. **Confirmar o email do usuário**
   Ou marque o usuário como "Auto Confirm User" ao criá-lo pelo Dashboard,
   ou desabilite a confirmação de email obrigatória em
   `Authentication → Providers → Email → Confirm email` (desligue essa
   opção). Sem isso, o login pode falhar mesmo com a senha correta.

3. **Deploy do app**
   Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de
   ambiente do serviço no Render e faça o deploy (`render.yaml` já define o
   build estático).

4. **Testar login em produção**
   Acesse a URL de produção e confirme que consegue logar com o usuário
   criado no passo 1, e que o dashboard carrega os dados normalmente
   (a policy antiga `"Allow all for anon"` ainda está ativa nesse ponto,
   então o app deve continuar funcionando mesmo antes da migration 002).

5. **Só então, rodar a migration 002**
   Com o login confirmado em produção, abra o SQL Editor do Supabase e
   execute o conteúdo de `supabase/migrations/002_require_auth.sql`. Isso
   substitui a policy `"Allow all for anon"` por uma que exige
   `auth.uid() IS NOT NULL`, sem apagar nenhuma linha da tabela.

6. **Configurar recovery de senha por email**
   Antes de travar o RLS (passo 5) — ou logo em seguida, se preferir seguir
   a ordem acima à risca — configure o envio de emails de recuperação de
   senha em `Authentication → Emails` (ou o provedor SMTP customizado, se
   usar um). Isso evita ficar sem acesso ao painel caso a senha do único
   usuário seja perdida, já que não existe fluxo de cadastro público para
   criar uma nova conta depois que o RLS estiver restrito.

## Estrutura do projeto

```
src/
  components/     # UI (Header, Login, StoreSelector, DataEntry, Reports, AIInsights)
  hooks/          # useBarberData — carrega/salva dados por loja
  lib/supabase.ts # client Supabase + helpers de auth
  utils/          # storage (local/Supabase), analytics, insights
  types/          # tipos compartilhados
supabase/
  schema.sql          # schema original (não editar)
  migrations/          # alterações incrementais de schema/policies
```
