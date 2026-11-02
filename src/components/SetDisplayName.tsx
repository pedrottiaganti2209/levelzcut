import { useState } from 'react';

interface Props {
  onSave: (name: string) => Promise<string | null>;
}

export function SetDisplayName({ onSave }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    const err = await onSave(trimmed);
    if (err) {
      setError('Não foi possível salvar. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-white text-2xl font-bold tracking-tight">Como você quer ser chamado?</h1>
          <p className="text-gray-500 text-sm mt-2">Esse nome vai aparecer no app para você.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Fernando"
            autoFocus
            autoComplete="given-name"
            maxLength={50}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 transition-colors"
          />
          {error && (
            <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-lg py-2 px-3">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-800 disabled:text-gray-600 text-black font-bold py-3 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Salvando…' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
