import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.FBR_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? 'default-dev-key-32-chars-required!!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a string. Returns base64 formatted as: iv:authTag:cipherText
 * Safe to store in database.
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a string previously encrypted with encrypt().
 * Returns null if input is null/undefined or invalid.
 */
export function decrypt(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      // Legacy plain text — return as-is for backward compat
      return ciphertext;
    }

    const [ivB64, authTagB64, encryptedB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (e) {
    // If decryption fails, assume it's legacy plain text
    return ciphertext;
  }
}

/**
 * Check if a value appears to be encrypted (matches iv:tag:data format).
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(':');
  return parts.length === 3 && parts.every((p) => /^[A-Za-z0-9+/=]+$/.test(p));
}
