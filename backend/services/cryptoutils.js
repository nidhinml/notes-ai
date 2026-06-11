import crypto from 'crypto';

// Hash raw secret key to produce a consistent 256-bit (32 byte) key
function getCipherKey(secretKey) {
  return crypto.createHash('sha256').update(String(secretKey)).digest();
}

/**
 * Encrypt a plain-text string using AES-256-GCM
 * @param {string} text - The input text to encrypt
 * @param {string} secretKey - The user's secret key
 * @returns {string} - Combined ciphertext (IV + AuthTag + EncryptedData) in hex format
 */
export function encryptText(text, secretKey) {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(12); // GCM standard IV size
    const key = getCipherKey(secretKey);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return formatted string: IV (24 hex chars) + AuthTag (32 hex chars) + Ciphertext
    return iv.toString('hex') + ':' + authTag + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption process failed');
  }
}

/**
 * Decrypt a cipher-text string using AES-256-GCM
 * @param {string} encryptedText - Formatted string (IV + AuthTag + Ciphertext)
 * @param {string} secretKey - The user's secret key
 * @returns {string} - Decrypted plaintext
 */
export function decryptText(encryptedText, secretKey) {
  if (!encryptedText) return '';
  // Return early if text is not in our encrypted format (fallback for unencrypted legacy rows)
  if (!encryptedText.includes(':')) return encryptedText;

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      return encryptedText; // Fallback
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];
    
    const key = getCipherKey(secretKey);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.warn('Decryption failed, returning raw/unencrypted:', error.message);
    return encryptedText; // Fallback to raw string if decryption key mismatches or content was plain
  }
}
