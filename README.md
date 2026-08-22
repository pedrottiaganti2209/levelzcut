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

## Monitoramento de erro em runtime (Sentry)

Erros em produção (exceções não tratadas e falhas de leitura/escrita no
Supabase) podem ser reportados pro [Sentry](https://sentry.io/) (plano
gratuito), em vez de só `console.error` — que ninguém vê depois do fato.

Fica atrás da variável `VITE_SENTRY_DSN` (ver `src/lib/sentry.ts`): sem
essa variável definida, o Sentry **não é inicializado** e o app funciona
exatamente como hoje — é opt-in, não tem custo de ativar por engano.

Pra ativar:

1. Crie um projeto gratuito em sentry.io (tipo "React").
2. Copie o DSN do projeto e configure `VITE_SENTRY_DSN` nas variáveis de
   ambiente do serviço no Render (lembrando: é uma variável `VITE_*`, lida
   em build time — precisa de novo deploy pra fazer efeito, igual as
   outras).

**Sobre dado sensível**: a configuração usa `sendDefaultPii: false` (não
captura IP, cookies, headers) e tracing de performance desligado
(`tracesSampleRate: 0`). Os erros de Supabase (`storage.ts`) são reportados
passando só o objeto de erro em si (mensagem/código do Postgres) — nunca o
`payload` que contém os valores de faturamento (`total`/`dailyCuts`), e o
app nunca chama `Sentry.setUser()`, então nenhum email/identificador de
usuário é anexado aos eventos.

## Monitoramento de disponibilidade (uptime)

O app não tem servidor próprio (é estático, hospedado no Render), então o
monitoramento de disponibilidade é feito por um serviço externo apontando
para a URL pública — não tem código envolvido nisto.

