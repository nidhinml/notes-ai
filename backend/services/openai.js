import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate vector embedding for a given text using text-embedding-3-small
 * @param {string} text - The input text to embed
 * @returns {Promise<Array<number>>} - Vector embedding array (1536 dimensions)
 */
export async function embedText(text) {
  if (!text || text.trim() === '') {
    throw new Error('Text input cannot be empty for embedding');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate a conversational response using gpt-4o-mini based ONLY on retrieved note context chunks
 * @param {string} question - The user question
 * @param {Array<object>} contextChunks - Array of note chunks { title, chunk_text }
 * @returns {Promise<string>} - The LLM answer
 */
export async function askLLM(question, contextChunks) {
  try {
    const formattedChunks = contextChunks.length > 0
      ? contextChunks.map(chunk => `Note: ${chunk.title}\n${chunk.chunk_text}`).join('\n\n---\n\n')
      : 'No context notes provided.';

    const systemPrompt = "You are a personal assistant. Answer the user's question using ONLY the notes provided as context. If the answer is not found in the notes, say so clearly. Always be concise and helpful.";

    const userContent = `Context:\n"""\n${formattedChunks}\n"""\n\nQuestion: ${question}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      max_tokens: 500,
      temperature: 0.3, // keeps it concise and strictly adhering to context
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating LLM chat response:', error);
    throw error;
  }
}
