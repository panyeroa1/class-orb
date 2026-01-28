
import React, { useEffect, useState } from 'react';
import Logo from './Logo';

interface HeaderProps {
  roomName: string;
  onSettingsClick: () => void;
  onExit: () => void;
  onThemeToggle: () => void;
  currentTheme: 'light' | 'dark';
  joinNotification?: string | null;
  isTranslationMuted: boolean;
  onTranslationMuteToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
  onExit,
  onThemeToggle,
  currentTheme,
  joinNotification,
  isTranslationMuted,
  onTranslationMuteToggle,
}) => {
  const [visibleNotification, setVisibleNotification] = useState<string | null>(null);

  useEffect(() => {
    if (joinNotification) {
      setVisibleNotification(joinNotification);
      const timer = setTimeout(() => setVisibleNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [joinNotification]);

  return (
    <header className="h-16 flex items-center justify-between px-6 apple-glass z-50 relative border-b border-[var(--glass-border)] shadow-sm">
      <div className="flex items-center gap-8">
        <Logo className="h-8" />
        <div className="hidden lg:flex flex-col">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-60"></span>
          <span className="text-[13px] font-bold text-[var(--text-primary)]"></span>
        </div>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full flex justify-center">
        {visibleNotification && (
          <div className="bg-[var(--accent-red)] text-white px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-xl animate-in fade-in slide-in-from-top-4 duration-700 flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
            {visibleNotification} joined
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onTranslationMuteToggle}
          className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-all text-[var(--text-primary)]"
          aria-label={isTranslationMuted ? 'Unmute translation' : 'Mute translation'}
          title={isTranslationMuted ? 'Unmute translation' : 'Mute translation'}
        >
          {isTranslationMuted ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9v6l-4 3V6l4 3zM16 9l5 5m0-5l-5 5" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9v6l-4 3V6l4 3zM15 9a4 4 0 010 6m2.5-8.5a7 7 0 010 11" />
            </svg>
          )}
        </button>
        <button
          onClick={onThemeToggle}
          className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-all text-[var(--text-primary)]"
        >
          {currentTheme === 'light' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 17.657l.707-.707M6.343 6.343l.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
            </svg>
          )}
        </button>

        <button
          onClick={onExit}
          className="px-5 h-10 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-500/20 transition-all"
        >
          Exit
        </button>
      </div>
    </header>
  );
};

export default Header;
