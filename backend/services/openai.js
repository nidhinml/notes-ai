import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Google Gen AI client using the user's Gemini key (stored in OPENAI_API_KEY)
const ai = new GoogleGenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate vector embedding for a given text using gemini-embedding-2 (1536 dimensions)
 * @param {string} text - The input text to embed
 * @returns {Promise<Array<number>>} - Vector embedding array (1536 dimensions)
 */
export async function embedText(text) {
  if (!text || text.trim() === '') {
    throw new Error('Text input cannot be empty for embedding');
  }

  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
      config: {
        outputDimensionality: 1536,
      },
    });
    
    if (!response.embeddings || response.embeddings.length === 0) {
      throw new Error('Failed to retrieve embeddings from Gemini API');
    }
    
    return response.embeddings[0].values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate a conversational response using gemini-2.5-flash based ONLY on retrieved note context chunks
 * @param {string} question - The user question
 * @param {Array<object>} contextChunks - Array of note chunks { title, chunk_text }
 * @returns {Promise<string>} - The LLM answer
 */
export async function askLLM(question, contextChunks) {
  try {
    const formattedChunks = contextChunks.length > 0
      ? contextChunks.map(chunk => `Note: ${chunk.title}\n${chunk.chunk_text}`).join('\n\n---\n\n')
      : 'No context notes provided.';

    const currentDate = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const systemPrompt = `You are a personal assistant. The current date is: ${currentDate}. Answer the user's question using the notes provided as context. If the question requires date calculations, calendar math, or logical reasoning based on facts retrieved from the notes (such as computing age, days of the week, or simple calculations relative to the current date), you are encouraged to compute the answer yourself using your general knowledge. If the core fact is not in the notes, say so clearly. Always be concise and helpful.`;

    const userContent = `Context:\n"""\n${formattedChunks}\n"""\n\nQuestion: ${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 500,
        temperature: 0.3,
      },
    });

    return response.text;
  } catch (error) {
    console.error('Error generating LLM chat response:', error);
    throw error;
  }
}