**Configuração recomendada: [UptimeRobot](https://uptimerobot.com/) (plano gratuito)**

1. Crie uma conta gratuita em uptimerobot.com.
2. **Add New Monitor**:
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `LevelzCut Dashboard`
   - URL: `https://levelzcut.onrender.com/`
   - Monitoring Interval: `5 minutes` (o menor intervalo do plano gratuito —
     atende ao critério de alertar em até 5 min de indisponibilidade)
3. Em **Alert Contacts**, adicione e confirme o email (ou outro canal
   suportado no plano gratuito, como Slack/Telegram via integração) que deve
   receber o aviso, e associe esse contato ao monitor criado no passo 2.
4. Salve. A partir daí, qualquer indisponibilidade do domínio do Render é
   detectada no próximo check (até 5 min) e dispara o alerta configurado.

Isso é uma conta pessoal/da organização no UptimeRobot — a squad não tem
esse acesso, então essa configuração é sempre um passo manual de quem tem
a conta.

## Administração: lojas e barbeiros (H6, H7, H8)

Jornada do dono da barbearia: um admin loga, cadastra lojas (hoje só existe
"Moema", mas o modelo já suporta várias) e convida barbeiros, escolhendo a
quais lojas cada um tem acesso. Todo esse código **já está no app**, mas —
seguindo a mesma doutrina do login — fica atrás de duas travas e não muda
nada da experiência de quem já usa o painel:

1. **A mesma flag `VITE_REQUIRE_AUTH`** — sem login ligado, não existe
   conceito de "usuário logado", então a aba de Administração nunca aparece.
2. **Role `admin` na tabela `profiles`** — mesmo com login ligado, a aba só
   aparece pra quem tem `role='admin'`. Todo barbeiro entra como
   `'barbeiro'` por padrão (ver "Bootstrap do primeiro admin" abaixo).

Ou seja: a aba só é mostrada quando `isAuthRequired` (a mesma flag de login,
`src/lib/supabase.ts`) e `isAdmin` (papel do usuário logado) são verdadeiros
ao mesmo tempo. Com o app funcionando como hoje (flag desligada), essa
condição nunca é verdadeira — zero mudança visual ou de comportamento pra
quem já usa o dashboard.

### Modelo de dados

Migration nova e aditiva: `supabase/migrations/003_stores_roles_barber_access.sql`
(não edita nem apaga nada das tabelas existentes — `cuts_data` continua
igual). Cria 3 tabelas, todas com RLS habilitado:

- **`stores`** (`id` text, `name`, `display_name`) — lojas cadastradas.
  Migration já insere `('moema', 'Moema', 'LevelzCut Moema')` via
  `ON CONFLICT DO NOTHING`, então o app continua enxergando a mesma loja de
  sempre mesmo depois de rodar a migration.
- **`profiles`** (`user_id` → `auth.users`, `role` — `'admin'` ou
  `'barbeiro'`, padrão `'barbeiro'`) — role de cada usuário autenticado.
- **`barber_stores`** (`user_id`, `store_id`) — quais lojas cada barbeiro
  pode acessar.

Policies: leitura de `stores` liberada pra qualquer usuário autenticado;
escrita em `stores`/`profiles`/`barber_stores` só pra admin. Pra evitar
recursão de RLS (a policy de `profiles` precisaria consultar `profiles` pra
saber se quem está pedindo é admin), a checagem usa uma função
`is_admin(uid)` com `SECURITY DEFINER`.

**Passo manual — aplicar a migration**: como toda migration deste projeto,
não roda sozinha. Copie o conteúdo de
`supabase/migrations/003_stores_roles_barber_access.sql` no SQL Editor do
Supabase e execute. Não é destrutivo (só `CREATE TABLE IF NOT EXISTS` e um
`INSERT ... ON CONFLICT DO NOTHING`), mas siga a mesma prudência das
migrations anteriores: rode fora do horário de pico, se possível.

**Passo manual — bootstrap do primeiro admin**: logo depois de rodar a
migration, ninguém tem `role='admin'` ainda (nem quem vai administrar o
sistema) — é um problema clássico de "ovo e galinha". Resolva uma única vez
à mão:

1. Ache o UUID do seu usuário em `Authentication → Users` no Supabase
   Dashboard.
2. No SQL Editor, rode:
   ```sql
   insert into profiles (user_id, role) values ('COLE-SEU-UUID-AQUI', 'admin');
   ```

Depois disso, esse usuário já pode promover outros admins direto pela UI
(via a policy de escrita em `profiles`, que exige ser admin) — não precisa
repetir esse passo manual de novo.

### Painel de Lojas (H7)

Aba **Administração → Lojas**: formulário simples pra cadastrar loja nova
(nome + id gerado automaticamente, ex.: "Vila Madalena" → `vila-madalena`,
sem acento/maiúscula/espaço) e lista das lojas existentes. Usa
`src/lib/stores.ts` (`fetchStores`/`createStore`/`updateStore`), que cai
pro array fixo de `types/index.ts` se o Supabase não estiver configurado ou
a migration 003 ainda não tiver rodado — o seletor de loja no topo do app
(`StoreSelector`) nunca fica vazio.

### Painel de Barbeiros (H8)

Aba **Administração → Barbeiros**: convida barbeiro por email e marca quais
lojas ele acessa; lista os barbeiros existentes com opção de editar o
acesso depois. Isso **precisa** de uma Edge Function
(`supabase/functions/admin-barbers`), porque convidar usuário
(`auth.admin.inviteUserByEmail`) exige a `service_role` key do Supabase —
uma chave que **nunca** pode ir pro bundle do cliente (ela ignora RLS por
completo). A função roda no servidor (Deno, hospedado no próprio Supabase),
recebe o pedido do painel, confirma que quem está chamando é admin (lendo
`profiles` com o JWT de quem chamou, antes de usar a service role pra
qualquer coisa) e só então executa a ação.

**Passos manuais — publicar a Edge Function** (precisa da Supabase CLI e
não pode ser feito por este squad, que não tem acesso ao projeto Supabase):

```bash
supabase functions deploy admin-barbers
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<a service_role key do projeto>
```

`SUPABASE_URL` e `SUPABASE_ANON_KEY` já ficam disponíveis automaticamente
dentro da função; só a `SUPABASE_SERVICE_ROLE_KEY` precisa ser configurada
como secret à mão (Project Settings → API → `service_role` no Dashboard, ou
`supabase secrets set`). Até isso ser feito, o painel de Lojas funciona
normalmente, mas o painel de Barbeiros mostra erro ao tentar convidar ou
listar — sem quebrar o resto do app.

### O que ainda falta (H9, propositalmente fora deste escopo)

Hoje o cadastro de `barber_stores` já existe, mas **ainda não é aplicado**
como restrição real: um barbeiro autenticado ainda consegue ver dados de
qualquer loja em `cuts_data`, porque a policy de RLS dessa tabela não foi
alterada para checar `barber_stores`. Isso é a próxima história (H9),
combinada para rodar depois, separadamente — dá pra cadastrar loja e
convidar barbeiro hoje sem esse risco, porque tudo isso já fica atrás da
flag de login (que segue desligada em produção até ser deliberadamente
ativada).

## Estrutura do projeto

```
src/
  components/     # UI (Header, Login, StoreSelector, DataEntry, Reports, AIInsights)
  components/Admin/   # painéis de Lojas e Barbeiros (H7/H8)
  hooks/useBarberData.ts # carrega/salva dados por loja
  hooks/useStores.ts     # carrega lojas (Supabase ou fallback fixo)
  hooks/useUserRole.ts   # resolve role (admin/barbeiro) da sessão logada
  lib/supabase.ts # client Supabase + helpers de auth + flag VITE_REQUIRE_AUTH
  lib/stores.ts        # CRUD de lojas
  lib/profile.ts        # busca role do usuário logado
  lib/adminApi.ts        # chamadas pra Edge Function admin-barbers
  utils/          # storage (local/Supabase), analytics, insights
  types/          # tipos compartilhados
supabase/
  schema.sql      # schema atual (RLS permissivo — ver nota acima)
  migrations/          # alterações incrementais de schema/policies
  functions/admin-barbers/ # Edge Function (Deno) — convite/gestão de barbeiros
```
