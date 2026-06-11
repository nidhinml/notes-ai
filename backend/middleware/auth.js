import { v4 as uuidv4 } from 'uuid';
import sql from '../db/index.js';

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';

export async function authMiddleware(req, res, next) {
  const secretKey = req.headers['x-secret-key'];

  // If no secret key is provided, default to the seeded test user
  if (!secretKey || secretKey.trim() === '') {
    req.user_id = DEFAULT_USER_ID;
    req.secret_key = 'default-secret-seed-key-32-chars';
    return next();
  }

  try {
    const trimmedKey = secretKey.trim();
    req.secret_key = trimmedKey;
    
    // Look up user by secret_key
    const matchedUsers = await sql(
      'SELECT id FROM users WHERE secret_key = $1',
      [trimmedKey]
    );

    if (matchedUsers.length > 0) {
      req.user_id = matchedUsers[0].id;
      return next();
    }

    // If no user is mapped to this secret key, create a new one dynamically
    const newUserId = uuidv4();
    const mockEmail = `${trimmedKey}-${Date.now()}@personal.ai`; // Ensure uniqueness
    const userName = trimmedKey.substring(0, 50);

    await sql(
      `INSERT INTO users (id, email, name, secret_key) 
       VALUES ($1, $2, $3, $4)`,
      [newUserId, mockEmail, userName, trimmedKey]
    );

    console.log(`✓ Created new user dynamic profile with key "${trimmedKey}" mapped to UUID: ${newUserId}`);
    req.user_id = newUserId;
    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(500).json({ error: 'Database authentication failed' });
  }
}
