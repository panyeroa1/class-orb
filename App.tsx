
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import TeacherTile from './components/TeacherTile';
import StudentList from './components/StudentList';
import TranslationPanel from './components/TranslationPanel';
import JoinScreen from './components/JoinScreen';
import AudioVisualizer from './components/AudioVisualizer';
import { Participant, UserRole, UserStatus, Message } from './types';
import { geminiService } from './services/geminiService';
import { encode } from './services/audioService';
import {
  fetchParticipantsForRoom,
  mapParticipantFromPayload,
  removeParticipant,
  subscribeToParticipants,
  updateParticipant,
  upsertParticipant,
  fetchMessagesForRoom,
  insertMessage,
  subscribeToMessages,
} from './services/supabaseService';
import { translateText } from './services/translationService';
import { Room, RoomEvent, Track, RemoteTrack } from 'livekit-client';

const LIVEKIT_URL = "wss://orbit-eburon-46oqe3e6.livekit.cloud";
const STORAGE_KEY = "successinvest.user.profile";

type StoredUserProfile = {
  id: string;
  name: string;
  role: UserRole;
  sourceLang: string;
  targetLang: string;
  roomCode: string;
  avatar: string;
  gender?: string;
};

const loadStoredProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUserProfile;
  } catch {
    return null;
  }
};

