import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// DeepSeek API key is stored in process.env.OPENAI_API_KEY
const DEEPSEEK_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

/**
 * Generate vector embedding for a given text.
 * Since DeepSeek does not offer an embedding API, we generate a consistent mock
 * 1536-dimensional embedding vector so the database queries (which require a 1536-dim vector)
 * function seamlessly.
 * 
 * @param {string} text - The input text to embed
 * @returns {Promise<Array<number>>} - Vector embedding array (1536 dimensions)
 */
export async function embedText(text) {
  if (!text || text.trim() === '') {
    throw new Error('Text input cannot be empty for embedding');
  }

  try {
    // Generate a consistent, pseudo-random embedding vector based on the hash of the text
    // to ensure that identical text yields the identical embedding.
    const dimensions = 1536;
    const embedding = new Array(dimensions).fill(0);
    
    // Simple hash function to seed the values
    let hash = 0;
    const cleanText = text.trim().toLowerCase();
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Fill the array with deterministic pseudo-random floats between -1 and 1
    let seed = Math.abs(hash) || 1;
    for (let i = 0; i < dimensions; i++) {
      // Linear congruential generator (LCG) for deterministic values
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      embedding[i] = (seed / 4294967296) * 2 - 1;
    }

    // Normalize the vector (standard practice for cosine similarity)
    let magnitude = 0;
    for (let i = 0; i < dimensions; i++) {
      magnitude += embedding[i] * embedding[i];
    }
    magnitude = Math.sqrt(magnitude);
    
    if (magnitude > 0) {
      for (let i = 0; i < dimensions; i++) {
        embedding[i] = embedding[i] / magnitude;
      }
    }

    return embedding;
  } catch (error) {
    console.error('Error generating mock embedding:', error);
    throw error;
  }
}

/**
 * Generate a conversational response using DeepSeek Chat based ONLY on retrieved note context chunks
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

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating DeepSeek chat response:', error);
    throw error;
  }
}

