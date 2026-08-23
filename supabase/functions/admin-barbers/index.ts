// Supabase Edge Function (Deno) — H8/H10: gerenciar barbeiros (listar,
// cadastrar com senha temporária, editar acesso a loja).
//
// Por que isso existe como função separada, e não como código do app:
// criar um usuário e vincular lojas exige a service role key do Supabase,
// que tem privilégio total e NUNCA pode existir no bundle do navegador.
// Esta função roda no servidor do Supabase, recebe o JWT de quem chamou,
// confirma que essa pessoa é admin (consultando `profiles` com a service
// role, sem depender de RLS aqui) e só então executa a ação — exceto
// `complete_password_setup` (H10), que qualquer usuário autenticado pode
// chamar pra limpar a PRÓPRIA flag de senha temporária, ver mais abaixo.
//
// DEPLOY: passo manual, feito pelo dono do projeto — a squad não tem
// acesso à conta Supabase pra rodar isso. Ver README (seção H8) pro passo
// a passo com o Supabase CLI.
//
// SEGREDOS NECESSÁRIOS: SB_ANON_KEY e SB_SERVICE_ROLE_KEY precisam estar
// configurados como "secrets" da função no painel do Supabase (Edge
// Functions → Secrets). Não dá pra usar os nomes SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY — nas versões atuais do Supabase, secrets
// customizados não podem começar com o prefixo "SUPABASE_" (é reservado
// pros valores automáticos da própria plataforma, que agora usam outro
// formato — SUPABASE_PUBLISHABLE_KEYS/SUPABASE_SECRET_KEYS — em vez das
// chaves simples que este código usa). SUPABASE_URL continua automático,
// não precisa configurar. Nunca coloque a service role key numa variável
// VITE_* (isso a exporia no bundle do front-end).

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface Barber {
  userId: string;
  email: string | undefined;
  role: 'admin' | 'barbeiro';
  storeIds: string[];
}

async function listBarbers(adminClient: ReturnType<typeof createClient>): Promise<Barber[]> {
  // auth.admin.listUsers() só existe com a service role — é por isso que
  // essa listagem não dá pra fazer direto do client normal do app.
  const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers();
  if (usersError) throw usersError;

  const { data: profiles } = await adminClient.from('profiles').select('user_id, role');
  const { data: mappings } = await adminClient.from('barber_stores').select('user_id, store_id');

  const roleByUser = new Map<string, 'admin' | 'barbeiro'>();
  (profiles ?? []).forEach((p: { user_id: string; role: string }) => {
    roleByUser.set(p.user_id, p.role === 'admin' ? 'admin' : 'barbeiro');
  });

  const storesByUser = new Map<string, string[]>();
  (mappings ?? []).forEach((m: { user_id: string; store_id: string }) => {
    const list = storesByUser.get(m.user_id) ?? [];
    list.push(m.store_id);
    storesByUser.set(m.user_id, list);
  });

  return usersData.users.map((u) => ({
    userId: u.id,
    email: u.email,
    role: roleByUser.get(u.id) ?? 'barbeiro',
    storeIds: storesByUser.get(u.id) ?? [],
  }));
}

