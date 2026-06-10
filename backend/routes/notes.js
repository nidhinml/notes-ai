import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import sql from '../db/index.js';
import { embedText } from '../services/openai.js';

const router = express.Router();

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';

// GET /api/notes - fetch all notes for DEFAULT_USER_ID
router.get('/', async (req, res) => {
  try {
    const rows = await sql(
      'SELECT id, title, content, created_at FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
      [DEFAULT_USER_ID]
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
      [newNoteId, DEFAULT_USER_ID, title, content, content, embeddingStr]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating note:', error);
    const isApiKeyError = error.status === 400 || error.status === 403 || error.message?.includes('API key') || error.message?.toLowerCase().includes('key');
    const message = isApiKeyError
      ? 'Invalid Gemini API key configured in backend/.env. Please replace it with a valid key.'
      : 'Failed to create note';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/notes/:id - delete a note by id and user_id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await sql(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, DEFAULT_USER_ID]
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
