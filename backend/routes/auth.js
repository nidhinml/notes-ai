import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import sql from '../db/index.js';

const router = express.Router();

/**
 * POST /api/auth/check
 * Body: { secretKey: string }
 * Checks if a secret key is already registered WITHOUT creating anything.
 * Returns: { exists: boolean }
 * 
 * Used by the frontend to implement the 2-step flow:
 *   Step 1 → /check  → inform user: "key is taken" or "new key"
 *   Step 2 → /validate → actually log in or create account
 */
router.post('/check', async (req, res) => {
  const { secretKey } = req.body;

  if (!secretKey || secretKey.trim() === '') {
    return res.status(400).json({ error: 'Secret key is required' });
  }

  const trimmedKey = secretKey.trim();

  try {
    const matchedUsers = await sql(
      'SELECT id FROM users WHERE secret_key = $1',
      [trimmedKey]
    );

    return res.json({ exists: matchedUsers.length > 0 });
  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({ error: 'Check failed. Please try again.' });
  }
});

/**
 * POST /api/auth/validate
 * Body: { secretKey: string }
 * If key exists → login (return existing userId).
 * If key is new → create new user and return new userId.
 * Returns: { valid: true, userId, isNew }
 */
router.post('/validate', async (req, res) => {
  const { secretKey } = req.body;

  if (!secretKey || secretKey.trim() === '') {
    return res.status(400).json({ error: 'Secret key is required' });
  }

  const trimmedKey = secretKey.trim();

  try {
    const matchedUsers = await sql(
      'SELECT id FROM users WHERE secret_key = $1',
      [trimmedKey]
    );

    if (matchedUsers.length > 0) {
      return res.json({ valid: true, userId: matchedUsers[0].id, isNew: false });
    }

    // Create a new user mapped to this secret key
    const newUserId = uuidv4();
    const mockEmail = `${trimmedKey.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}@personal.ai`;
    const userName = trimmedKey.substring(0, 50);

    await sql(
      `INSERT INTO users (id, email, name, secret_key) VALUES ($1, $2, $3, $4)`,
      [newUserId, mockEmail, userName, trimmedKey]
    );

    console.log(`✓ New user created with key "${trimmedKey}" → UUID: ${newUserId}`);
    return res.json({ valid: true, userId: newUserId, isNew: true });
  } catch (error) {
    console.error('Auth validate error:', error);
    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

/**
 * POST /api/auth/suggest-key
 * Returns a randomly generated strong unique key for new users.
 */
router.get('/suggest-key', (_req, res) => {
  const words = ['galaxy', 'storm', 'forest', 'river', 'falcon', 'ember', 'nova', 'drift', 'cipher', 'vault'];
  const word1 = words[Math.floor(Math.random() * words.length)];
  const word2 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const suggested = `${word1}-${word2}-${num}`;
  return res.json({ key: suggested });
});

export default router;
