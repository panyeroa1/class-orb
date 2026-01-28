
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export interface LiveSessionCallbacks {
  onTranscription: (text: string, isInput: boolean) => void;
  onAudioData: (base64: string) => void;
  onTurnComplete: () => void;
  onError: (error: any) => void;
}

export class GeminiService {
  /**
   * Connect to the Gemini Live API for real-time interpretation.
   */
  async connectLive(sourceLanguage: string, targetLanguage: string, callbacks: LiveSessionCallbacks, context?: string) {
    const apiKey = import.meta.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing API Key");
      callbacks.onError(new Error("Missing API Key"));
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const contextBlock = context?.trim()
        ? `\n\nConversation context (use for terminology consistency, do not quote verbatim):\n${context.trim()}`
        : '';

      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                // Using the requested 'Orus' voice. 
                // If the backend doesn't support it, the model usually defaults to a standard high-quality one.
                voiceName: 'Orus'
              }
            },
          },
          systemInstruction: `You are a professional real-time interpreter.
          The speaker is speaking ${sourceLanguage}.
          Your job is to:
          1. Translate into ${targetLanguage} immediately.
          2. Speak ONLY the translation in ${targetLanguage} with high clarity.
          
          Important:
          - The platform already provides the source transcript via the input transcription channel.
          - Do NOT speak, repeat, or include the ${sourceLanguage} transcript in your output.
          - Do NOT mix languages in the same output.
          
          Guidelines:
          - Maintain the exact tone and emotion.
          - Do not add conversational filler.
          - Focus on financial and investment terminology accuracy where applicable.${contextBlock}`,
        },
        callbacks: {
          onopen: () => console.log("Gemini session open"),
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              callbacks.onTranscription(message.serverContent.inputTranscription.text, true);
            } else if (message.serverContent?.outputTranscription) {
              callbacks.onTranscription(message.serverContent.outputTranscription.text, false);
            }

            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              callbacks.onAudioData(audioData);
            }

            if (message.serverContent?.turnComplete) {
              callbacks.onTurnComplete();
            }
          },
          onerror: (e) => {
            console.error("Gemini Live Error:", e);
            callbacks.onError(e);
          },
          onclose: (e) => console.log("Gemini session closed"),
        }
      });

      return session;
    } catch (err) {
      callbacks.onError(err);
      throw err;
    }
  }

  async generateSpeech(text: string): Promise<string | undefined> {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Orus' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }

  async translateText(text: string, sourceLanguage: string, targetLanguage: string, context?: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.GEMINI_API_KEY || '' });

    const contextBlock = context?.trim()
      ? `\n\nContext:\n${context.trim()}`
      : "";

    const prompt = `Translate from ${sourceLanguage || "the source language"} to ${targetLanguage}.
Output ONLY the translation, no extra commentary.${contextBlock}

Text:
${text}`.trim();

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  }
}

export const geminiService = new GeminiService();
