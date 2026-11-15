/**
 * Signed rider token for the rider endpoints (rider-app/*).
 *
 * Shop staff issue a token for one of their riders; the rider device sends it
 * in the `x-rider-token` header. The token is an HMAC over the rider id,
 * tenant id and expiry, keyed with RIDER_TOKEN_SECRET (falls back to the
 * JWT access secret). The full rider mode moves into the POS mobile app later.
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface RiderClaims { r: string; t: string; e: number }

const RIDER_TOKEN_TTL_MS = 30 * 86_400_000;

function secret(): string {
  const s = process.env.RIDER_TOKEN_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error('RIDER_TOKEN_SECRET or JWT_ACCESS_SECRET must be set');
  return s;
}

const sign = (body: string) => crypto.createHmac('sha256', secret()).update(`rider.${body}`).digest('base64url');

export function signRiderToken(riderId: string, tenantId: string, ttlMs = RIDER_TOKEN_TTL_MS) {
  const exp = Date.now() + ttlMs;
  const body = Buffer.from(JSON.stringify({ r: riderId, t: tenantId, e: exp } satisfies RiderClaims)).toString('base64url');
  return { token: `${body}.${sign(body)}`, expiresAt: new Date(exp) };
}

export function readRiderToken(token: unknown): RiderClaims | null {
  const [body, sig] = String(token ?? '').split('.');
  if (!body || !sig || body.length > 1000) return null;
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const c = JSON.parse(Buffer.from(body, 'base64url').toString()) as RiderClaims;
    if (typeof c.r !== 'string' || typeof c.t !== 'string' || typeof c.e !== 'number' || c.e < Date.now()) return null;
    return c;
  } catch {
    return null;
  }
}

/** Requires a valid rider token; puts the claims on `req.rider`. */
@Injectable()
export class RiderTokenGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const claims = readRiderToken(req.headers?.['x-rider-token']);
    if (!claims) throw new UnauthorizedException('Rider login dobara karein');
    req.rider = claims;
    return true;
  }
}
