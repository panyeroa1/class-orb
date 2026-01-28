import { supabase } from './supabaseService';

export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context?: string
) => {
  if (!supabase) {
    return '';
  }
  const { data, error } = await supabase.functions.invoke('translate', {
    body: {
      text,
      sourceLanguage,
      targetLanguage,
      context,
    },
  });

  if (error) {
    throw error;
  }

  return (data?.translation as string | undefined) ?? '';
};
