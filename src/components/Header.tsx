export function Header() {
  return (
    <header className="bg-black border-b border-yellow-600 py-4 px-6">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        {/* Logo SVG */}
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="56" height="56" rx="8" fill="#1a1a1a" stroke="#D4AF37" strokeWidth="1.5"/>
          {/* Scissors */}
          <g transform="translate(10, 8)">
            <circle cx="8" cy="8" r="5" stroke="#D4AF37" strokeWidth="1.5" fill="none"/>
            <circle cx="28" cy="8" r="5" stroke="#D4AF37" strokeWidth="1.5" fill="none"/>
            <line x1="12" y1="11" x2="36" y2="35" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
            <line x1="24" y1="11" x2="0" y2="35" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="8" cy="8" r="2" fill="#D4AF37"/>
            <circle cx="28" cy="8" r="2" fill="#D4AF37"/>
          </g>
        </svg>
        <div>
          <h1 className="text-2xl font-bold text-yellow-500 tracking-widest uppercase">LevelzCut</h1>
          <p className="text-xs text-yellow-600/80 tracking-wider uppercase">Moema · by FioNavalha</p>
        </div>
        <div className="ml-auto">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Dashboard Gerencial</span>
        </div>
      </div>
    </header>
  );
}
