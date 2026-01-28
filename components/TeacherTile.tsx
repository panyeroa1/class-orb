
import React, { useRef, useEffect, useState } from 'react';
import { UserStatus } from '../types';
import videoPlaceholder from '../assets/brand/images.png';

interface TeacherTileProps {
  name: string;
  avatar: string;
  isLive: boolean;
  status: UserStatus;
  isHost: boolean;
  roomCode: string;
  shareLink?: string;
  stream?: MediaStream | null;
  isMicEnabled?: boolean;
  isVideoEnabled?: boolean;
  isContinuousTalk?: boolean;
  onToggleMic?: () => void;
  onToggleVideo?: () => void;
  onMuteAll?: () => void;
  onToggleContinuous?: () => void;
  onPTTStart?: () => void;
  onPTTEnd?: () => void;
  isSidebarView?: boolean;
}

const TeacherTile: React.FC<TeacherTileProps> = ({
  name, avatar, isLive, status, isHost, roomCode, shareLink, stream, isMicEnabled, isVideoEnabled,
  isContinuousTalk, onToggleMic, onToggleVideo, onMuteAll, onToggleContinuous, onPTTStart, onPTTEnd, isSidebarView = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = isLive ? (stream || null) : null;
    }
  }, [stream, isLive]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShareLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className={`apple-glass overflow-hidden shadow-2xl transition-all duration-500 ${isSidebarView ? 'w-full' : 'w-72 fixed z-40'}`}>
      <div className="aspect-video relative bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
        {isLive && stream && isVideoEnabled ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <img
            src={videoPlaceholder}
            alt="Video Placeholder"
            className="w-full h-full object-cover"
          />
        )}

        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
            <div className="px-2.5 py-1 brand-red text-[10px] font-black text-white uppercase tracking-[0.1em] flex items-center gap-2 shadow-xl rounded-md animate-in fade-in zoom-in duration-300">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              Broadcasting
            </div>
          </div>
        )}

        {isHost && isLive && (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-2 z-20">
            {/* Mic Modes Control */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10 shadow-2xl">
              <div className="flex items-center gap-1 border-r border-white/10 pr-1 mr-1">
                <button
                  onClick={onToggleContinuous}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isContinuousTalk ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-white/40 hover:bg-white/10'}`}
                  aria-label={isContinuousTalk ? "Disable continuous talk" : "Enable continuous talk"}
                  title={isContinuousTalk ? "Continuous Talk Active" : "Toggle Continuous Talk"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
              </div>

              {!isContinuousTalk ? (
                <button
                  onMouseDown={onPTTStart}
                  onMouseUp={onPTTEnd}
                  onMouseLeave={onPTTEnd}
                  className={`px-4 h-10 rounded-xl flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest ${status === UserStatus.SPEAKING ? 'bg-[var(--accent-red)] text-white shadow-lg' : 'bg-white/20 text-white active:scale-95'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Push To Talk
                </button>
              ) : (
                <button
                  onClick={onToggleMic}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isMicEnabled ? 'bg-white text-black' : 'bg-[var(--accent-red)] text-white shadow-lg shadow-red-500/20'}`}
                  aria-label={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
                  title={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}

              <button
                onClick={onToggleVideo}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isVideoEnabled ? 'text-white hover:bg-white/10' : 'bg-[var(--accent-red)] text-white shadow-lg'}`}
                aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-[var(--glass-bg)] backdrop-blur-xl text-[var(--text-primary)] border-t border-[var(--glass-border)] transition-colors duration-500">
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col">
            <span className="text-[13px] font-black block truncate tracking-tight uppercase leading-tight">{name}</span>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-black mt-1">Lead Instructor</span>
          </div>
          {isHost && (
            <div className="flex flex-col items-end">
              <span className="text-[8px] uppercase opacity-40 font-black mb-1">Room Code</span>
              <button
                onClick={copyRoomCode}
                className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all ${copied ? 'bg-green-500 border-green-500 text-white' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                aria-label="Copy room code"
                title="Copy room code"
              >
                <span className="text-[10px] font-mono font-bold tracking-wider">{roomCode}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {copied ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  )}
                </svg>
              </button>
              {shareLink && (
                <button
                  onClick={copyShareLink}
                  className={`mt-2 flex items-center gap-2 px-2 py-1 rounded border transition-all ${linkCopied ? 'bg-green-500 border-green-500 text-white' : 'border-[var(--glass-border)] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}
                  aria-label="Copy student share link"
                  title="Copy student share link"
                >
                  <span className="text-[9px] font-black uppercase tracking-widest">{linkCopied ? 'Link Copied' : 'Share Link'}</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3.536 3.536a4 4 0 01-5.656-5.656l1.768-1.768M10.172 13.828a4 4 0 010-5.656l3.536-3.536a4 4 0 015.656 5.656l-1.768 1.768" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {isHost && isLive && onMuteAll && (
          <button
            onClick={onMuteAll}
            className="w-full py-2.5 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[var(--accent-red)] hover:border-transparent transition-all duration-300 rounded-xl shadow-inner active:scale-95"
          >
            Mute All Students
          </button>
        )}
      </div>
    </div>
  );
};

export default TeacherTile;
