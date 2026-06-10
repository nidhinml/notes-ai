import express from 'express';
import sql from '../db/index.js';
import { embedText, askLLM } from '../services/openai.js';

const router = express.Router();

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';

// POST /api/ask - RAG route matching user queries to note contents
router.post('/', async (req, res) => {
  const { question } = req.body;

  if (!question || question.trim() === '') {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    // 1. Embed the user question
    const queryEmbedding = await embedText(question);
    const queryEmbeddingStr = `[${queryEmbedding.join(',')}]`;

    // 2. Query Neon DB for top 3 most similar notes using pgvector cosine similarity (<=>)
    const matchedNotes = await sql(
      `SELECT id, title, chunk_text 
       FROM notes 
       WHERE user_id = $1 
       ORDER BY embedding <=> $2::vector 
       LIMIT 3`,
      [DEFAULT_USER_ID, queryEmbeddingStr]
    );

    // If no notes are found, return default response
    if (matchedNotes.length === 0) {
      return res.json({
        answer: 'You have no notes yet. Start by adding some notes!',
        sources: []
      });
    }

    // 3. Build context chunks from retrieved notes
    const contextChunks = matchedNotes.map(note => ({
      title: note.title,
      chunk_text: note.chunk_text
    }));

    // 4. Generate answer string using OpenAI Chat API
    const answer = await askLLM(question, contextChunks);

    // 5. Compile unique sources response array
    const sources = matchedNotes.map(note => ({
      id: note.id,
      title: note.title
    }));

    res.json({ answer, sources });
  } catch (error) {
    console.error('Error in ask handler:', error);
    const message = error.code === 'invalid_api_key'
      ? 'Invalid OpenAI API key configured in backend/.env. Please replace it with a valid key.'
      : 'Failed to process ask query';
    res.status(500).json({ error: message });
  }
});

export default router;
