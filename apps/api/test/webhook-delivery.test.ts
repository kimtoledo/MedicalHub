import { describe, expect, it } from 'vitest';
import { MAX_DELIVERY_ATTEMPTS, backoffMs, decryptSecret, encryptSecret } from '../src/integrations/service.js';

describe('webhook secret encryption', () => {
  it('round-trips a secret through encrypt/decrypt', () => {
    const secret = 'whsec_super-secret-signing-value';
    const ciphertext = encryptSecret(secret);
    expect(decryptSecret(ciphertext)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const secret = 'whsec_same-secret-twice';
    expect(encryptSecret(secret)).not.toBe(encryptSecret(secret));
  });

  it('fails closed (returns null) if the ciphertext is tampered with', () => {
    const ciphertext = encryptSecret('whsec_tamper-target');
    const [iv, tag, data] = ciphertext.split(':');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] = flipped[0] ^ 0xff;
    const tampered = [iv, tag, flipped.toString('base64')].join(':');
    expect(decryptSecret(tampered)).toBeNull();
  });

  it('returns null for garbage input instead of throwing', () => {
    expect(decryptSecret('not-a-valid-ciphertext')).toBeNull();
    expect(decryptSecret('')).toBeNull();
  });
});

describe('webhook delivery backoff', () => {
  it('grows with attempt count', () => {
    expect(backoffMs(1)).toBeLessThan(backoffMs(2));
    expect(backoffMs(2)).toBeLessThan(backoffMs(3));
  });

  it('caps at 60 minutes', () => {
    expect(backoffMs(10)).toBe(60 * 60_000);
    expect(backoffMs(MAX_DELIVERY_ATTEMPTS)).toBeLessThanOrEqual(60 * 60_000);
  });

  it('permanently fails after MAX_DELIVERY_ATTEMPTS', () => {
    expect(MAX_DELIVERY_ATTEMPTS).toBe(5);
  });
});
