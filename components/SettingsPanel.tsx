import React from 'react';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    activeProvider: 'openai' | 'gemini';
    onProviderChange: (provider: 'openai' | 'gemini') => void;
    ambientVolume: number;
    onAmbientVolumeChange: (vol: number) => void;
    translationVolume: number;
    onTranslationVolumeChange: (vol: number) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    isOpen,
    onClose,
    activeProvider,
    onProviderChange,
    ambientVolume,
    onAmbientVolumeChange,
    translationVolume,
    onTranslationVolumeChange,
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="absolute top-16 right-6 w-72 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right"
            onMouseLeave={onClose}
        >
            <div className="flex flex-col gap-5">

                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--glass-border)]">
                    <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Configuration</span>
                </div>

                {/* AI Provider */}
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-red)]">AI Model Provider</label>
                    <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg">
                        <button
                            onClick={() => onProviderChange('openai')}
                            className={`flex-1 py-2 text-[11px] font-bold rounded-md transition-all ${activeProvider === 'openai'
                                    ? 'bg-white dark:bg-[#2c2c2e] shadow-sm text-[var(--text-primary)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            OpenAI
                        </button>
                        <button
                            onClick={() => onProviderChange('gemini')}
                            className={`flex-1 py-2 text-[11px] font-bold rounded-md transition-all ${activeProvider === 'gemini'
                                    ? 'bg-white dark:bg-[#2c2c2e] shadow-sm text-[var(--text-primary)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            Gemini
                        </button>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-snug px-1">
                        {activeProvider === 'openai'
                            ? 'Using GPT-4o Realtime (Preview). Best for complex reasoning and transcription.'
                            : 'Using Gemini 2.0 Flash (Live). Low latency and native audio support.'}
                    </p>
                </div>

                {/* Audio Levels */}
                <div className="flex flex-col gap-3 pt-2">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Ambient Mix</label>
                            <span className="text-[9px] font-mono opacity-50">{Math.round(ambientVolume * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={ambientVolume}
                            onChange={(e) => onAmbientVolumeChange(parseFloat(e.target.value))}
                            className="w-full accent-[var(--text-primary)] h-1 cursor-pointer bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--accent-red)]">Translation Output</label>
                            <span className="text-[9px] font-mono opacity-50">{Math.round(translationVolume * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={translationVolume}
                            onChange={(e) => onTranslationVolumeChange(parseFloat(e.target.value))}
                            className="w-full accent-[var(--accent-red)] h-1 cursor-pointer bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsPanel;
