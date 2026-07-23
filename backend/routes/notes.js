import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import sql from '../db/index.js';
import { embedText } from '../services/openai.js';
import { authMiddleware } from '../middleware/auth.js';
import { encryptText, decryptText } from '../services/cryptoutils.js';

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
    
    // Decrypt notes content for the client
    const decryptedRows = rows.map(note => ({
      ...note,
      content: decryptText(note.content, req.secret_key),
    }));
    
    res.json(decryptedRows);
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
    // Generate embedding from plaintext content
    const embedding = await embedText(content);
    const embeddingStr = `[${embedding.join(',')}]`;
    const newNoteId = uuidv4();

    // Encrypt content before storing in database
    const encryptedContent = encryptText(content, req.secret_key);

    const result = await sql(
      `INSERT INTO notes (id, user_id, title, content, chunk_text, embedding)
       VALUES ($1, $2, $3, $4, $5, $6::vector)
       RETURNING id, title, content, created_at`,
      [newNoteId, req.user_id, title, encryptedContent, encryptedContent, embeddingStr]
    );

    // Decrypt content in response payload
    const createdNote = {
      ...result[0],
      content: decryptText(result[0].content, req.secret_key),
    };

    res.status(201).json(createdNote);
  } catch (error) {
    console.error('Error creating note:', error);
    const isApiKeyError = error.status === 400 || error.status === 401 || error.status === 403 || error.message?.includes('API key') || error.message?.toLowerCase().includes('key');
    const message = isApiKeyError
      ? 'Invalid NVIDIA API key configured in backend/.env. Please replace it with a valid key.'
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

    // Encrypt content before storing in database
    const encryptedContent = encryptText(content, req.secret_key);

    const result = await sql(
      `UPDATE notes 
       SET title = $1, content = $2, chunk_text = $3, embedding = $4::vector, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 AND user_id = $6 
       RETURNING id, title, content, created_at`,
      [title, encryptedContent, encryptedContent, embeddingStr, id, req.user_id]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }

    // Decrypt content in response payload
    const updatedNote = {
      ...result[0],
      content: decryptText(result[0].content, req.secret_key),
    };

    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    const isApiKeyError = error.status === 400 || error.status === 401 || error.status === 403 || error.message?.includes('API key') || error.message?.toLowerCase().includes('key');
    const message = isApiKeyError
      ? 'Invalid NVIDIA API key configured in backend/.env. Please replace it with a valid key.'
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
