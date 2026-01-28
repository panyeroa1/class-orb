import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Participant, UserRole, UserStatus } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.SUPABASE_URL ?? '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? import.meta.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

type ParticipantRow = {
  id: string;
  room_code: string;
  name: string;
  role: string;
  language: string;
  status: string;
  avatar: string;
  gender?: string | null;
  updated_at?: string;
};

type MessageRow = {
  id: string;
  room_code: string;
  sender_id: string;
  sender_name: string;
  original_text: string;
  source_language?: string | null;
  created_at?: string;
};

const mapParticipant = (row: ParticipantRow): Participant => ({
  id: row.id,
  name: row.name,
  role: row.role as UserRole,
  language: row.language,
  status: row.status as UserStatus,
  avatar: row.avatar,
  gender: row.gender ?? undefined,
});

export const fetchParticipantsForRoom = async (roomCode: string) => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('room_code', roomCode);
  if (error || !data) return [];
  return data.map(mapParticipant);
};

export const upsertParticipant = async (roomCode: string, participant: Participant) => {
  if (!supabase) return;
  await supabase.from('participants').upsert({
    id: participant.id,
    room_code: roomCode,
    name: participant.name,
    role: participant.role,
    language: participant.language,
    status: participant.status,
    avatar: participant.avatar,
    gender: participant.gender ?? null,
    updated_at: new Date().toISOString(),
  });
};

export const updateParticipant = async (
  roomCode: string,
  participantId: string,
  updates: Partial<Participant>
) => {
  if (!supabase) return;
  await supabase
    .from('participants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('room_code', roomCode)
    .eq('id', participantId);
};

export const removeParticipant = async (roomCode: string, participantId: string) => {
  if (!supabase) return;
  await supabase
    .from('participants')
    .delete()
    .eq('room_code', roomCode)
    .eq('id', participantId);
};

export const subscribeToParticipants = (
  roomCode: string,
  onChange: (payload: { eventType: string; new: ParticipantRow; old: ParticipantRow }) => void
): RealtimeChannel | null => {
  if (!supabase) return null;
  return supabase
    .channel(`participants-${roomCode}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'participants', filter: `room_code=eq.${roomCode}` },
      (payload) => onChange(payload as { eventType: string; new: ParticipantRow; old: ParticipantRow })
    )
    .subscribe();
};

export const mapParticipantFromPayload = (row: ParticipantRow) => mapParticipant(row);

export const fetchMessagesForRoom = async (roomCode: string) => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_code', roomCode)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as MessageRow[];
};

export const insertMessage = async (roomCode: string, message: MessageRow) => {
  if (!supabase) return;
  await supabase.from('messages').insert({
    room_code: roomCode,
    sender_id: message.sender_id,
    sender_name: message.sender_name,
    original_text: message.original_text,
    source_language: message.source_language ?? null,
    created_at: message.created_at ?? new Date().toISOString(),
  });
};

export const subscribeToMessages = (
  roomCode: string,
  onChange: (payload: { eventType: string; new: MessageRow; old: MessageRow }) => void
): RealtimeChannel | null => {
  if (!supabase) return null;
  return supabase
    .channel(`messages-${roomCode}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_code=eq.${roomCode}` },
      (payload) => onChange(payload as { eventType: string; new: MessageRow; old: MessageRow })
    )
    .subscribe();
};

export const mapMessageFromPayload = (row: MessageRow) => row;
