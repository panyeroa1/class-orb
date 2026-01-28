
import React, { useEffect, useRef } from 'react';
import { LANGUAGES, Message } from '../types';

interface TranslationPanelProps {
  messages: Message[];
  sourceLanguage: string;
  targetLanguage: string;
  onReplay?: (text: string) => void;
  onSourceLanguageChange?: (language: string) => void;
  onTargetLanguageChange?: (language: string) => void;
  showHistory?: boolean;
}

const stripSourcePrefix = (translation: string, source: string) => {
  const translationTrimmed = translation.trim();
  if (!translationTrimmed) return translationTrimmed;
  const sourceTrimmed = source.trim();
  if (!sourceTrimmed) return translationTrimmed;

  const lowerTranslation = translationTrimmed.toLowerCase();
  const lowerSource = sourceTrimmed.toLowerCase();

  const cleanPrefix = (value: string) =>
    value.replace(/^[\s\.\-:]+/, '').trimStart();

  if (lowerTranslation.startsWith(lowerSource)) {
    return cleanPrefix(translationTrimmed.slice(sourceTrimmed.length));
  }

  const sourceNoPunct = sourceTrimmed.replace(/[.!?]+$/, '');
  const lowerSourceNoPunct = sourceNoPunct.toLowerCase();
  if (lowerSourceNoPunct && lowerTranslation.startsWith(lowerSourceNoPunct)) {
    return cleanPrefix(translationTrimmed.slice(sourceNoPunct.length));
  }

  return translationTrimmed;
};

const TranslationPanel: React.FC<TranslationPanelProps> = ({ 
  messages, 
  sourceLanguage,
  targetLanguage,
  onReplay,
  onSourceLanguageChange,
  onTargetLanguageChange,
  showHistory = false
}) => {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const translationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    [transcriptRef, translationRef].forEach(ref => {
      if (ref.current) {
        ref.current.scrollTo({
          top: ref.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    });
  }, [messages]);

  const displayMessages = showHistory 
    ? messages.filter(m => m.id !== 'live-stream')
    : messages;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-transparent gap-px bg-[var(--glass-border)]">
      {/* 2nd Panel: Transcript */}
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-app)] dark:bg-black/20">
        <div className="px-6 py-3 border-b border-[var(--glass-border)] bg-black/5 backdrop-blur-md">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-60 flex justify-between items-center">
            <span>Source Transcript</span>
            <select
              value={sourceLanguage}
              onChange={(e) => onSourceLanguageChange?.(e.target.value)}
              className="text-[10px] font-black tracking-[0.08em] normal-case text-[var(--text-secondary)] bg-black/10 dark:bg-white/10 border border-[var(--glass-border)] rounded-md px-2 py-1 outline-none focus:border-[var(--accent-red)] opacity-100 max-w-[180px]"
            >
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>{language.name}</option>
              ))}
            </select>
          </h3>
        </div>
        <div ref={transcriptRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {displayMessages.map((msg) => (
            <div key={`${msg.id}-src`} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--accent-red)] opacity-50">{msg.senderName}</span>
                <span className="text-[8px] opacity-20 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-[15px] leading-relaxed text-[var(--text-secondary)] font-medium">
                {msg.originalText || (msg.id === 'live-stream' ? '...' : '')}
              </p>
            </div>
          ))}
          {displayMessages.length === 0 && (
            <div className="h-full flex items-center justify-center opacity-10">
              <span className="text-[10px] uppercase font-black tracking-widest">Awaiting Audio</span>
            </div>
          )}
        </div>
      </div>

      {/* 3rd Panel: Translation */}
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-app)] dark:bg-black/40">
        <div className="px-6 py-3 border-b border-[var(--glass-border)] bg-black/5 backdrop-blur-md">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-red)] flex justify-between items-center">
            <span>Live Translation</span>
            <select
              value={targetLanguage}
              onChange={(e) => onTargetLanguageChange?.(e.target.value)}
              className="text-[10px] font-black tracking-[0.08em] normal-case text-[var(--text-secondary)] bg-black/10 dark:bg-white/10 border border-[var(--glass-border)] rounded-md px-2 py-1 outline-none focus:border-[var(--accent-red)] opacity-100 max-w-[180px]"
            >
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>{language.name}</option>
              ))}
            </select>
          </h3>
        </div>
        <div ref={translationRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {displayMessages.map((msg) => {
            const translationText = stripSourcePrefix(msg.translatedText || '', msg.originalText || '');
            return (
              <div key={`${msg.id}-tl`} className="animate-in fade-in slide-in-from-bottom-2 duration-500 relative group">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-30">{msg.senderName}</span>
                </div>
                <p className="text-[15px] leading-relaxed text-lime-400 font-bold tracking-tight">
                  {translationText || (msg.id === 'live-stream' ? '...' : '')}
                </p>
                {translationText && (
                  <button 
                    onClick={() => onReplay?.(translationText)}
                    type="button"
                    className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 p-2 text-[var(--accent-red)] transition-all"
                    aria-label="Replay translation"
                    title="Replay translation"
                  >
                    <span className="sr-only">Replay translation</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
           {displayMessages.length === 0 && (
            <div className="h-full flex items-center justify-center opacity-10">
              <span className="text-[10px] uppercase font-black tracking-widest">Waiting for Input</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslationPanel;
