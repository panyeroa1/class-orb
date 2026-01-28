
import { LiveSessionCallbacks } from "./geminiService";

export class OpenAIService {
    private ws: WebSocket | null = null;

    /**
     * Connect to OpenAI Realtime API via local proxy.
     */
    async connectLive(sourceLanguage: string, targetLanguage: string, callbacks: LiveSessionCallbacks, context?: string) {
        // Connect to the proxy path
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const url = `${protocol}//${host}/openai-realtime`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log("OpenAI Realtime session connected");

            // Initialize Session with instructions
            const contextBlock = context?.trim()
                ? `\n\nContext:\n${context.trim()}`
                : '';

            const instructions = `You are a professional real-time interpreter.
The speaker is speaking ${sourceLanguage}.
Your job is to:
1. Translate into ${targetLanguage} immediately.
2. Speak ONLY the translation in ${targetLanguage}.
3. Do NOT repeat the original text.
4. Maintain tone and emotion.${contextBlock}`;

            const event = {
                type: 'session.update',
                session: {
                    modalities: ['text', 'audio'],
                    instructions: instructions,
                    voice: 'alloy', // Support: alloy, echo, shimmer, ash, ballad, coral, sage, verse
                    input_audio_format: 'pcm16',
                    output_audio_format: 'pcm16',
                    turn_detection: {
                        type: 'server_vad',
                        threshold: 0.5,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 500
                    }
                }
            };
            this.ws?.send(JSON.stringify(event));
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'item.created':
                        // Could use to track items
                        break;
                    case 'response.audio_transcript.delta':
                        callbacks.onTranscription(data.delta, false); // false = output
                        break;
                    case 'conversation.item.input_audio_transcription.completed':
                        // This is the user's transcription
                        if (data.transcript) {
                            callbacks.onTranscription(data.transcript, true); // true = input
                        }
                        break;
                    case 'response.audio.delta':
                        callbacks.onAudioData(data.delta);
                        break;
                    case 'response.done':
                        callbacks.onTurnComplete();
                        break;
                    case 'error':
                        console.error("OpenAI Error:", data.error);
                        callbacks.onError(data.error);
                        break;
                }
            } catch (e) {
                console.error("Error parsing OpenAI message", e);
            }
        };

        this.ws.onerror = (e) => {
            console.error("WebSocket Error", e);
            callbacks.onError(e);
        };

        this.ws.onclose = () => {
            console.log("OpenAI session closed");
        };

        // Return an object compatible with the "session" interface expected by App.tsx
        return {
            sendRealtimeInput: (data: { media: { data: string; mimeType: string } }) => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    const event = {
                        type: 'input_audio_buffer.append',
                        audio: data.media.data
                    };
                    this.ws.send(JSON.stringify(event));
                }
            },
            close: () => {
                this.ws?.close();
            },
            disconnect: () => {
                this.ws?.close();
            }
        };
    }

    // Helper to match GeminiService interface for static calls if any (though App.tsx uses instance)
    async generateSpeech(text: string): Promise<string | undefined> {
        // TODO: Implement OpenAI TTS if needed, or fallback
        console.warn("generateSpeech not implemented for OpenAI yet");
        return undefined;
    }
}

export const openaiService = new OpenAIService();
