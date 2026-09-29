import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const LEGACY_DEFAULT = 'default-dev-key-32-chars-required!!';
const derive = (secret: string) => crypto.createHash('sha256').update(secret).digest();

/**
 * Encrypt hamesha pehli key se. Decrypt har key se koshish karta hai —
 * taake production me `FBR_ENCRYPTION_KEY` lagane ke baad bhi purana
 * (default key wala) data khulta rahe, aur agli save par nayi key me aa jaye.
 */
function getKeys(): Buffer[] {
  const secrets = [
    process.env.FBR_ENCRYPTION_KEY,
    process.env.JWT_SECRET,
    LEGACY_DEFAULT,
    ...(process.env.OLD_ENCRYPTION_KEYS ?? '').split(',').map((k) => k.trim()),
  ].filter((k): k is string => !!k);
  return [...new Set(secrets)].map(derive);
}

function getKey(): Buffer {
  return getKeys()[0];
}

/** Production me asli key lagi hai ya default (sab ko maloom) wali? */
export function usingDefaultEncryptionKey(): boolean {
  return !process.env.FBR_ENCRYPTION_KEY && !process.env.JWT_SECRET;
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

    for (const key of getKeys()) {
      try {
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
      } catch {
        // agli key
      }
    }
    return ciphertext;
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
