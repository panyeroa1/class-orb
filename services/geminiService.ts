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
  async connectLive(
    sourceLanguage: string,
    targetLanguage: string,
    callbacks: LiveSessionCallbacks,
    context?: string
  ) {
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
        : "";

      // High-nuance, STT-aware, spoken-output interpreter instruction.
      const systemInstruction = [
        `You are a professional REAL-TIME interpreter for live speech.`,
        ``,
        `SOURCE language: ${sourceLanguage}`,
        `TARGET language: ${targetLanguage}`,
        ``,
        `Primary objective:`,
        `- Hear the speaker's intent and immediately speak the translation ONLY in ${targetLanguage}.`,
        ``,
        `Critical output rules:`,
        `- Output MUST be ONLY the translation in ${targetLanguage}.`,
        `- NEVER repeat, quote, or include the ${sourceLanguage} transcript.`,
        `- NEVER mix languages in the same output.`,
        `- NO meta text (no "translation:", no explanations, no brackets, no stage directions).`,
        ``,
        `STT / live-speech handling (very important):`,
        `- The input is an ASR transcript and may contain: disfluencies, false starts, repetitions, partial clauses, and mis-hearings.`,
        `- Produce a spoken translation that sounds natural aloud while preserving meaning.`,
        `- Lightly clean obvious ASR artifacts (duplicate words, broken punctuation, mid-word fragments) ONLY when it improves clarity.`,
        `- If the speaker self-corrects, preserve the self-correction (do not "smooth it away").`,
        `- If the speaker trails off, trails off in the translation too (do not invent endings).`,
        `- If something is genuinely ambiguous or unclear, keep it non-committal (mirror uncertainty) rather than guessing details.`,
        ``,
        `Nuance preservation (do not lose the human):`,
        `- Preserve tone, emotion, attitude, and intent: politeness, urgency, sarcasm, humor, frustration, warmth, etc.`,
        `- Preserve register and relationship dynamics (formal vs casual, honorifics, respectful vs blunt).`,
        `- Preserve hedging and modality (e.g., "maybe", "I think", "probably", "might", "should", "must").`,
        `- Preserve intensity and emphasis (but do it through word choice and phrasing, not meta commentary).`,
        `- Preserve profanity/strong language at the same strength level (do not sanitize).`,
        ``,
        `Real-time pacing:`,
        `- Keep latency low: translate incrementally and keep each spoken chunk concise.`,
        `- Prefer short clauses/sentences that can be spoken immediately, without waiting for a long paragraph.`,
        `- Do NOT add conversational filler. Only add minimal connective words needed for grammatical speech in ${targetLanguage}.`,
        ``,
        `Numbers, names, and finance/investment accuracy:`,
        `- Preserve numbers exactly (amounts, rates, percentages, dates, tickers, units).`,
        `- If a proper noun/ticker appears, keep it as-is (do not translate brand/ticker names).`,
        `- Maintain domain-accurate terminology for finance and investment where applicable.`,
        `- Do not add disclaimers or advice; translate what was said, nothing more.`,
        contextBlock,
      ].join("\n");

      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Orus",
              },
            },
          },
          systemInstruction,
        },
        callbacks: {
          onopen: () => console.log("Gemini session open"),
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              callbacks.onTranscription(
                message.serverContent.inputTranscription.text,
                true
              );
            } else if (message.serverContent?.outputTranscription) {
              callbacks.onTranscription(
                message.serverContent.outputTranscription.text,
                false
              );
            }

            const audioData =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
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
        },
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
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Orus" },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }

  async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    context?: string
  ): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.GEMINI_API_KEY || "" });

    const contextBlock = context?.trim() ? `\n\nContext:\n${context.trim()}` : "";

    // Updated to match the "spoken, STT-aware, high nuance" translation style.
    const prompt = [
      `Translate from ${sourceLanguage || "the source language"} to ${targetLanguage}.`,
      `Output ONLY the translation (no commentary).`,
      ``,
      `Style requirements (STT / spoken):`,
      `- Render as natural spoken ${targetLanguage} (as if said aloud).`,
      `- Preserve tone, emotion, politeness level, sarcasm/humor, and hedging/modality.`,
      `- Keep numbers/tickers/proper nouns exact. Do not translate brand/ticker names.`,
      `- Lightly clean obvious ASR artifacts (repetitions/fragments) without changing meaning.`,
      `- If the source is incomplete or uncertain, keep it incomplete/uncertain—do not invent.`,
      contextBlock,
      ``,
      `Text:`,
      text,
    ].join("\n").trim();

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  }
}

export const geminiService = new GeminiService();
