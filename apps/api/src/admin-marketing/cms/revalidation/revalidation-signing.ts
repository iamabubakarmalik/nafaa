/**
 * HMAC signing of the API → site revalidation call (API-CONTRACT 6).
 * Signature: `sha256=<hex HMAC_SHA256(secret, "<timestamp>.<rawBody>")>`.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { REVALIDATION, revalidationSigningInput } from '../contract/cms-contract';

export function signRevalidation(secret: string, timestamp: number, rawBody: string): string {
  const hex = createHmac('sha256', secret).update(revalidationSigningInput(timestamp, rawBody)).digest('hex');
  return `${REVALIDATION.signaturePrefix}${hex}`;
}

/** Same check the site runs; kept here for tests and tooling. */
export function verifyRevalidationSignature(
  secret: string,
  timestamp: number,
  rawBody: string,
  signature: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > REVALIDATION.maxSkewSeconds) return false;
  const expected = Buffer.from(signRevalidation(secret, timestamp, rawBody));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Dedupes and caps a tag list: more than `maxTags` becomes `all` only. */
export function normalizeTags(tags: readonly string[]): string[] {
  const unique = [...new Set(tags.filter((t) => typeof t === 'string' && t.length > 0 && t.length <= REVALIDATION.maxTagLength))];
  if (unique.includes('all') || unique.length > REVALIDATION.maxTags) return ['all'];
  return unique;
}