// Gera uma senha temporária curta (12 caracteres), aleatória o suficiente
// pra uma senha de vida curta (é trocada obrigatoriamente no primeiro
// login — ver migration 005 e ChangePassword.tsx no front). Evita
// depender de email configurado no projeto pra cadastrar alguém (H10).
function generateTempPassword(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

// H10 (barbeiro) / H25 (admin): lógica compartilhada de criar conta com
// senha temporária definida pelo servidor, em vez do convite por email
// do H8 original — não depende do provedor de email do Supabase estar
// configurado/testado. `email_confirm: true` pula a confirmação por
// email (não tem link de confirmação sendo enviado aqui). A senha só é
// retornada UMA VEZ nesta resposta — quem cadastrou precisa repassar por
// fora (WhatsApp, verbalmente etc.); não fica salva em lugar nenhum
// recuperável depois disso.
async function createUser(
  adminClient: ReturnType<typeof createClient>,
  email: string,
  role: 'admin' | 'barbeiro',
  storeIds: string[]
): Promise<{ userId: string; email: string; tempPassword: string }> {
  if (!email || !email.includes('@')) throw new Error('Email inválido.');

  const tempPassword = generateTempPassword();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (error) throw error;
  const userId = data.user.id;

  // must_change_password: true — obrigatório trocar essa senha temporária
  // antes de ver qualquer coisa do dashboard (ver ação
  // complete_password_setup abaixo, e ChangePassword.tsx no front).
  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({ user_id: userId, role, must_change_password: true }, { onConflict: 'user_id' });
  if (profileError) throw profileError;

  // Só relevante pra barbeiro — admin não é restringido por loja em
  // nenhuma tela nem policy, então nunca chega aqui com storeIds.
  if (storeIds.length > 0) {
    const { error: storesError } = await adminClient
      .from('barber_stores')
      .insert(storeIds.map((storeId) => ({ user_id: userId, store_id: storeId })));
    if (storesError) throw storesError;
  }

  return { userId, email, tempPassword };
}

function createBarber(adminClient: ReturnType<typeof createClient>, email: string, storeIds: string[]) {
  return createUser(adminClient, email, 'barbeiro', storeIds);
}

// H25: admin cadastra outro admin, mesmo fluxo de senha temporária do
// H10 — sem seleção de loja, porque admin nunca é restringido por loja
// (nem no seletor do app, nem na RLS de cuts_data quando a migration 004
// estiver ativa: is_admin(auth.uid()) já libera tudo).
function createAdmin(adminClient: ReturnType<typeof createClient>, email: string) {
  return createUser(adminClient, email, 'admin', []);
}

async function deleteBarber(
  adminClient: ReturnType<typeof createClient>,
  callerId: string,
  userId: string
): Promise<{ ok: true }> {
  if (!userId) throw new Error('userId é obrigatório.');
  // Bloqueia auto-exclusão: um admin apagando a própria conta por engano
  // ficaria trancado pra fora do painel sem ninguém pra reverter (a não
  // ser voltando pro SQL Editor do Supabase). `profiles`/`barber_stores`
  // têm ON DELETE CASCADE pra auth.users, então apagar o usuário aqui já
  // limpa as duas tabelas junto — não precisa apagar cada uma à parte.
  if (userId === callerId) throw new Error('Você não pode apagar a própria conta.');

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) throw error;
  return { ok: true };
}

async function completePasswordSetup(
  adminClient: ReturnType<typeof createClient>,
  callerId: string
): Promise<{ ok: true }> {
  // Ação deliberadamente SEM checagem de admin — qualquer usuário
  // autenticado pode chamar isso, mas só limpa a PRÓPRIA flag: callerId
  // vem do JWT já verificado no dispatcher abaixo, nunca de um campo que
  // o cliente poderia manipular no corpo da requisição.
  const { error } = await adminClient
    .from('profiles')
    .update({ must_change_password: false })
    .eq('user_id', callerId);
  if (error) throw error;
  return { ok: true };
}

async function updateAccess(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  storeIds: string[]
): Promise<{ ok: true }> {
  if (!userId) throw new Error('userId é obrigatório.');

  // Substitui o conjunto inteiro de lojas do barbeiro pelo novo conjunto
  // enviado — não apaga nada de cuts_data, só o mapeamento de acesso.
  const { error: deleteError } = await adminClient.from('barber_stores').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;

  if (storeIds.length > 0) {
    const { error: insertError } = await adminClient
      .from('barber_stores')
      .insert(storeIds.map((storeId) => ({ user_id: userId, store_id: storeId })));
    if (insertError) throw insertError;
  }

  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Requisição sem autenticação.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SB_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SB_SERVICE_ROLE_KEY')!;

    // Client "de quem chamou" — só pra descobrir quem é, com o próprio JWT.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: 'Sessão inválida.' }, 401);

    // Client com privilégio total — só usado DEPOIS de confirmar que quem
    // chamou é admin (exceto pra complete_password_setup, ver abaixo), e
    // nunca exposto de volta ao chamador.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    // complete_password_setup é a ÚNICA ação que não exige ser admin —
    // qualquer usuário autenticado pode chamar, mas só pra limpar a
    // PRÓPRIA flag de senha temporária (H10). Todas as outras ações
    // exigem role='admin', confirmado logo abaixo.
    if (body.action === 'complete_password_setup') {
      return json(await completePasswordSetup(adminClient, user.id));
    }

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return json({ error: 'Só administradores podem gerenciar barbeiros.' }, 403);
    }

    switch (body.action) {
      case 'list':
        return json(await listBarbers(adminClient));
      case 'create_barber':
        return json(await createBarber(adminClient, body.email, body.storeIds ?? []));
      case 'create_admin':
        return json(await createAdmin(adminClient, body.email));
      case 'update_access':
        return json(await updateAccess(adminClient, body.userId, body.storeIds ?? []));
      case 'delete_barber':
        return json(await deleteBarber(adminClient, user.id, body.userId));
      default:
        return json({ error: 'Ação desconhecida.' }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
