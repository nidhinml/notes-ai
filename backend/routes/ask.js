import express from 'express';
import sql from '../db/index.js';
import { embedText, askLLM } from '../services/openai.js';
import { authMiddleware } from '../middleware/auth.js';
import { decryptText } from '../services/cryptoutils.js';

const router = express.Router();

router.use(authMiddleware);

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

    // 2. Fetch notes for this user
    // To ensure accurate responses for queries like "recent notes", "tasks/todos", and "meetings",
    // we perform a hybrid search: combining semantic pgvector lookup with a keyword filter fallback.
    const cleanQuery = question.toLowerCase();
    
    // We fetch notes matching semantic similarity first
    const matchedNotes = await sql(
      `SELECT id, title, content, chunk_text, created_at 
       FROM notes 
       WHERE user_id = $1 
       ORDER BY embedding <=> $2::vector 
       LIMIT 5`,
      [req.user_id, queryEmbeddingStr]
    );

    // Fetch all user notes to perform direct keyword scans and date checks if semantic search missed them
    const allUserNotes = await sql(
      `SELECT id, title, content, chunk_text, created_at 
       FROM notes 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user_id]
    );

    // Decrypt all fetched notes so keyword scanner and context assembler operate on plaintext
    const decryptedAllNotes = allUserNotes.map(n => ({
      ...n,
      content: decryptText(n.content, req.secret_key),
      chunk_text: decryptText(n.content, req.secret_key)
    }));

    const decryptedMatchedNotes = matchedNotes.map(n => ({
      ...n,
      content: decryptText(n.content, req.secret_key),
      chunk_text: decryptText(n.content, req.secret_key)
    }));

    // Hybrid filter list using decrypted note objects
    let finalNotes = [];

    if (cleanQuery.includes('recent') || cleanQuery.includes('last notes') || cleanQuery.includes('summarize')) {
      // If user asks for recent notes, prioritize by creation date
      finalNotes = decryptedAllNotes.slice(0, 5);
    } else {
      // Dynamic keyword matching and scoring
      const stopwords = new Set([
        'what', 'is', 'the', 'a', 'an', 'on', 'in', 'at', 'my', 'your', 'for', 'to', 'of', 'and', 'or', 
        'with', 'when', 'where', 'who', 'how', 'why', 'did', 'does', 'do', 'has', 'have', 'had', 
        'are', 'was', 'were', 'be', 'been', 'about', 'this', 'that', 'these', 'those', 'then', 'there',
        'some', 'any', 'from', 'by', 'here', 'me', 'you', 'i', 'we', 'they', 'he', 'she', 'it', 'us'
      ]);

      const queryTerms = cleanQuery
        .split(/[^a-z0-9]+/)
        .filter(term => term.length >= 2 && !stopwords.has(term));

      let keywordMatchedNotes = [];

      if (queryTerms.length > 0) {
        const notesWithScores = decryptedAllNotes.map(note => {
          let score = 0;
          const titleLower = (note.title || '').toLowerCase();
          const contentLower = (note.content || '').toLowerCase();

          for (const term of queryTerms) {
            // High weight for title matches
            if (titleLower.includes(term)) {
              score += 20;
            }
            // Score based on occurrences in content
            const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escapedTerm, 'g');
            const matches = contentLower.match(regex);
            if (matches) {
              score += matches.length * 5;
            }
          }

          return { ...note, score };
        });

        // Filter out zero scores and sort by highest score
        keywordMatchedNotes = notesWithScores
          .filter(n => n.score > 0)
          .sort((a, b) => b.score - a.score);
      }

      // Merge keyword matches first, then fill up with semantic results
      const combined = [...keywordMatchedNotes, ...decryptedMatchedNotes];
      const unique = [];
      const seen = new Set();
      for (const n of combined) {
        if (!seen.has(n.id)) {
          seen.add(n.id);
          unique.push(n);
        }
      }
      finalNotes = unique.slice(0, 5);
    }

    // If no notes are found at all, return default response
    if (finalNotes.length === 0) {
      return res.json({
        answer: 'You have no notes yet. Start by adding some notes!',
        sources: []
      });
    }

    // 3. Build context chunks from retrieved notes
    const contextChunks = finalNotes.map(note => ({
      title: note.title,
      chunk_text: note.content // Pass decrypted content for complete context
    }));

    // 4. Generate answer string using OpenAI Chat API
    const answer = await askLLM(question, contextChunks);

    // 5. Compile unique sources response array
    const sources = finalNotes.map(note => ({
      id: note.id,
      title: note.title
    }));

    res.json({ answer, sources });
  } catch (error) {
    console.error('Error in ask handler:', error);
    const isApiKeyError = error.status === 400 || error.status === 401 || error.status === 403 || error.message?.includes('API key') || error.message?.toLowerCase().includes('key');
    const message = isApiKeyError
      ? 'Invalid NVIDIA API key configured in backend/.env. Please replace it with a valid key.'
      : 'Failed to process ask query';
    res.status(500).json({ error: message });
  }
});

export default router;
