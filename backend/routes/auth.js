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
  const { mobileNumber, secretKey } = req.body;

  if (!mobileNumber || mobileNumber.trim() === '') {
    return res.status(400).json({ error: 'Mobile number is required' });
  }
  if (!secretKey || secretKey.trim() === '') {
    return res.status(400).json({ error: 'Secret key is required' });
  }

  const trimmedMobile = mobileNumber.trim();
  const trimmedKey = secretKey.trim();

  try {
    const matchedUsers = await sql(
      'SELECT id, secret_key FROM users WHERE mobile_number = $1',
      [trimmedMobile]
    );

    if (matchedUsers.length > 0) {
      if (matchedUsers[0].secret_key === trimmedKey) {
        return res.json({ exists: true, correctKey: true });
      } else {
        return res.status(401).json({ error: 'Incorrect secret key for this mobile number.' });
      }
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({ error: 'Check failed. Please try again.' });
  }
});

/**
 * POST /api/auth/validate
 * Body: { mobileNumber: string, secretKey: string }
 * If mobile exists → check secretKey → login (return existing userId).
 * If mobile is new → create new user and return new userId.
 * Returns: { valid: true, userId, isNew }
 */
router.post('/validate', async (req, res) => {
  const { mobileNumber, secretKey } = req.body;

  if (!mobileNumber || mobileNumber.trim() === '') {
    return res.status(400).json({ error: 'Mobile number is required' });
  }
  if (!secretKey || secretKey.trim() === '') {
    return res.status(400).json({ error: 'Secret key is required' });
  }

  const trimmedMobile = mobileNumber.trim();
  const trimmedKey = secretKey.trim();

  try {
    const matchedUsers = await sql(
      'SELECT id, secret_key FROM users WHERE mobile_number = $1',
      [trimmedMobile]
    );

    if (matchedUsers.length > 0) {
      if (matchedUsers[0].secret_key === trimmedKey) {
        return res.json({ valid: true, userId: matchedUsers[0].id, isNew: false });
      } else {
        return res.status(401).json({ error: 'Incorrect secret key for this mobile number.' });
      }
    }

    // Create a new user mapped to this mobile number and secret key
    const newUserId = uuidv4();
    const mockEmail = `${trimmedMobile}-${Date.now()}@personal.ai`;
    const userName = `User-${trimmedMobile.slice(-4)}`;

    await sql(
      `INSERT INTO users (id, email, name, secret_key, mobile_number) VALUES ($1, $2, $3, $4, $5)`,
      [newUserId, mockEmail, userName, trimmedKey, trimmedMobile]
    );

    console.log(`✓ New user created with mobile "${trimmedMobile}" → UUID: ${newUserId}`);
    return res.json({ valid: true, userId: newUserId, isNew: true });
  } catch (error) {
    console.error('Auth validate error:', error);
    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// In-memory store for active OTPs: mobileNumber -> otp
const activeOtps = new Map();

/**
 * POST /api/auth/recover-request
 * Body: { mobileNumber: string }
 * Generates a mock OTP and returns it.
 */
router.post('/recover-request', async (req, res) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber || mobileNumber.trim() === '') {
    return res.status(400).json({ error: 'Mobile number is required' });
  }

  const trimmedMobile = mobileNumber.trim();

  try {
    const matchedUsers = await sql(
      'SELECT id FROM users WHERE mobile_number = $1',
      [trimmedMobile]
    );

    if (matchedUsers.length === 0) {
      return res.status(404).json({ error: 'This mobile number is not registered.' });
    }

    // Generate a random 6-digit mock OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    activeOtps.set(trimmedMobile, otp);

    console.log(`[SMS OTP MOCK] Sent OTP ${otp} to ${trimmedMobile}`);
    
    // For development, we return the OTP in the response body so the frontend can mock-simulate showing it.
    return res.json({ 
      success: true, 
      otp, 
      message: 'OTP sent successfully (mocked).' 
    });
  } catch (error) {
    console.error('Recover request error:', error);
    return res.status(500).json({ error: 'Failed to initiate recovery.' });
  }
});

/**
 * POST /api/auth/recover-verify
 * Body: { mobileNumber: string, otp: string }
 * Returns the plain-text secretKey if valid.
 */
router.post('/recover-verify', async (req, res) => {
  const { mobileNumber, otp } = req.body;

  if (!mobileNumber || mobileNumber.trim() === '') {
    return res.status(400).json({ error: 'Mobile number is required' });
  }
  if (!otp || otp.trim() === '') {
    return res.status(400).json({ error: 'OTP is required' });
  }

  const trimmedMobile = mobileNumber.trim();
  const trimmedOtp = otp.trim();

  const storedOtp = activeOtps.get(trimmedMobile);

  if (!storedOtp || storedOtp !== trimmedOtp) {
    return res.status(400).json({ error: 'Invalid or expired OTP.' });
  }

  try {
    const matchedUsers = await sql(
      'SELECT secret_key FROM users WHERE mobile_number = $1',
      [trimmedMobile]
    );

    if (matchedUsers.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Clear OTP after successful verification
    activeOtps.delete(trimmedMobile);

    return res.json({ 
      success: true, 
      secretKey: matchedUsers[0].secret_key 
    });
  } catch (error) {
    console.error('Recover verify error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP.' });
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
