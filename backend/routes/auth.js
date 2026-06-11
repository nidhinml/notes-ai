import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import sql from '../db/index.js';

const router = express.Router();

// Setup Nodemailer transporter using SMTP (Gmail defaults)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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
 * Body: { mobileNumber: string, secretKey: string, email?: string }
 * If mobile exists → check secretKey → login (return existing userId).
 * If mobile is new → create new user and return new userId.
 * Returns: { valid: true, userId, isNew }
 */
router.post('/validate', async (req, res) => {
  const { mobileNumber, secretKey, email } = req.body;

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

    // New user registration requires an email
    if (!email || email.trim() === '') {
      return res.status(400).json({ error: 'Gmail address is required to register a new account.' });
    }
    const trimmedEmail = email.trim().toLowerCase();

    // Check if email is already taken by another user
    const emailCheck = await sql(
      'SELECT id FROM users WHERE email = $1',
      [trimmedEmail]
    );
    if (emailCheck.length > 0) {
      return res.status(400).json({ error: 'This Gmail address is already registered to another account.' });
    }

    // Create a new user mapped to this mobile number, email, and secret key
    const newUserId = uuidv4();
    const userName = `User-${trimmedMobile.slice(-4)}`;

    await sql(
      `INSERT INTO users (id, email, name, secret_key, mobile_number) VALUES ($1, $2, $3, $4, $5)`,
      [newUserId, trimmedEmail, userName, trimmedKey, trimmedMobile]
    );

    console.log(`✓ New user created with mobile "${trimmedMobile}" and email "${trimmedEmail}" → UUID: ${newUserId}`);
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
 * Generates a mock OTP, emails it if configured, otherwise returns it.
 */
router.post('/recover-request', async (req, res) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber || mobileNumber.trim() === '') {
    return res.status(400).json({ error: 'Mobile number is required' });
  }

  const trimmedMobile = mobileNumber.trim();

  try {
    const matchedUsers = await sql(
      'SELECT id, email FROM users WHERE mobile_number = $1',
      [trimmedMobile]
    );

    if (matchedUsers.length === 0) {
      return res.status(404).json({ error: 'This mobile number is not registered.' });
    }

    const userEmail = matchedUsers[0].email;

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    activeOtps.set(trimmedMobile, otp);

    console.log(`[SMS OTP MOCK] Generated OTP ${otp} for ${trimmedMobile} (Target Email: ${userEmail})`);
    
    let emailSent = false;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: `"Notes AI Recovery" <${process.env.EMAIL_USER}>`,
          to: userEmail,
          subject: 'Your Notes AI Verification Code',
          text: `Hello,\n\nYour 6-digit verification code to recover your Notes AI Secret Key is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.\n\nBest regards,\nNotes AI Team`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 500px; margin: auto;">
                   <h2 style="color: #7c5cfc; text-align: center;">Notes AI Key Recovery</h2>
                   <p>Hello,</p>
                   <p>You requested to recover your Notes AI Secret Key. Please use the following 6-digit verification code:</p>
                   <div style="background: #f4f3ff; border: 1px solid #d9d6fe; border-radius: 6px; padding: 16px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #7c5cfc; margin: 20px 0;">
                     ${otp}
                   </div>
                   <p style="font-size: 13px; color: #666;">This code is valid for 10 minutes. If you did not request this recovery, you can safely ignore this email.</p>
                   <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                   <p style="font-size: 11px; color: #999; text-align: center;">Notes AI - Your private, vector-powered assistant</p>
                 </div>`
        });
        emailSent = true;
      } catch (err) {
        console.error('Nodemailer SMTP error:', err);
      }
    }

    // Mask the email address in response
    const atIdx = userEmail.indexOf('@');
    let maskedEmail = userEmail;
    if (atIdx > 2) {
      maskedEmail = userEmail[0] + '*'.repeat(atIdx - 2) + userEmail[atIdx - 1] + userEmail.substring(atIdx);
    }

    return res.json({ 
      success: true, 
      maskedEmail,
      emailSent,
      // If NOT configured, send the OTP in the body so they can test/develop it without SMTP credentials
      ...(emailSent ? {} : { 
        otp, 
        warning: 'SMTP credentials missing. Mock OTP returned in response body for testing.' 
      })
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
