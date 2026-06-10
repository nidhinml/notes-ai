import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import sql from '../db/index.js';
import { embedText } from '../services/openai.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Mount authentication middleware to resolve user_id dynamically
router.use(authMiddleware);

// GET /api/notes - fetch all notes for authenticated user
router.get('/', async (req, res) => {
  try {
    const rows = await sql(
      'SELECT id, title, content, created_at FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/notes - create a new note
router.post('/', async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    // Generate embedding from content
    const embedding = await embedText(content);
    const embeddingStr = `[${embedding.join(',')}]`;
    const newNoteId = uuidv4();

    const result = await sql(
      `INSERT INTO notes (id, user_id, title, content, chunk_text, embedding)
       VALUES ($1, $2, $3, $4, $5, $6::vector)
       RETURNING id, title, content, created_at`,
      [newNoteId, req.user_id, title, content, content, embeddingStr]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating note:', error);
    const isApiKeyError = error.status === 400 || error.status === 403 || error.message?.includes('API key') || error.message?.toLowerCase().includes('key');
    const message = isApiKeyError
      ? 'Invalid DeepSeek API key configured in backend/.env. Please replace it with a valid key.'
      : 'Failed to create note';
    res.status(500).json({ error: message });
  }
});

// PUT /api/notes/:id - update a note and its embeddings
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    // Generate embedding from content
    const embedding = await embedText(content);
    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await sql(
      `UPDATE notes 
       SET title = $1, content = $2, chunk_text = $3, embedding = $4::vector, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 AND user_id = $6 
       RETURNING id, title, content, created_at`,
      [title, content, content, embeddingStr, id, req.user_id]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating note:', error);
    const isApiKeyError = error.status === 400 || error.status === 403 || error.message?.includes('API key') || error.message?.toLowerCase().includes('key');
    const message = isApiKeyError
      ? 'Invalid DeepSeek API key configured in backend/.env. Please replace it with a valid key.'
      : 'Failed to update note';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/notes/:id - delete a note by id and user_id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await sql(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user_id]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
