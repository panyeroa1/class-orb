import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, off, get, update, remove } from 'firebase/database';
import { Participant, Message } from '../types';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

// Participants
export const fetchParticipantsForRoom = async (roomCode: string) => {
    const roomRef = ref(database, `rooms/${roomCode}/participants`);
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as Participant[];
    }
    return [];
};

export const upsertParticipant = async (roomCode: string, participant: Participant) => {
    const participantRef = ref(database, `rooms/${roomCode}/participants/${participant.id}`);
    await set(participantRef, {
        ...participant,
        updated_at: new Date().toISOString()
    });
};

export const updateParticipant = async (
    roomCode: string,
    participantId: string,
    updates: Partial<Participant>
) => {
    const participantRef = ref(database, `rooms/${roomCode}/participants/${participantId}`);
    await update(participantRef, {
        ...updates,
        updated_at: new Date().toISOString()
    });
};

export const removeParticipant = async (roomCode: string, participantId: string) => {
    const participantRef = ref(database, `rooms/${roomCode}/participants/${participantId}`);
    await remove(participantRef);
};

export const subscribeToParticipants = (
    roomCode: string,
    callback: (participants: Participant[]) => void
) => {
    const roomRef = ref(database, `rooms/${roomCode}/participants`);
    const listener = onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            callback(Object.values(data) as Participant[]);
        } else {
            callback([]);
        }
    });
    return () => off(roomRef, 'value', listener);
};

// Messages
export const fetchMessagesForRoom = async (roomCode: string) => {
    const messagesRef = ref(database, `rooms/${roomCode}/messages`);
    const snapshot = await get(messagesRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as any[];
    }
    return [];
};

export const insertMessage = async (roomCode: string, message: any) => {
    const messagesRef = ref(database, `rooms/${roomCode}/messages`);
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, {
        ...message,
        id: newMessageRef.key,
        room_code: roomCode,
        created_at: new Date().toISOString()
    });
};

export const subscribeToMessages = (
    roomCode: string,
    callback: (messages: Message[]) => void
) => {
    const messagesRef = ref(database, `rooms/${roomCode}/messages`);
    const listener = onValue(messagesRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const rawMessages = Object.values(data) as any[];
            const messages: Message[] = rawMessages.map(m => ({
                id: m.id || m.sender_id + m.created_at,
                senderId: m.senderId || m.sender_id,
                senderName: m.senderName || m.sender_name,
                originalText: m.originalText || m.original_text,
                translatedText: m.translatedText,
                sourceLanguage: m.sourceLanguage || m.source_language,
                timestamp: m.timestamp || (m.created_at ? new Date(m.created_at).getTime() : Date.now())
            }));
            callback(messages);
        } else {
            callback([]);
        }
    });
    return () => off(messagesRef, 'value', listener);
};
