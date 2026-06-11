import { v4 as uuidv4 } from 'uuid';
import sql from '../db/index.js';

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';

export async function authMiddleware(req, res, next) {
  const secretKey = req.headers['x-secret-key'];
  const mobileNumber = req.headers['x-mobile-number'];

  // Reject requests missing headers
  if (!secretKey || secretKey.trim() === '') {
    return res.status(401).json({ error: 'Authentication required. Please set your secret key.' });
  }
  if (!mobileNumber || mobileNumber.trim() === '') {
    return res.status(401).json({ error: 'Authentication required. Please set your mobile number.' });
  }

  try {
    const trimmedKey = secretKey.trim();
    const trimmedMobile = mobileNumber.trim();
    req.secret_key = trimmedKey;
    req.mobile_number = trimmedMobile;
    
    // Look up user by mobile number
    const matchedUsers = await sql(
      'SELECT id, secret_key FROM users WHERE mobile_number = $1',
      [trimmedMobile]
    );

    if (matchedUsers.length > 0) {
      if (matchedUsers[0].secret_key === trimmedKey) {
        req.user_id = matchedUsers[0].id;
        return next();
      } else {
        return res.status(401).json({ error: 'Incorrect secret key for this mobile number.' });
      }
    }

    // If no user is mapped to this mobile number, create a new one dynamically
    const newUserId = uuidv4();
    const mockEmail = `${trimmedMobile}-${Date.now()}@personal.ai`; // Ensure uniqueness
    const userName = `User-${trimmedMobile.slice(-4)}`;

    await sql(
      `INSERT INTO users (id, email, name, secret_key, mobile_number) 
       VALUES ($1, $2, $3, $4, $5)`,
      [newUserId, mockEmail, userName, trimmedKey, trimmedMobile]
    );

    console.log(`✓ Created new user dynamic profile with mobile "${trimmedMobile}" mapped to UUID: ${newUserId}`);
    req.user_id = newUserId;
    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(500).json({ error: 'Database authentication failed' });
  }
}
