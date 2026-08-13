import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Reversible at-rest encryption for secrets this server must later recall
 * (e.g. to sign an outbound webhook, or authenticate to a third-party
 * provider on the clinic's behalf) — unlike a one-way hash, which is only
 * useful for verifying a caller-supplied value, never for reproducing it.
 * `purpose` domain-separates the derived key so unrelated secret types
 * (webhook signing secrets, provider credentials, ...) can't be decrypted
 * with each other's keys even though they share one server-held base secret.
 */
function encryptionKey(purpose: string) {
  const base = process.env.BETTER_AUTH_SECRET ?? process.env.SESSION_SECRET ?? 'development-secret-key-not-for-production-use';
  return createHash('sha256').update(`${base}:${purpose}`).digest();
}

export function encryptSecret(purpose: string, plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(purpose), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(purpose: string, ciphertext: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = ciphertext.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(purpose), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
