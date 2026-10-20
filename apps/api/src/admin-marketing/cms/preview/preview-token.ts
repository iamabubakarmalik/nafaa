/**
 * Preview tokens (API-CONTRACT 7): compact HS256 JWTs with
 * `{ sub: entryId, scope: 'cms-preview', exp }` and no user data.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { PREVIEW, type PreviewTokenClaims } from '../contract/cms-contract';

const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

function sign(secret: string, input: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

export function signPreviewToken(secret: string, claims: PreviewTokenClaims): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const input = `${HEADER}.${payload}`;
  return `${input}.${sign(secret, input)}`;
}

/** The claims when the token is well formed, correctly signed, in scope and not expired; else null. */
export function verifyPreviewToken(secret: string, token: string, nowSeconds: number = Math.floor(Date.now() / 1000)): PreviewTokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts as [string, string, string];
  if (header !== HEADER) return null;
  const expected = Buffer.from(sign(secret, `${header}.${payload}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<PreviewTokenClaims>;
    if (claims.scope !== PREVIEW.tokenScope || typeof claims.sub !== 'string' || typeof claims.exp !== 'number') return null;
    if (claims.exp <= nowSeconds) return null;
    return { sub: claims.sub, scope: PREVIEW.tokenScope, exp: claims.exp };
  } catch {
    return null;
  }
}
