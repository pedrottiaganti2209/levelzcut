import { useEffect, useState, type FormEvent } from 'react';
import { Users, UserPlus, RefreshCw } from 'lucide-react';
import { useStores } from '../../hooks/useStores';
import { listBarbers, inviteBarber, updateBarberAccess, type Barber } from '../../lib/adminApi';

export function BarbersPanel() {
  const { stores } = useStores();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingStores, setEditingStores] = useState<string[]>([]);

  const reload = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await listBarbers();
    setLoading(false);
    if (error) {
      setLoadError(error);
      return;
    }
    setBarbers(data ?? []);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStore = (list: string[], setList: (v: string[]) => void, storeId: string) => {
    setList(list.includes(storeId) ? list.filter((s) => s !== storeId) : [...list, storeId]);
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email.includes('@')) {
      setFormError('Digite um email válido.');
      return;
    }
    setSaving(true);
    const { error } = await inviteBarber(email, selectedStores);
    setSaving(false);
    if (error) {
      setFormError(error);
      return;
    }
    setEmail('');
    setSelectedStores([]);
    setShowForm(false);
    reload();
  };

  const startEditing = (barber: Barber) => {
    setEditingUserId(barber.userId);
    setEditingStores(barber.storeIds);
  };

  const saveEditing = async () => {
    if (!editingUserId) return;
    setSaving(true);
    const { error } = await updateBarberAccess(editingUserId, editingStores);
    setSaving(false);
    if (error) {
      setLoadError(error);
      return;
    }
    setEditingUserId(null);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
          <Users size={16} /> Barbeiros
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={reload} className="text-gray-400 hover:text-yellow-500 transition-colors" title="Atualizar">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 bg-yellow-600 text-black text-xs font-medium rounded px-3 py-1.5 uppercase tracking-wider hover:bg-yellow-500 transition-colors"
          >
            <UserPlus size={14} /> Convidar
          </button>
        </div>
      </div>

      {loadError && (
        <p className="text-sm text-red-500" role="alert">
          {loadError}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleInvite} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="barber-email" className="text-xs text-gray-400 uppercase tracking-wider">
              Email
            </label>
            <input
              id="barber-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="barbeiro@email.com"
              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Acesso às lojas</span>
            <div className="space-y-1 pt-1">
              {stores.map((store) => (
                <label key={store.id} className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={selectedStores.includes(store.id)}
                    onChange={() => toggleStore(selectedStores, setSelectedStores, store.id)}
                    className="accent-yellow-600"
                  />
                  {store.displayName}
                </label>
              ))}
            </div>
          </div>
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
            {saving ? 'Enviando...' : 'Enviar convite'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {barbers.map((barber) => (
          <div key={barber.userId} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white font-medium">{barber.email}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {barber.storeIds.length === 0 && (
                    <span className="text-xs text-gray-600">sem acesso a nenhuma loja</span>
                  )}
                  {barber.storeIds.map((storeId) => {
                    const store = stores.find((s) => s.id === storeId);
                    return (
                      <span
                        key={storeId}
                        className="text-xs bg-gray-800 text-yellow-400 border border-yellow-900 rounded-full px-2 py-0.5"
                      >
                        {store?.displayName ?? storeId}
                      </span>
                    );
                  })}
                </div>
              </div>
              {editingUserId !== barber.userId && (
                <button
                  onClick={() => startEditing(barber)}
                  className="text-xs text-gray-400 hover:text-yellow-500 transition-colors uppercase tracking-wider"
                >
                  Editar acesso
                </button>
              )}
            </div>

            {editingUserId === barber.userId && (
              <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                {stores.map((store) => (
                  <label key={store.id} className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={editingStores.includes(store.id)}
                      onChange={() => toggleStore(editingStores, setEditingStores, store.id)}
                      className="accent-yellow-600"
                    />
                    {store.displayName}
                  </label>
                ))}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveEditing}
                    disabled={saving}
                    className="bg-yellow-600 text-black text-xs font-medium rounded px-3 py-1.5 uppercase tracking-wider hover:bg-yellow-500 transition-colors disabled:opacity-50"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingUserId(null)}
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
