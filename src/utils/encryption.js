const crypto = require('crypto');
const { jwtSecret } = require('../config/dotenv');

const ALGORITHM = 'aes-256-cbc';

// Derive a 32-byte key from jwtSecret
const getKey = () => {
  return crypto.createHash('sha256').update(jwtSecret).digest();
};

/**
 * Encrypt a numeric ID into a URL-safe string.
 */
const encryptId = (id) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(String(id), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const result = iv.toString('hex') + ':' + encrypted;
  return Buffer.from(result).toString('base64url');
};

/**
 * Decrypt a URL-safe string back to a numeric ID.
 */
const decryptId = (encryptedString) => {
  try {
    const decoded = Buffer.from(encryptedString, 'base64url').toString('utf8');
    const [ivHex, encrypted] = decoded.split(':');
    if (!ivHex || !encrypted) return null;

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const id = Number(decrypted);
    return Number.isNaN(id) ? null : id;
  } catch {
    return null;
  }
};

module.exports = { encryptId, decryptId };
