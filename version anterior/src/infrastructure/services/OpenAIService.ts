
import OpenAI from 'openai';

// Ensure you have VITE_OPENAI_API_KEY in your .env
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

let openai: OpenAI | null = null;

if (OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
    baseURL: (typeof window !== 'undefined' ? window.location.origin : '') + '/openai-api/v1'
  });
} else {
  console.warn('VITE_OPENAI_API_KEY is not set. Memory vector search will not work.');
}

export const generateEmbedding = async (text: string): Promise<number[] | null> => {
  if (!openai) return null;

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('[OpenAIService] Error generating embedding:', error);
    return null;
  }
};
export const generateImageContextSummary = async (messages: any[]): Promise<string | null> => {
  if (!openai) return null;

  const historyText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un experto en síntesis creativa. Tu tarea es extraer la idea principal, el estilo visual, los colores, los sujetos y el ambiente de una conversación de marketing para que un generador de imágenes (Nexo) pueda continuar el trabajo. Resume en un párrafo denso y creativo en ESPAÑOL la visión que el usuario quiere materializar."
        },
        {
          role: "user",
          content: `Resume la visión creativa de esta conversación:\n\n${historyText}`
        }
      ],
      temperature: 0.7
    });

    return response.choices[0].message?.content || null;
  } catch (error) {
    console.error('[OpenAIService] Error generating image context summary:', error);
    return null;
  }
};
