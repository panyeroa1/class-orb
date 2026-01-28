
import React from 'react';
import { Participant, UserStatus, UserRole } from '../types';

interface StudentListProps {
  participants: Participant[];
  currentUserRole: UserRole;
  currentUserId: string;
  onAcceptHand: (id: string) => void;
  onRejectHand: (id: string) => void;
  onMute: (id: string) => void;
}

const StudentList: React.FC<StudentListProps> = ({ 
  participants, 
  currentUserRole, 
  currentUserId,
  onAcceptHand, 
  onRejectHand 
}) => {
  const isTeacher = currentUserRole === UserRole.TEACHER;

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-t border-[var(--glass-border)]">
      <div className="p-4 border-b border-[var(--glass-border)] bg-black/5 dark:bg-white/5">
        <h2 className="text-[12px] font-black uppercase tracking-widest opacity-40">Participants ({participants.length})</h2>
      </div>

      <div className="flex-1 overflow-y-auto scroll-smooth">
        {participants.map((p) => (
          <div 
            key={p.id} 
            className="flex items-center justify-between p-3 border-b border-[var(--glass-border)] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <img 
                src={p.avatar} 
                alt={p.name} 
                className={`w-8 h-8 rounded-none border object-cover ${p.status === UserStatus.SPEAKING ? 'border-green-500' : p.status === UserStatus.HAND_RAISED ? 'border-[var(--accent-red)]' : 'border-[var(--glass-border)]'}`} 
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold truncate max-w-[120px]">{p.name}</span>
                  {p.id === currentUserId && <span className="text-[8px] font-black uppercase opacity-30 border border-current px-1 rounded-sm">You</span>}
                </div>
                <span className="text-[10px] uppercase opacity-40">{p.role} • {p.language}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {p.status === UserStatus.HAND_RAISED && (
                <div className="flex items-center justify-center w-5 h-5 brand-red text-white rounded-full animate-pulse shadow-sm">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a2 2 0 00-2 2v6H6a2 2 0 00-2 2v2a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2V4a2 2 0 00-2-2z" />
                  </svg>
                </div>
              )}
              
              {p.status === UserStatus.HAND_RAISED && isTeacher && (
                <div className="flex items-center ml-1 border-l border-[var(--glass-border)] pl-1">
                  <button 
                    onClick={() => onAcceptHand(p.id)}
                    className="p-1 text-green-500 hover:bg-green-500/10 rounded-full transition-colors"
                    title="Accept speaking request"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => onRejectHand(p.id)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                    title="Decline speaking request"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {p.status === UserStatus.SPEAKING && (
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentList;
