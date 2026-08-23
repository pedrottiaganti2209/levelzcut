import { useState, type FormEvent } from 'react';
import { Store as StoreIcon, Plus, RefreshCw, Trash2, Check, Search } from 'lucide-react';
import { useStores } from '../../hooks/useStores';
import { createStore, deleteStore, updateStore, slugifyStoreId } from '../../lib/stores';
import type { Store } from '../../types';

/**
 * Preço médio por corte (H21) — campo de edição próprio por linha, com seu
 * próprio estado local (rascunho, salvando, salvo). Fica num componente à
 * parte pra não precisar de um mapa de estado por loja no painel inteiro.
 */
function StorePriceField({ store, onSaved }: { store: Store; onSaved: () => void }) {
  const [value, setValue] = useState(store.pricePerCut !== undefined ? String(store.pricePerCut) : '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    const trimmed = value.trim();
    const parsed = trimmed === '' ? null : Number(trimmed.replace(',', '.'));
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      setError('Preço inválido.');
      return;
    }
    setSaving(true);
    const { error: updateErr } = await updateStore(store.id, { pricePerCut: parsed });
    setSaving(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setSaved(true);
    onSaved();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label htmlFor={`price-${store.id}`} className="text-xs text-gray-500 uppercase tracking-wider">
        Preço médio por corte (R$)
      </label>
      <input
        id={`price-${store.id}`}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder="não definido"
        inputMode="decimal"
        className="w-24 bg-black border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-yellow-600"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-yellow-500 transition-colors uppercase tracking-wider disabled:opacity-50"
      >
        {saved && <Check size={12} />}
        {saving ? 'Salvando...' : saved ? 'Salvo' : 'Salvar'}
      </button>
      {error && (
        <span className="text-xs text-red-500" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function StoresPanel() {
  const { stores, loading, reload } = useStores();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [idTouched, setIdTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // H24: filtro client-side por nome — sem chamada nova ao Supabase, opera
  // sobre a lista que useStores já buscou.
  const [search, setSearch] = useState('');
  const filteredStores = stores.filter((store) =>
    store.displayName.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleDelete = async (storeId: string) => {
    setDeleteError(null);
    setDeletingId(storeId);
    const { error: deleteErr } = await deleteStore(storeId);
    setDeletingId(null);
    if (deleteErr) {
      setDeleteError(deleteErr.message);
      return;
    }
    setConfirmingId(null);
    reload();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!idTouched) setId(slugifyStoreId(value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!id || !name) {
      setError('Preencha nome e identificador da loja.');
      return;
    }
    setSaving(true);
    const { error: createError } = await createStore({ id, name, displayName: `LevelzCut ${name}` });
    setSaving(false);
    if (createError) {
      setError(createError.message);
      return;
    }
    setName('');
    setId('');
    setIdTouched(false);
    setShowForm(false);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
          <StoreIcon size={16} /> Lojas
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="text-gray-400 hover:text-yellow-500 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 bg-yellow-600 text-black text-xs font-medium rounded px-3 py-1.5 uppercase tracking-wider hover:bg-yellow-500 transition-colors"
          >
            <Plus size={14} /> Nova loja
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="store-name" className="text-xs text-gray-400 uppercase tracking-wider">
              Nome
            </label>
            <input
              id="store-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex.: Pinheiros"
              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="store-id" className="text-xs text-gray-400 uppercase tracking-wider">
              Identificador (usado internamente, não pode mudar depois)
            </label>
            <input
              id="store-id"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setIdTouched(true);
              }}
              placeholder="ex.: pinheiros"
              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-yellow-600 text-black font-medium rounded py-2 text-sm uppercase tracking-wider hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Criar loja'}
          </button>
        </form>
      )}

      {deleteError && (
        <p className="text-sm text-red-500" role="alert">
          {deleteError}
        </p>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar loja por nome..."
          aria-label="Buscar loja por nome"
          className="w-full bg-black border border-gray-700 rounded pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
        />
      </div>

      {search.trim() !== '' && filteredStores.length === 0 && (
        <p className="text-sm text-gray-500">Nenhuma loja encontrada para "{search.trim()}".</p>
      )}

      <div className="space-y-2">
        {filteredStores.map((store) => (
          <div key={store.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white font-medium">{store.displayName}</div>
                <div className="text-xs text-gray-500">{store.id}</div>
              </div>
              {confirmingId !== store.id && (
                <button
                  onClick={() => setConfirmingId(store.id)}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                  title="Apagar loja"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="mt-2">
              <StorePriceField store={store} onSaved={reload} />
            </div>

            {confirmingId === store.id && (
              <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                <p className="text-xs text-gray-400">
                  Apagar <span className="text-white">{store.displayName}</span>? Os barbeiros perdem o acesso
                  liberado a essa loja. Dados de faturamento já lançados não são apagados, só deixam de aparecer
                  nos seletores.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(store.id)}
                    disabled={deletingId === store.id}
                    className="bg-red-700 text-white text-xs font-medium rounded px-3 py-1.5 uppercase tracking-wider hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {deletingId === store.id ? 'Apagando...' : 'Confirmar exclusão'}
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
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
