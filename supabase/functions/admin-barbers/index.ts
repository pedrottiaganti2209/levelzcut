// Supabase Edge Function (Deno) — H8: gerenciar barbeiros (listar, convidar,
// editar acesso a loja).
//
// Por que isso existe como função separada, e não como código do app:
// criar um usuário e vincular lojas exige a service role key do Supabase,
// que tem privilégio total e NUNCA pode existir no bundle do navegador.
// Esta função roda no servidor do Supabase, recebe o JWT de quem chamou,
// confirma que essa pessoa é admin (consultando `profiles` com a service
// role, sem depender de RLS aqui) e só então executa a ação.
//
// DEPLOY: passo manual, feito pelo dono do projeto — a squad não tem
// acesso à conta Supabase pra rodar isso. Ver README (seção H8) pro passo
// a passo com o Supabase CLI.
//
// SEGREDO NECESSÁRIO: SUPABASE_SERVICE_ROLE_KEY precisa estar configurada
// como "secret" da função no painel do Supabase (Edge Functions → Secrets)
// — SUPABASE_URL e SUPABASE_ANON_KEY já ficam disponíveis automaticamente
// em toda Edge Function. Nunca coloque a service role key numa variável
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

async function inviteBarber(
  adminClient: ReturnType<typeof createClient>,
  email: string,
  storeIds: string[]
): Promise<{ userId: string; email: string }> {
  if (!email || !email.includes('@')) throw new Error('Email inválido.');

  // Envia o email de convite do próprio Supabase — o barbeiro define a
  // própria senha, o admin nunca precisa criar/compartilhar uma senha
  // temporária. Exige o envio de email configurado no projeto (Supabase
  // usa um provedor padrão com limite baixo; pra produção de verdade,
  // configurar SMTP customizado em Authentication → Emails).
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email);
  if (error) throw error;
  const userId = data.user.id;

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({ user_id: userId, role: 'barbeiro' }, { onConflict: 'user_id' });
  if (profileError) throw profileError;

  if (storeIds.length > 0) {
    const { error: storesError } = await adminClient
      .from('barber_stores')
      .insert(storeIds.map((storeId) => ({ user_id: userId, store_id: storeId })));
    if (storesError) throw storesError;
  }

  return { userId, email };
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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    // chamou é admin, e nunca exposto de volta ao chamador.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return json({ error: 'Só administradores podem gerenciar barbeiros.' }, 403);
    }

    const body = await req.json();

    switch (body.action) {
      case 'list':
        return json(await listBarbers(adminClient));
      case 'invite':
        return json(await inviteBarber(adminClient, body.email, body.storeIds ?? []));
      case 'update_access':
        return json(await updateAccess(adminClient, body.userId, body.storeIds ?? []));
      default:
        return json({ error: 'Ação desconhecida.' }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
