import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, UserPlus, RefreshCw, Copy, Check, Trash2 } from 'lucide-react';
import { listBarbers, createAdmin, deleteBarber, type Barber } from '../../lib/adminApi';

// H25: admin cadastra outro admin — mesmo fluxo de senha temporária do
// H10 (BarbersPanel), sem seleção de loja: admin nunca é restringido por
// loja em nenhuma tela nem policy. Reaproveita a mesma ação 'list' da
// Edge Function (que devolve todo mundo, com o papel de cada um) e só
// filtra pelos que já são admin.

export function AdminsPanel() {
  const [admins, setAdmins] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Aparece uma vez, logo depois de cadastrar — a senha temporária não
  // fica salva em lugar nenhum recuperável depois disso (mesmo padrão do H10).
  const [createdCredential, setCreatedCredential] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await listBarbers();
    setLoading(false);
    if (error) {
      setLoadError(error);
      return;
    }
    setAdmins((data ?? []).filter((b) => b.role === 'admin'));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email.includes('@')) {
      setFormError('Digite um email válido.');
      return;
    }
    setSaving(true);
    const { data, error } = await createAdmin(email);
    setSaving(false);
    if (error) {
      setFormError(error);
      return;
    }
    setEmail('');
    setShowForm(false);
    setCopied(false);
    if (data) setCreatedCredential({ email: data.email, tempPassword: data.tempPassword });
    reload();
  };

  const copyTempPassword = async () => {
    if (!createdCredential) return;
    try {
      await navigator.clipboard.writeText(createdCredential.tempPassword);
      setCopied(true);
    } catch {
      // Sem permissão de clipboard ou API indisponível — a senha continua
      // visível e selecionável na tela, só não copia com um clique.
    }
  };

  const handleDelete = async (userId: string) => {
    setDeleteError(null);
    setDeletingId(userId);
    const { error } = await deleteBarber(userId);
    setDeletingId(null);
    if (error) {
      setDeleteError(error);
      return;
    }
    setConfirmingDeleteId(null);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={16} /> Administradores
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={reload} className="text-gray-400 hover:text-yellow-500 transition-colors" title="Atualizar">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 bg-yellow-600 text-black text-xs font-medium rounded px-3 py-1.5 uppercase tracking-wider hover:bg-yellow-500 transition-colors"
          >
            <UserPlus size={14} /> Cadastrar admin
          </button>
        </div>
      </div>

      {loadError && (
        <p className="text-sm text-red-500" role="alert">
          {loadError}
        </p>
      )}

      {deleteError && (
        <p className="text-sm text-red-500" role="alert">
          {deleteError}
        </p>
      )}

      {createdCredential && (
        <div className="bg-gray-900 border border-yellow-700 rounded-lg p-4 space-y-2">
          <p className="text-sm text-yellow-500 font-medium">Admin cadastrado — repasse a senha temporária agora</p>
          <p className="text-xs text-gray-400">
            Essa senha só aparece uma vez aqui. {createdCredential.email} vai precisar trocá-la no primeiro login.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-sm text-yellow-400 select-all">
              {createdCredential.tempPassword}
            </code>
            <button
              type="button"
              onClick={copyTempPassword}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-yellow-500 transition-colors uppercase tracking-wider px-2 py-2"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCreatedCredential(null)}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors uppercase tracking-wider"
          >
            Fechar
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="admin-email" className="text-xs text-gray-400 uppercase tracking-wider">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
            />
          </div>
          <p className="text-xs text-gray-500">
            Admin vê e gerencia todas as lojas — não precisa (nem tem como) escolher acesso por loja.
          </p>
          {formError && (
            <p className="text-sm text-red-500" role="alert">
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-yellow-600 text-black font-medium rounded py-2 text-sm uppercase tracking-wider hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {saving ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {admins.map((admin) => (
          <div key={admin.userId} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white font-medium">{admin.email}</div>
              {confirmingDeleteId !== admin.userId && (
                <button
                  onClick={() => setConfirmingDeleteId(admin.userId)}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                  title="Apagar admin"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {confirmingDeleteId === admin.userId && (
              <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                <p className="text-xs text-gray-400">
                  Apagar a conta de <span className="text-white">{admin.email}</span>? Ele perde o acesso à
                  administração imediatamente. Não afeta nenhum dado de faturamento.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(admin.userId)}
                    disabled={deletingId === admin.userId}
                    className="bg-red-700 text-white text-xs font-medium rounded px-3 py-1.5 uppercase tracking-wider hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {deletingId === admin.userId ? 'Apagando...' : 'Confirmar exclusão'}
                  </button>
                  <button
                    onClick={() => setConfirmingDeleteId(null)}
                    className="text-xs text-gray-400 hover:text-gray-200 transition-colors uppercase tracking-wider px-3 py-1.5"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
