import { LogOut } from 'lucide-react';
import trimnexLogo from '../assets/trimnex-logo.png';

interface HeaderProps {
  onSignOut?: () => void;
  /** H11: o app de administração reaproveita este Header com um rótulo diferente. */
  subtitle?: string;
}

export function Header({ onSignOut, subtitle = 'Dashboard Gerencial' }: HeaderProps) {
  return (
    <header className="bg-black border-b border-yellow-600 py-4 px-6">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        <div className="w-14 h-14 rounded-lg bg-[#1a1a1a] border border-yellow-600 flex items-center justify-center shrink-0">
          <img src={trimnexLogo} alt="" className="w-9 h-9" />
        </div>
        <h1 className="text-2xl font-bold text-yellow-500 tracking-widest uppercase">Trimnex</h1>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-gray-500 uppercase tracking-widest">{subtitle}</span>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-yellow-500 transition-colors uppercase tracking-wider"
              title="Sair"
            >
              <LogOut size={14} />
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
