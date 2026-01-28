
import React, { useState, useEffect } from 'react';
import { UserRole, LANGUAGES } from '../types';
import Logo from './Logo';

interface JoinScreenProps {
  onJoin: (name: string, role: UserRole, sourceLang: string, targetLang: string, roomCode: string, gender: string) => void;
}

const JoinScreen: React.FC<JoinScreenProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [sourceLanguage, setSourceLanguage] = useState('English');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [gender, setGender] = useState('Prefer not to say');
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedRoom = params.get('room');
    if (sharedRoom) {
      setRoomCode(sharedRoom.toUpperCase());
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name, role, sourceLanguage, targetLanguage, roomCode, gender);
    }
  };

  return (
    <div className="w-full max-w-md p-8 apple-glass shadow-2xl m-4">
      <div className="flex flex-col items-center mb-8">
        <Logo className="h-10 mb-4" />
        <h2 className="text-[14px] font-bold tracking-widest uppercase opacity-40">SuccessInvest Portal</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-[0.1em]">Identity</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] focus:outline-none focus:border-[var(--accent-red)] text-[15px] transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-[0.1em]">Room Key</label>
          <input
            type="text"
            required
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="SI-XXXX"
            className="w-full h-12 px-4 bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] focus:outline-none focus:border-[var(--accent-red)] text-[15px] font-mono tracking-widest transition-all"
          />
        </div>

        <div className="grid grid-cols-1 gap-5">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-[0.1em]">Class Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole(UserRole.STUDENT)}
                className={`h-11 text-[12px] font-bold uppercase tracking-widest border transition-all ${role === UserRole.STUDENT ? 'brand-red text-white border-transparent' : 'border-white/10 opacity-60'}`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole(UserRole.TEACHER)}
                className={`h-11 text-[12px] font-bold uppercase tracking-widest border transition-all ${role === UserRole.TEACHER ? 'brand-red text-white border-transparent' : 'border-white/10 opacity-60'}`}
              >
                Teacher
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="join-source-language" className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-[0.1em]">Speaking</label>
            <select
              id="join-source-language"
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="w-full h-11 px-3 bg-black/5 dark:bg-white/10 border border-white/10 text-[13px] font-bold outline-none appearance-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="join-target-language" className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-[0.1em]">Translate To</label>
            <select
              id="join-target-language"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full h-11 px-3 bg-black/5 dark:bg-white/10 border border-white/10 text-[13px] font-bold outline-none appearance-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="join-gender" className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-[0.1em]">Gender</label>
          <select
            id="join-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full h-11 px-3 bg-black/5 dark:bg-white/10 border border-white/10 text-[13px] font-bold outline-none appearance-none"
          >
            <option value="Prefer not to say">Prefer not to say</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full h-14 brand-red text-white text-[14px] font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-[0.98] transition-all shadow-xl"
          >
            Enter Classroom
          </button>
        </div>
      </form>
    </div>
  );
};

export default JoinScreen;