const saveStoredProfile = (profile: StoredUserProfile | null) => {
  try {
    if (!profile) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  } catch {
    // ignore storage errors
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<{ id: string; name: string; role: UserRole; sourceLang: string; targetLang: string; avatar: string; gender?: string } | null>(null);
  const [roomCode, setRoomCode] = useState('SI-' + Math.random().toString(36).substring(2, 6).toUpperCase());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  // Audio state
  const [ambientVolume, setAmbientVolume] = useState(0.3);
  const [translationVolume, setTranslationVolume] = useState(1.0);
  const [isTranslationMuted, setIsTranslationMuted] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isContinuousTalk, setIsContinuousTalk] = useState(false);

  // Refs for audio separation
  const lkRoomRef = useRef<Room | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const participantsChannelRef = useRef<ReturnType<typeof subscribeToParticipants> | null>(null);
  const messagesChannelRef = useRef<ReturnType<typeof subscribeToMessages> | null>(null);

  // Separate contexts for input and output to ensure clean separation
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const translationGainNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const audioDecodeWorkerRef = useRef<Worker | null>(null);
  const liveTranscriptRef = useRef<string>('');
  const translationInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const initAudioContexts = () => {
    if (!inputAudioCtxRef.current) {
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }
    if (!outputAudioCtxRef.current) {
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (outputAudioCtxRef.current && !translationGainNodeRef.current) {
      const gainNode = outputAudioCtxRef.current.createGain();
      gainNode.gain.value = isTranslationMuted ? 0 : translationVolume;
      gainNode.connect(outputAudioCtxRef.current.destination);
      translationGainNodeRef.current = gainNode;
    }
  };

  const persistUserProfile = (overrides?: Partial<StoredUserProfile>) => {
    if (!user) return;
    saveStoredProfile({
      id: user.id,
      name: user.name,
      role: user.role,
      sourceLang: user.sourceLang,
      targetLang: user.targetLang,
      roomCode,
      avatar: user.avatar,
      gender: user.gender,
      ...overrides,
    });
  };

  useEffect(() => {
    const stored = loadStoredProfile();
    if (stored) {
      setRoomCode(stored.roomCode);
      setUser({
        id: stored.id,
        name: stored.name,
        role: stored.role,
        sourceLang: stored.sourceLang,
        targetLang: stored.targetLang,
        avatar: stored.avatar,
        gender: stored.gender,
      });
      void startParticipantsSync(stored.roomCode);
      void startMessagesSync(stored.roomCode);
      void upsertParticipant(stored.roomCode, {
        id: stored.id,
        name: stored.name,
        role: stored.role,
        language: stored.targetLang,
        status: stored.role === UserRole.TEACHER ? UserStatus.SPEAKING : UserStatus.MUTED,
        avatar: stored.avatar,
        gender: stored.gender,
      });
      connectLiveKit(stored.name);
    }
    setIsHydrating(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const handleInteract = () => {
      initAudioContexts();
    };
    window.addEventListener('pointerdown', handleInteract, { once: true });
    return () => window.removeEventListener('pointerdown', handleInteract);
  }, [user]);

  useEffect(() => {
    if (!user || isHydrating) return;
    persistUserProfile();
  }, [user, roomCode, isHydrating]);

  useEffect(() => {
    const worker = new Worker(new URL('./services/pcmDecodeWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ float32: ArrayBuffer; sampleRate: number; channels: number }>) => {
      if (!outputAudioCtxRef.current || !translationGainNodeRef.current) return;
      const { float32, sampleRate, channels } = event.data;
      const float32Data = new Float32Array(float32);
      const frameCount = float32Data.length / channels;
      const buffer = outputAudioCtxRef.current.createBuffer(channels, frameCount, sampleRate);

      if (channels === 1) {
        buffer.copyToChannel(float32Data, 0);
      } else {
        for (let channel = 0; channel < channels; channel += 1) {
          const channelData = buffer.getChannelData(channel);
          for (let i = 0; i < frameCount; i += 1) {
            channelData[i] = float32Data[i * channels + channel];
          }
        }
      }

      const source = outputAudioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(translationGainNodeRef.current);

      const now = outputAudioCtxRef.current.currentTime;
      const start = Math.max(now, nextStartTimeRef.current);
      source.start(start);
      nextStartTimeRef.current = start + buffer.duration;

      audioSourcesRef.current.add(source);
      source.onended = () => audioSourcesRef.current.delete(source);
    };

    audioDecodeWorkerRef.current = worker;
    return () => {
      worker.terminate();
      audioDecodeWorkerRef.current = null;
    };
  }, []);

  const buildTranslationContext = (items: Message[], maxItems = 6, maxChars = 800) => {
    const finalized = items.filter(m => m.id !== 'live-stream' && m.translatedText);
    const recent = finalized.slice(-maxItems);
    const lines = recent.map((msg) => {
      const original = msg.originalText?.replace(/\s+/g, ' ').trim() || '';
      const translated = msg.translatedText?.replace(/\s+/g, ' ').trim() || '';
      if (!original || !translated) return '';
      return `${original} => ${translated}`.trim();
    }).filter(Boolean);
    const context = lines.join('\n').trim();
    if (context.length <= maxChars) return context;
    return context.slice(context.length - maxChars);
  };

  const handleJoin = async (name: string, role: UserRole, sourceLang: string, targetLang: string, code: string, gender: string) => {
    const resolvedRoomCode = code || roomCode;
    const userId = crypto.randomUUID();
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
    setRoomCode(resolvedRoomCode);
    setUser({ id: userId, name, role, sourceLang, targetLang, avatar, gender });
    saveStoredProfile({
      id: userId,
      name,
      role,
      sourceLang,
      targetLang,
      roomCode: resolvedRoomCode,
      avatar,
      gender,
    });
    setJoinNotification(name);

    // Initialize Audio Contexts on user interaction
    initAudioContexts();

    const isTeacher = role === UserRole.TEACHER;
    const meParticipant: Participant = {
      id: userId,
      name,
      role,
      language: targetLang,
      status: (isTeacher ? UserStatus.SPEAKING : UserStatus.MUTED),
      avatar,
      gender,
    };

    setParticipants(prev => [...prev.filter(p => p.id !== userId), meParticipant]);
    await upsertParticipant(resolvedRoomCode, meParticipant);
    await startParticipantsSync(resolvedRoomCode);
    await startMessagesSync(resolvedRoomCode);
    connectLiveKit(name);
  };

  // Sync translation volume
  useEffect(() => {
    if (translationGainNodeRef.current) {
      const effectiveVolume = isTranslationMuted ? 0 : translationVolume;
      translationGainNodeRef.current.gain.setTargetAtTime(
        effectiveVolume,
        outputAudioCtxRef.current?.currentTime || 0,
        0.1
      );
    }
  }, [translationVolume, isTranslationMuted]);

  useEffect(() => {
    return () => {
      participantsChannelRef.current?.unsubscribe();
      messagesChannelRef.current?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const handleUnload = () => {
      void removeParticipant(roomCode, user.id);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user, roomCode]);

  const startParticipantsSync = async (roomCodeToSync: string) => {
    participantsChannelRef.current?.unsubscribe();
    const initialParticipants = await fetchParticipantsForRoom(roomCodeToSync);
    if (initialParticipants.length > 0) {
      setParticipants(initialParticipants);
    }
    participantsChannelRef.current = subscribeToParticipants(roomCodeToSync, (payload) => {
      if (payload.eventType === 'DELETE') {
        setParticipants(prev => prev.filter(p => p.id !== payload.old?.id));
        return;
      }
      if (!payload.new) return;
      const mapped = mapParticipantFromPayload(payload.new);
      setParticipants(prev => {
        const exists = prev.some(p => p.id === mapped.id);
        if (exists) {
          return prev.map(p => p.id === mapped.id ? mapped : p);
        }
        return [...prev, mapped];
      });
    });
  };

  const startMessagesSync = async (roomCodeToSync: string) => {
    messagesChannelRef.current?.unsubscribe();
    const initialMessages = await fetchMessagesForRoom(roomCodeToSync);
    setMessages(initialMessages.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      originalText: m.original_text,
      translatedText: undefined,
      sourceLanguage: m.source_language ?? undefined,
      timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
    })));
    messagesChannelRef.current = subscribeToMessages(roomCodeToSync, (payload) => {
      if (!payload.new) return;
      const mapped: Message = {
        id: payload.new.id,
        senderId: payload.new.sender_id,
        senderName: payload.new.sender_name,
        originalText: payload.new.original_text,
        translatedText: undefined,
        sourceLanguage: payload.new.source_language ?? undefined,
        timestamp: payload.new.created_at ? new Date(payload.new.created_at).getTime() : Date.now(),
      };
      setMessages(prev => prev.some(m => m.id === mapped.id) ? prev : [...prev, mapped]);
    });
  };

  const connectLiveKit = async (name: string) => {
    try {
      const room = new Room({ adaptiveStream: true });
      lkRoomRef.current = room;
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video) {
          setRemoteStream(new MediaStream([track.mediaStreamTrack]));
        }
      });
      const token = "sim_token_" + Date.now();
      await room.connect(LIVEKIT_URL, token);
    } catch (err) {
      console.warn("LiveKit connection simulated for local environment.");
    }
  };

  const createLiveSession = (sourceLang: string, targetLang: string) => {
    if (!user) return;
    sessionPromiseRef.current = geminiService.connectLive(sourceLang, targetLang, {
      onTranscription: (text, isInput) => {
        if (!isInput) return;
        liveTranscriptRef.current = `${liveTranscriptRef.current}${text}`;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.id === 'live-stream') {
            return prev.map(m => m.id === 'live-stream'
              ? { ...m, originalText: `${m.originalText}${text}` }
              : m);
          }
          return [...prev, {
            id: 'live-stream',
            senderId: user.id,
            senderName: user.name,
            originalText: text,
            translatedText: '',
            timestamp: Date.now()
          }];
        });
      },
      onAudioData: () => { },
      onTurnComplete: () => {
        const finalText = liveTranscriptRef.current.trim();
        liveTranscriptRef.current = '';
        setMessages(prev => prev.filter(m => m.id !== 'live-stream'));
        if (finalText && user) {
          void insertMessage(roomCode, {
            id: crypto.randomUUID(),
            room_code: roomCode,
            sender_id: user.id,
            sender_name: user.name,
            original_text: finalText,
            source_language: user.sourceLang,
            created_at: new Date().toISOString(),
          });
        }
      },
      onError: (err) => {
        console.error("Gemini Session error:", err);
        stopBroadcast();
      }
    });
  };

  const closeLiveSession = async () => {
    try {
      const activeSession = await sessionPromiseRef.current;
      activeSession?.close?.();
      activeSession?.disconnect?.();
    } catch (err) {
      console.warn("Unable to close Gemini session cleanly.", err);
    }
  };

  const restartLiveSession = async (sourceLang: string, targetLang: string) => {
    await closeLiveSession();
    createLiveSession(sourceLang, targetLang);
  };

  const startBroadcast = async () => {
    if (!user) return;
    initAudioContexts();
    if (!inputAudioCtxRef.current || !outputAudioCtxRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: user.role === UserRole.TEACHER ? { width: 1280, height: 720, frameRate: 24 } : false
      });
      setLocalStream(stream);

      // Connect Gemini with dual language context
      createLiveSession(user.sourceLang, user.targetLang);

      const source = inputAudioCtxRef.current.createMediaStreamSource(stream);
      const processor = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!isMicEnabled) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const l = inputData.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;

        sessionPromiseRef.current?.then((activeSession) => {
          if (activeSession) {
            activeSession.sendRealtimeInput({
              media: {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000'
              }
            });
          }
        });
      };

      source.connect(processor);
      processor.connect(inputAudioCtxRef.current.destination);
      setIsBroadcasting(true);
    } catch (err) {
      console.error("Mic Access Denied:", err);
    }
  };

  const playAudioChunk = async (base64: string) => {
    if (!outputAudioCtxRef.current || !translationGainNodeRef.current) return;
    audioDecodeWorkerRef.current?.postMessage({
      base64,
      sampleRate: 24000,
      channels: 1,
    });
  };

  const stopBroadcast = () => {
    void closeLiveSession();
    sessionPromiseRef.current = null;
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setIsBroadcasting(false);
    audioSourcesRef.current.forEach(s => s.stop());
    audioSourcesRef.current.clear();
  };

  const handleReplay = async (text: string) => {
    if (!text) return;
    try {
      const audioBase64 = await geminiService.generateSpeech(text);
      if (audioBase64) playAudioChunk(audioBase64);
    } catch (error) {
      console.error("Replay failed", error);
    }
  };

  const handleSourceLanguageChange = (language: string) => {
    if (!user) return;
    setUser({ ...user, sourceLang: language });
    persistUserProfile({ sourceLang: language });
    if (isBroadcasting) {
      void restartLiveSession(language, user.targetLang);
    }
  };

  const handleTargetLanguageChange = (language: string) => {
    if (!user) return;
    setUser({ ...user, targetLang: language });
    persistUserProfile({ targetLang: language });
    setParticipants(prev => prev.map(p => p.id === user.id ? { ...p, language } : p));
    void updateParticipant(roomCode, user.id, { language });
    if (isBroadcasting) {
      void restartLiveSession(user.sourceLang, language);
    }
  };

  const translateMessage = async (message: Message) => {
    if (!user || !message.originalText || message.id === 'live-stream') return;
    if (translationInFlightRef.current.has(message.id)) return;
    translationInFlightRef.current.add(message.id);
    try {
      const context = buildTranslationContext(messages.filter(m => m.id !== message.id));
      const translated = await translateText(
        message.originalText,
        message.sourceLanguage ?? user.sourceLang,
        user.targetLang,
        context
      );
      const finalTranslation = translated && translated.trim().length > 0 ? translated : message.originalText;
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, translatedText: finalTranslation } : m));
    } catch (error) {
      console.error('Translation failed', error);
    } finally {
      translationInFlightRef.current.delete(message.id);
    }
  };

  useEffect(() => {
    if (!user) return;
    translationInFlightRef.current.clear();
    setMessages(prev => prev.map(m => m.id === 'live-stream' ? m : { ...m, translatedText: undefined }));
  }, [user?.targetLang]);

  useEffect(() => {
    if (!user) return;
    const pending = messages.filter(m => m.id !== 'live-stream' && !m.translatedText);
    pending.forEach((message) => {
      void translateMessage(message);
    });
  }, [messages, user?.targetLang]);

  const handleToggleTranslationMute = () => {
    setIsTranslationMuted(prev => !prev);
  };

  const handleExit = async () => {
    if (user) {
      await removeParticipant(roomCode, user.id);
    }
    saveStoredProfile(null);
    window.location.reload();
  };

  const updateMyStatus = (status: UserStatus) => {
    if (!user) return;
    setParticipants(prev => prev.map(p => p.id === user.id ? { ...p, status } : p));
    void updateParticipant(roomCode, user.id, { status });
  };

  if (isHydrating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-[11px] font-black uppercase tracking-widest opacity-40">Loading Session</span>
      </div>
    );
  }

  if (!user) return <div className="flex items-center justify-center min-h-screen"><JoinScreen onJoin={handleJoin} /></div>;

  const shareLink = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomCode)}`;

  return (
    <div className="flex flex-col h-screen overflow-hidden antialiased bg-[var(--bg-app)]">
      <Header
        roomName="Wealth Management Mastery"
        onSettingsClick={() => { }}
        onExit={handleExit}
        onThemeToggle={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        currentTheme={theme}
        joinNotification={joinNotification}
        isTranslationMuted={isTranslationMuted}
        onTranslationMuteToggle={handleToggleTranslationMute}
      />

      <main className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Sidebar: Teacher + Participants */}
        <aside className={`w-full ${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-80'} flex flex-col border-r border-[var(--glass-border)] bg-black/5 shrink-0 overflow-hidden transition-all duration-300`}>
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-end'} p-2 border-b border-[var(--glass-border)] bg-black/5 dark:bg-white/5`}>
            <button
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-all"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <>
              <div className="p-4">
                <TeacherTile
                  name={participants.find(p => p.role === UserRole.TEACHER)?.name || 'Instructor'}
                  avatar={`https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher`}
                  isLive={isBroadcasting || (!!remoteStream && user.role === UserRole.STUDENT)}
                  status={participants.find(p => p.id === user.id)?.status || UserStatus.MUTED}
                  isHost={user.role === UserRole.TEACHER}
                  roomCode={roomCode}
                  shareLink={shareLink}
                  stream={user.role === UserRole.TEACHER ? localStream : remoteStream}
                  isMicEnabled={isMicEnabled}
                  isVideoEnabled={isVideoEnabled}
                  isContinuousTalk={isContinuousTalk}
                  onToggleMic={() => setIsMicEnabled(!isMicEnabled)}
                  onToggleVideo={() => setIsVideoEnabled(!isVideoEnabled)}
                  onMuteAll={() => { }}
                  onToggleContinuous={() => setIsContinuousTalk(!isContinuousTalk)}
                  onPTTStart={() => updateMyStatus(UserStatus.SPEAKING)}
                  onPTTEnd={() => updateMyStatus(UserStatus.MUTED)}
                  isSidebarView
                />
              </div>
              <StudentList
                participants={participants}
                currentUserRole={user.role}
                currentUserId={user.id}
                onAcceptHand={() => { }}
                onRejectHand={() => { }}
                onMute={() => { }}
              />
              <div className="border-t border-[var(--glass-border)] bg-black/5 dark:bg-white/5 p-3 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Audio Visualizer</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isBroadcasting ? 'text-green-400' : 'opacity-30'}`}>
                    {isBroadcasting ? 'Live' : 'Idle'}
                  </span>
                </div>
                <AudioVisualizer
                  stream={user.role === UserRole.TEACHER ? localStream : remoteStream}
                  isActive={isBroadcasting}
                  height={40}
                />
              </div>
            </>
          )}
        </aside>

        {/* Center: Dual Persistent Transcription/Translation Panels */}
        <section className="flex-1 flex flex-col relative min-w-0">
          <TranslationPanel
            messages={messages}
            sourceLanguage={user.sourceLang}
            targetLanguage={user.targetLang}
            onReplay={handleReplay}
            onSourceLanguageChange={handleSourceLanguageChange}
            onTargetLanguageChange={handleTargetLanguageChange}
          />

          {/* Bottom Control Bar */}
          <div className="h-24 border-t border-[var(--glass-border)] flex flex-wrap items-center justify-between px-6 apple-glass shrink-0 gap-4 overflow-hidden shadow-sm transition-colors duration-500">
            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Ambient Mix</label>
                <input
                  type="range"
                  min="0" max="1" step="0.01"
                  value={ambientVolume}
                  onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                  className="w-24 accent-[var(--accent-red)] h-1 cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--accent-red)]">Translation Output</label>
                <input
                  type="range"
                  min="0" max="1" step="0.01"
                  value={translationVolume}
                  onChange={(e) => setTranslationVolume(parseFloat(e.target.value))}
                  className="w-24 accent-[var(--accent-red)] h-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 lg:flex-none justify-end">
              {user.role === UserRole.STUDENT && (
                <button
                  onClick={() => updateMyStatus(UserStatus.HAND_RAISED)}
                  className="px-5 h-11 rounded border border-[var(--glass-border)] text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0V12" /></svg>
                  Raise Hand
                </button>
              )}

              {user.role === UserRole.TEACHER && (
                <button
                  onClick={() => isBroadcasting ? stopBroadcast() : startBroadcast()}
                  className={`px-10 h-14 text-[13px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isBroadcasting ? 'brand-red text-white shadow-lg animate-pulse-soft' : 'bg-black/10 dark:bg-white/10 hover:bg-black/20'}`}
                >
                  {isBroadcasting ? 'End Session' : 'Go Live'}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
