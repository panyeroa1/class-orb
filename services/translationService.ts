import { geminiService } from './geminiService';

export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context?: string
) => {
  try {
    return await geminiService.translateText(text, sourceLanguage, targetLanguage, context);
  } catch (err) {
    console.error("Translation error:", err);
    return text; // Fallback to original text
  }
};
