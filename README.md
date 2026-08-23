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
- Deploy estático no [Render](https://render.com/) (ver `render.yaml`) — a
  partir do H11, dois serviços/URLs: o app de barbeiro e o app de
  administração (ver "Administração: lojas e barbeiros")

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

## Administração: lojas e barbeiros (H6–H11)

Jornada do dono da barbearia: cadastra lojas (hoje só existe "Moema", mas o
modelo já suporta várias) e cadastra barbeiros, escolhendo a quais lojas
cada um tem acesso. Todo esse código **já está pronto**, e a partir do H11
ele não faz mais parte do mesmo app que os barbeiros usam no dia a dia —
virou um app publicado à parte, com sua própria URL (ver a seção seguinte).

### Dois apps, duas URLs (H11)

Até o H10, administração era uma aba a mais dentro do mesmo app, escondida
atrás de `isAuthRequired && isAdmin`. O H11 separa isso de verdade em "dois
mundos":

- **App de barbeiro** (`src/App.tsx`, `main.tsx`, `index.html`) —
  Relatórios e Lançar Dados. É o serviço `levelzcut` que já está no ar,
  **sem nenhuma mudança de configuração**: mesma URL, mesmo build (`npm run
  build` / `npm run dev`). Esse bundle não importa mais nenhum código de
  Lojas/Barbeiros — não é só escondido, ele simplesmente não existe aqui.
- **App de administração** (`src/AdminApp.tsx`, `src/main.admin.tsx`,
  `admin.html`, `vite.config.admin.ts`) — Lojas e Barbeiros. Publicado num
  serviço novo, com uma URL própria (`npm run build:admin` / `npm run
  dev:admin`). Login é **sempre exigido** aqui, incondicionalmente — essa
  tela não fica atrás da flag `VITE_REQUIRE_AUTH` como o resto do app,
  porque publicar este app como um serviço à parte já É o passo deliberado
  de ativação (ninguém chega aqui sem saber o endereço). Só quem tem
  `role='admin'` em `profiles` passa da tela de login pro painel — um
  barbeiro que tentar entrar vê uma mensagem clara e é levado de volta pro
  login.

Os dois apps compartilham o **mesmo projeto Supabase** por trás — mesmo
banco, mesma autenticação, mesma Edge Function `admin-barbers`, mesmas
regras de RLS (a restrição por loja do H9 continua valendo igual,
independente de qual app foi usado pra acessar os dados). **Importante:**
essa separação não é uma nova camada de segurança — quem sempre garantiu
que um barbeiro não visse dado de outra loja, ou que só admin cadastrasse
gente nova, foi a RLS do banco e a Edge Function reconfirmando o papel no
servidor (ver "Autenticação e proteção dos dados" acima). Separar os apps
deixa a intenção mais clara pra quem usa e reduz o que cada lado baixa —
não substitui nenhuma trava que já existia.

**Passo manual — criar o serviço `levelzcut-admin` no Render**: o
`render.yaml` já descreve os dois serviços, mas se este projeto no Render
não foi criado originalmente a partir deste blueprint, o segundo serviço
precisa ser criado à mão pelo dashboard:

1. Dashboard do Render → **New → Static Site**, conectando o mesmo
   repositório.
2. Build Command: `npm install && npm run build:admin`
3. Publish directory: `dist-admin`
4. Em **Redirects/Rewrites**, adicionar uma regra `/*` → `/admin.html`
   (rewrite, não redirect).
5. Configurar as mesmas variáveis `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` do serviço principal (e `VITE_SENTRY_DSN`, se
   estiver usando) — **não** precisa de `VITE_REQUIRE_AUTH` aqui, o login
   já é sempre exigido.
6. Depois do primeiro deploy, a URL gerada (ex.:
   `levelzcut-admin.onrender.com`) deve ser repassada só pra quem
   administra — diferente da URL do app de barbeiro, essa não precisa (nem
   deve) ser divulgada pra quem só usa Relatórios/Lançar Dados.

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

**Passo manual — aplicar a migration 006 (leitura pública de `stores`)**:
a policy original de `SELECT` em `stores` (acima) exige usuário
autenticado — mas o app de barbeiro (`levelzcut`) roda sem login
enquanto `VITE_REQUIRE_AUTH` não for ativado (ver checklist no início
deste README). Resultado: lojas cadastradas pelo painel de Administração
não aparecem no app de barbeiro, que cai no fallback fixo do código (só
"Moema"). `supabase/migrations/006_public_store_read.sql` troca essa
policy por leitura pública — não é uma regressão de segurança, já que
`cuts_data` (o dado que de fato importa proteger) já é público hoje até
o login ser ativado de propósito, e nome de loja não é dado sensível.
Copie o conteúdo do arquivo no SQL Editor do Supabase e execute (pode
rodar a qualquer momento depois da 003).

### Painel de Lojas (H7)

No app de administração, aba **Lojas**: formulário simples pra cadastrar loja nova
(nome + id gerado automaticamente, ex.: "Vila Madalena" → `vila-madalena`,
sem acento/maiúscula/espaço) e lista das lojas existentes. Usa
`src/lib/stores.ts` (`fetchStores`/`createStore`/`updateStore`), que cai
pro array fixo de `types/index.ts` se o Supabase não estiver configurado ou
a migration 003 ainda não tiver rodado — o seletor de loja no topo do app
(`StoreSelector`) nunca fica vazio.

### Painel de Barbeiros (H8, cadastro revisado no H10)

No app de administração, aba **Barbeiros**: cadastra um barbeiro por email e marca
quais lojas ele acessa; lista os barbeiros existentes com opção de editar
o acesso depois. Isso **precisa** de uma Edge Function
(`supabase/functions/admin-barbers`), porque criar usuário exige a
`service_role` key do Supabase — uma chave que **nunca** pode ir pro
bundle do cliente (ela ignora RLS por completo). A função roda no
servidor (Deno, hospedado no próprio Supabase), recebe o pedido do
painel, confirma que quem está chamando é admin (lendo `profiles` com o
JWT de quem chamou, antes de usar a service role pra qualquer coisa) e só
então executa a ação.

**Passos manuais — publicar a Edge Function**: pode ser via Supabase CLI
(`supabase functions deploy admin-barbers`) ou direto pelo Dashboard
(Edge Functions → Deploy a new function → Via Editor → colar o código de
`supabase/functions/admin-barbers/index.ts`, nome exato `admin-barbers`).

Depois, configure os secrets da função em Edge Functions → Secrets:

- `SB_ANON_KEY` = a `anon`/`publishable` key do projeto
- `SB_SERVICE_ROLE_KEY` = a `service_role`/`secret` key do projeto

`SUPABASE_URL` já fica disponível automaticamente dentro da função. **Não
dá pra usar os nomes `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`** —
nas versões atuais do Supabase, secrets customizados não podem começar
com o prefixo `SUPABASE_` (reservado pros valores automáticos da própria
plataforma, que hoje usa outro formato — `SUPABASE_PUBLISHABLE_KEYS`/
`SUPABASE_SECRET_KEYS` — em vez das chaves simples que este código
espera). Por isso os nomes `SB_ANON_KEY`/`SB_SERVICE_ROLE_KEY` foram
escolhidos, e o código da função lê exatamente esses nomes. Até isso ser
feito, o painel de Lojas funciona normalmente, mas o painel de Barbeiros
mostra erro ao tentar cadastrar ou listar — sem quebrar o resto do app.

### Painel de Administradores (H25)

Aba **Administradores**, mesmo padrão do painel de Barbeiros: cadastra
outro admin por email, com senha temporária gerada no servidor (mesmo
fluxo do H10) — sem seleção de loja, porque admin nunca é restringido por
loja em nenhuma tela nem policy (vê e gerencia tudo). Reaproveita a mesma
ação `list` da Edge Function (que já devolve todo mundo, com o papel de
cada um) e a mesma ação `delete_barber` pra apagar — só filtra pelo papel
certo em cada painel: Barbeiros mostra só `role='barbeiro'`,
Administradores só `role='admin'`. Nenhuma Edge Function nova, nenhuma
migration nova — só a ação `create_admin` a mais na função já existente
(`admin-barbers`), então **precisa publicar a função de novo** depois
desta mudança pra ação existir em produção (mesmo passo manual de sempre,
acima).

Como qualquer exclusão nesse painel, a função recusa se for a própria
conta de quem chamou — evita um admin se trancar fora sem querer.

### Apagar lojas e barbeiros

O painel de Lojas e o de Barbeiros têm um botão de apagar (ícone de
lixeira), com uma confirmação inline antes de executar — sem modal de
navegador (`window.confirm`), pra ficar consistente com o resto do app.

- **Apagar loja**: não passa pela Edge Function — a policy de RLS de
  `stores` (migration 003) já libera `DELETE` pra quem é admin, então é
  uma chamada direta ao Supabase (`lib/stores.ts#deleteStore`). Como
  `barber_stores.store_id` tem `ON DELETE CASCADE` pra `stores`, os
  vínculos de acesso dos barbeiros àquela loja somem junto. `cuts_data`
  **não** é afetada — a coluna `store_id` de lá nunca teve FK pra `stores`
  (schema original, anterior à migration 003) — os dados de faturamento
  já lançados continuam no banco, só deixam de aparecer nos seletores até
  alguém recriar uma loja com o mesmo `id`.
- **Apagar barbeiro**: precisa da service role (apagar um usuário do
  Supabase Auth), então passa pela Edge Function `admin-barbers`, ação
  `delete_barber` — igual às outras ações administrativas, exige que quem
  chamou seja admin, e adicionalmente recusa se `userId` for o próprio
  `callerId` (evita um admin se trancar fora do painel sem querer).
  `profiles` e `barber_stores` também têm `ON DELETE CASCADE` pra
  `auth.users`, então apagar o usuário já limpa as duas tabelas — não
  precisa apagar cada uma à parte.

**Passo manual — publicar de novo a Edge Function**: como qualquer mudança
em `supabase/functions/admin-barbers/index.ts`, a ação `delete_barber` só
existe em produção depois de rodar de novo o deploy (CLI ou Dashboard —
ver "Passos manuais — publicar a Edge Function" acima). Sem isso, o botão
de apagar barbeiro aparece na tela mas a chamada volta com "Ação
desconhecida."

### Cadastro com senha temporária (H10)

O cadastro original do H8 convidava por email (`auth.admin.inviteUserByEmail`)
— o barbeiro definia a própria senha, mas dependia do envio de email
funcionar no projeto Supabase (o provedor padrão tem limite baixo, e a
squad não tem como testar/configurar isso). O H10 troca esse fluxo: a
Edge Function agora cria a conta já com uma **senha temporária gerada no
servidor** (`auth.admin.createUser`, sem depender de email), e devolve
essa senha pro admin **uma única vez**, na hora do cadastro — a tela
mostra a senha com um botão de copiar, e avisa que ela não aparece de
novo depois de fechar. O admin repassa essa senha ao barbeiro por fora
(WhatsApp, verbalmente etc.).

No primeiro login, o barbeiro é obrigado a trocar essa senha antes de ver
qualquer coisa do dashboard — a tela de "Trocar senha"
(`components/ChangePassword.tsx`) bloqueia o resto do app até isso
acontecer. Isso é controlado por uma coluna nova,
`profiles.must_change_password` (migration
`supabase/migrations/005_must_change_password.sql`), que começa `true`
só pra contas criadas a partir de agora pelo painel — quem já tinha
conta antes do H10 (incluindo o admin do bootstrap) não é afetado.

**Passo manual — aplicar a migration**: copie o conteúdo de
`005_must_change_password.sql` no SQL Editor do Supabase. Pode rodar a
qualquer momento depois da migration 003 (não depende da 004). É
aditiva — só adiciona uma coluna e zera a flag pra quem já existe hoje.

### Restrição de acesso por loja (H9)

Até aqui, `barber_stores` só guardava o vínculo — qualquer barbeiro
autenticado ainda conseguia ler/escrever dados de qualquer loja em
`cuts_data`. O H9 fecha essa lacuna: a migration
`supabase/migrations/004_barber_store_access_restriction.sql` troca a
policy de RLS de `cuts_data` por uma que só libera acesso pra admin, ou
pra barbeiro com aquela loja especificamente liberada em `barber_stores`.

No cliente, o seletor de loja no topo do app (`hooks/useAccessibleStores.ts`)
passa a refletir isso: com a flag de login desligada, ou pra admin, mostra
todas as lojas (igual sempre foi); pra barbeiro autenticado, mostra só as
lojas vinculadas a ele. Se um barbeiro ainda não tiver nenhuma loja
liberada, o app mostra um aviso claro em vez de um dashboard vazio.

**Esta é a migration mais sensível do projeto até agora** — ela restringe
acesso aos dados reais de faturamento. O arquivo da migration documenta
uma query de verificação pra rodar **antes** de aplicar: ela lista qualquer
usuário não-admin sem nenhuma loja liberada, porque essa pessoa ficaria
sem enxergar nada assim que a policy nova entrar em vigor. Ordem
obrigatória antes de rodar:

1. Migration 003 já aplicada, com o bootstrap do primeiro admin feito.
2. Todo barbeiro que hoje usa o painel já foi cadastrado e já tem pelo
   menos uma loja liberada (app de administração → Barbeiros → Editar
   acesso).
3. Login testado em produção e equipe avisada (mesma ordem de sempre).
4. Rodar a query de verificação do arquivo da migration — resultado tem
   que vir vazio.

Só então rode `004_barber_store_access_restriction.sql` no SQL Editor.
Ela funciona independente da migration `002_require_auth.sql` já ter sido
aplicada ou não (remove qualquer uma das duas policies anteriores de
`cuts_data`) — na prática, torna a 002 dispensável, porque a policy nova já
exige autenticação por si só (além de exigir a loja certa).

## Mundo 3 — Dono da Rede (H21–H24)

Quatro histórias aditivas, só no app de administração — nenhuma toca em
`index.html`/`App.tsx` (app de barbeiro). Numeração retomada em H21 porque
H12–H20 foram usadas em versões anteriores deste review e H13/H19 foram
retratadas.

### Preço médio por corte, por loja (H21)

Coluna nullable `price_per_cut` em `stores` — migration
`supabase/migrations/007_store_price_per_cut.sql` (renumerada de 006:
esse número já tinha sido usado por `006_public_store_read.sql`, a
correção de RLS de leitura pública de `stores`, aplicada antes desta
história). 100% aditiva: loja sem preço cadastrado continua se
comportando exatamente como antes em qualquer tela existente.

**Passo manual — aplicar a migration**: copie o conteúdo de
`007_store_price_per_cut.sql` no SQL Editor do Supabase. Pode rodar a
qualquer momento — não depende de nenhuma migration além da 003.

No painel de Lojas, cada loja ganha um campo "Preço médio por corte
(R$)" editável, com "não definido" como placeholder até ser cadastrado.

### Aba Visão Geral (H22)

Nova aba, primeira (landing) do app de administração — consolida
faturamento e cortes de **todas** as lojas numa tela só, com ranking.
Não cria nenhuma tabela nova: só lê `stores` e `cuts_data` (a policy de
admin em `cuts_data`, da migration 004, já libera essa leitura sem
filtro por loja — nenhuma policy nova é necessária). Faturamento da rede
soma só as lojas com preço cadastrado (H21); se nem toda loja tiver
preço, o ranking ordena por total de cortes em vez de faturamento, com
um aviso indicando isso. O ranking em si é implementado com barras em
CSS puro. **Atualização (H26)**: o Recharts passou a entrar no bundle do
admin — ver seção abaixo.

### Alerta de loja em queda (H23)

Estende a Visão Geral (H22): loja com pelo menos 2 meses de histórico
cuja receita do mês corrente está ≥20% abaixo da própria média histórica
(mesma função `getAverage` do card "Média Mensal" do app de barbeiro)
ganha um destaque visual no ranking — só informativo, nunca esconde ou
bloqueia a loja. Um card no topo conta quantas lojas estão nessa
condição e leva até elas no ranking. Loja com menos de 2 meses de
histórico nunca é avaliada, pra não marcar loja nova sem base de
comparação.

### Cortes por mês, por loja (H26)

Gráfico de barras agrupadas na Visão Geral, abaixo do ranking — uma barra
por loja, lado a lado, por mês. O admin escolhe entre 3, 6 ou 12 últimos
meses (botões no topo do gráfico, `MONTHLY_CHART_RANGES` em
`lib/networkData.ts`). Não busca dado novo: usa o mesmo `cuts_data` que a
Visão Geral já carregou.

**Traz o Recharts de volta pro bundle do admin** (o H22 tinha evitado de
propósito, com barras em CSS puro, porque não era necessário ainda) — bundle
do admin salta de ~197 kB pra ~501 kB. É um app usado só por quem administra
(não todo dia, por muita gente), então o tradeoff vale a pena aqui; o app de
barbeiro **não é afetado** (já paga esse custo desde sempre, sem mudança).

Cor de cada loja (identidade, nunca por posição no ranking) vem de uma
paleta categórica de 8 cores, ordem fixa, validada com o script da skill de
dataviz do Claude Code (`validate_palette.js`) contra a cor de fundo real
dos cards deste app (`#111827`) — separação de daltonismo (protanopia/
deuteranopia) ≥ 8 ΔE, contraste ≥ 3:1, todos PASS. Acima de 8 lojas, as
excedentes somam numa barra "Outras" (cinza) em vez de reciclar a cor de
outra loja — identidade não pode ser ambígua.

### Busca em Lojas e Barbeiros (H24)

Campo de busca no topo de cada painel — por nome da loja ou email do
barbeiro, case-insensitive, inteiramente client-side sobre os dados que
os painéis já buscam (sem chamada nova ao Supabase). Sem busca ativa, o
comportamento é idêntico ao de antes desta história.

## Estrutura do projeto

Dois pontos de entrada (H11) — `index.html`/`main.tsx` (app de barbeiro) e
`admin.html`/`main.admin.tsx` (app de administração) — compartilhando o
mesmo `src/`. Cada bundle só importa o que o seu `App`/`AdminApp` usa; não é
preciso mover arquivo nenhum pra pasta separada pra isso acontecer.

```
index.html            # entrada do app de barbeiro (build padrão)
admin.html             # entrada do app de administração (H11)
vite.config.ts         # build do app de barbeiro (sem mudança)
vite.config.admin.ts   # build do app de administração (H11)
src/
  App.tsx               # app de barbeiro — Relatórios, Lançar Dados
  AdminApp.tsx            # app de administração (H11) — Lojas, Barbeiros
  main.tsx                # entry do app de barbeiro
  main.admin.tsx           # entry do app de administração (H11)
  components/     # UI (Header, Login, StoreSelector, DataEntry, Reports, AIInsights)
  components/ChangePassword.tsx # troca de senha obrigatória (H10) — parte do app de barbeiro
  components/Admin/   # painéis de Lojas e Barbeiros (H7/H8) — usados só pelo AdminApp
  hooks/useBarberData.ts # carrega/salva dados por loja
  hooks/useStores.ts     # carrega TODAS as lojas (usado só no app de administração)
  hooks/useAccessibleStores.ts # lojas que O USUÁRIO ATUAL pode acessar (H9, app de barbeiro)
  hooks/useUserRole.ts   # resolve role + must_change_password da sessão logada (H10, usado pelos dois apps)
  lib/supabase.ts     # client Supabase + helpers de auth + flag isAuthRequired (VITE_REQUIRE_AUTH) — só o app de barbeiro usa a flag
  lib/stores.ts        # CRUD de lojas
  lib/profile.ts        # busca role + must_change_password do usuário logado
  lib/adminApi.ts        # chamadas pra Edge Function admin-barbers
  utils/          # storage (local/Supabase), analytics, insights
  types/          # tipos compartilhados
supabase/
  schema.sql      # schema atual (RLS permissivo — ver nota acima)
  migrations/          # alterações incrementais de schema/policies
  functions/admin-barbers/ # Edge Function (Deno) — cadastro/gestão de barbeiros
```
