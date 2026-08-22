import { useState, type FormEvent } from 'react';
import { supabase, signOut } from '../lib/supabase';
import { completePasswordSetup } from '../lib/adminApi';
import { reportError } from '../lib/sentry';
import { KeyRound } from 'lucide-react';

interface Props {
  onDone: () => void;
}

/**
 * Tela obrigatória (H10) pra quem entrou com a senha temporária gerada no
 * cadastro pelo painel de Administração. Bloqueia o resto do app até uma
 * senha nova ser definida — ver `mustChangePassword` em `App.tsx`.
 */
export function ChangePassword({ onDone }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não são iguais.');
      return;
    }
    if (!supabase) {
      setError('Supabase não está configurado.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      reportError(updateError, 'ChangePassword.updateUser');
      setError('Não foi possível trocar a senha. Tente de novo.');
      return;
    }

    // A senha já foi trocada com sucesso nesse ponto. Se só a flag no
    // banco falhar em limpar, não trava a pessoa por isso — ela já
    // consegue logar com a senha nova da próxima vez; só reporta.
    const { error: confirmError } = await completePasswordSetup();
    setLoading(false);
    if (confirmError) {
      reportError(new Error(confirmError), 'ChangePassword.completePasswordSetup');
    }
    onDone();
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-yellow-500 mb-2">
          <KeyRound size={20} />
          <h1 className="text-lg font-bold uppercase tracking-widest">Trocar senha</h1>
        </div>
        <p className="text-sm text-gray-400">
          Você entrou com uma senha temporária. Escolha uma senha nova antes de continuar.
        </p>

        <div className="space-y-1">
          <label htmlFor="new-password" className="text-xs text-gray-400 uppercase tracking-wider">
            Nova senha
          </label>
          <input
            id="new-password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="confirm-password" className="text-xs text-gray-400 uppercase tracking-wider">
            Confirmar senha
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          disabled={loading}
          className="w-full bg-yellow-600 text-black font-medium rounded py-2 text-sm uppercase tracking-wider hover:bg-yellow-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar e continuar'}
        </button>

        <button
          type="button"
          onClick={() => signOut()}
          className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-wider"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
