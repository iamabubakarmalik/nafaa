/**
 * Verifies Sign in with Apple identity tokens: an RS256 JWT signed with one of
 * Apple's public keys (https://appleid.apple.com/auth/keys). Checks signature,
 * issuer, audience (the app bundle id), expiry and, when given, the nonce.
 * Keys are cached for a few hours and refetched once when a token names a key
 * id the cache does not have (Apple rotates keys).
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export const APPLE_ISSUER = 'https://appleid.apple.com';
export const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const DEFAULT_AUDIENCE = 'com.nafaa.app';
const KEY_CACHE_MS = 6 * 60 * 60 * 1000;
const CLOCK_SKEW_S = 60;

export interface AppleJwk {
  kty: string;
  kid: string;
  use?: string;
  alg?: string;
  n: string;
  e: string;
}

export interface AppleIdentity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  isPrivateEmail: boolean;
}

type FetchKeys = () => Promise<AppleJwk[]>;

const defaultFetchKeys: FetchKeys = async () => {
  const res = await fetch(APPLE_KEYS_URL);
  if (!res.ok) throw new Error(`Apple keys request failed (${res.status})`);
  const body = (await res.json()) as { keys?: AppleJwk[] };
  return Array.isArray(body.keys) ? body.keys : [];
};

/** Apple sends booleans as true/false or "true"/"false". */
const truthy = (v: unknown) => v === true || v === 'true';

function decodePart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
}

@Injectable()
export class AppleIdentityService {
  private keys: AppleJwk[] = [];
  private fetchedAt = 0;
  private fetchKeys: FetchKeys = defaultFetchKeys;
  private now: () => number = () => Date.now();

  constructor(private readonly config: ConfigService) {}

  /** Test hook: replace the key source and clock. */
  useTestDoubles(fetchKeys: FetchKeys, now?: () => number) {
    this.fetchKeys = fetchKeys;
    if (now) this.now = now;
    this.keys = [];
    this.fetchedAt = 0;
  }

  private audiences(): string[] {
    const extra = (this.config.get<string>('APPLE_AUDIENCES') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return [this.config.get<string>('APPLE_BUNDLE_ID') || DEFAULT_AUDIENCE, ...extra];
  }

  private async keyFor(kid: string): Promise<AppleJwk | undefined> {
    const fresh = this.now() - this.fetchedAt < KEY_CACHE_MS;
    let key = fresh ? this.keys.find((k) => k.kid === kid) : undefined;
    if (key) return key;
    this.keys = await this.fetchKeys();
    this.fetchedAt = this.now();
    key = this.keys.find((k) => k.kid === kid);
    return key;
  }

  async verify(identityToken: string, nonce?: string): Promise<AppleIdentity> {
    const invalid = () => new BadRequestException('Apple ka token sahi nahi. Apple se dobara koshish karein.');
    const parts = typeof identityToken === 'string' ? identityToken.split('.') : [];
    if (parts.length !== 3) throw invalid();

    let header: { alg?: string; kid?: string };
    let payload: Record<string, unknown>;
    try {
      header = decodePart(parts[0]);
      payload = decodePart(parts[1]);
    } catch {
      throw invalid();
    }
    if (header.alg !== 'RS256' || !header.kid) throw invalid();

    let jwk: AppleJwk | undefined;
    try {
      jwk = await this.keyFor(header.kid);
    } catch {
      throw new BadRequestException('Apple se login abhi check nahi ho saka. Thori der baad koshish karein.');
    }
    if (!jwk) throw invalid();

    const publicKey = crypto.createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' });
    const ok = crypto.verify(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      Buffer.from(parts[2], 'base64url'),
    );
    if (!ok) throw invalid();

    const nowS = Math.floor(this.now() / 1000);
    const aud = payload.aud;
    const audOk = Array.isArray(aud)
      ? aud.some((a) => this.audiences().includes(String(a)))
      : this.audiences().includes(String(aud));
    if (payload.iss !== APPLE_ISSUER || !audOk) throw invalid();
    if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_S < nowS) {
      throw new BadRequestException('Apple wala login purana ho gaya. Apple se dobara koshish karein.');
    }
    if (typeof payload.sub !== 'string' || !payload.sub) throw invalid();
    if (nonce) {
      // expo-apple-authentication passes the raw nonce to Apple; Apple returns
      // it as given. Accept the SHA-256 form as well for other clients.
      const hashed = crypto.createHash('sha256').update(nonce).digest('hex');
      if (payload.nonce !== nonce && payload.nonce !== hashed) throw invalid();
    }

    const email = typeof payload.email === 'string' && payload.email ? payload.email.toLowerCase() : null;
    return {
      sub: payload.sub,
      email,
      emailVerified: !!email && truthy(payload.email_verified),
      isPrivateEmail: truthy(payload.is_private_email) || (!!email && email.endsWith('@privaterelay.appleid.com')),
    };
  }
}
