/**
 * Sign in with Apple: identity token checks (against a mocked Apple key set)
 * and the account rules in AuthService.appleSignIn — sign in by Apple id,
 * link an existing account by a verified email, new business otherwise.
 */
import * as crypto from 'crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, UserRole } from '@prisma/client';
import { AuthService } from '../auth.service';

// slug.util pulls in ESM-only nanoid, which this CommonJS jest setup cannot load.
jest.mock('../../../common/utils/slug.util', () => ({
  generateSlug: (s: string) => s.toLowerCase().replace(/\s+/g, '-'),
  generateOtp: () => '123456',
}));
import { AppleIdentityService, APPLE_ISSUER, type AppleJwk } from './apple-identity.service';

const NOW = Date.UTC(2026, 10, 4, 10, 0, 0);
const KID = 'test-key-1';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...(publicKey.export({ format: 'jwk' }) as { kty: string; n: string; e: string }), kid: KID, alg: 'RS256', use: 'sig' } as AppleJwk;
const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

function appleToken(claims: Record<string, unknown> = {}, opts: { kid?: string; key?: crypto.KeyObject; alg?: string } = {}) {
  const header = b64({ alg: opts.alg ?? 'RS256', kid: opts.kid ?? KID });
  const payload = b64({
    iss: APPLE_ISSUER,
    aud: 'com.nafaa.app',
    exp: Math.floor(NOW / 1000) + 600,
    iat: Math.floor(NOW / 1000),
    sub: '001234.abcdef.0999',
    email: 'ahmad@example.com',
    email_verified: 'true',
    ...claims,
  });
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), opts.key ?? privateKey).toString('base64url');
  return `${header}.${payload}.${sig}`;
}

const config = (values: Record<string, string> = {}) => ({
  get: (k: string) => ({ JWT_ACCESS_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'r'.repeat(32), JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '30d', ...values })[k],
}) as any;

function makeVerifier(fetchKeys = jest.fn(async () => [jwk])) {
  const v = new AppleIdentityService(config());
  v.useTestDoubles(fetchKeys, () => NOW);
  return { v, fetchKeys };
}

describe('AppleIdentityService', () => {
  it('accepts a valid token and reads the email', async () => {
    const { v } = makeVerifier();
    await expect(v.verify(appleToken())).resolves.toEqual({
      sub: '001234.abcdef.0999', email: 'ahmad@example.com', emailVerified: true, isPrivateEmail: false,
    });
  });

  it('marks private relay emails', async () => {
    const { v } = makeVerifier();
    const id = await v.verify(appleToken({ email: 'x1y2@privaterelay.appleid.com', is_private_email: true, email_verified: true }));
    expect(id.isPrivateEmail).toBe(true);
    expect(id.emailVerified).toBe(true);
  });

  it('caches the key set and refetches for an unknown key id', async () => {
    const { v, fetchKeys } = makeVerifier();
    await v.verify(appleToken());
    await v.verify(appleToken());
    expect(fetchKeys).toHaveBeenCalledTimes(1);
    await expect(v.verify(appleToken({}, { kid: 'rotated' }))).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchKeys).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['a wrong signature', () => appleToken({}, { key: other.privateKey })],
    ['a wrong issuer', () => appleToken({ iss: 'https://evil.example' })],
    ['a wrong audience', () => appleToken({ aud: 'com.other.app' })],
    ['an expired token', () => appleToken({ exp: Math.floor(NOW / 1000) - 3600 })],
    ['a non-RS256 header', () => appleToken({}, { alg: 'HS256' })],
    ['garbage', () => 'not.a.jwt'],
  ])('rejects %s', async (_label, make) => {
    const { v } = makeVerifier();
    await expect(v.verify(make())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('checks the nonce when one is sent', async () => {
    const { v } = makeVerifier();
    await expect(v.verify(appleToken({ nonce: 'n-123' }), 'n-123')).resolves.toBeTruthy();
    const hashed = crypto.createHash('sha256').update('n-123').digest('hex');
    await expect(v.verify(appleToken({ nonce: hashed }), 'n-123')).resolves.toBeTruthy();
    await expect(v.verify(appleToken({ nonce: 'other' }), 'n-123')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AuthService.appleSignIn', () => {
  const tenant = { id: 't1', name: 'Ahmad Store' };
  let prisma: any;
  let tx: any;
  let service: AuthService;

  beforeEach(() => {
    tx = {
      tenant: { create: jest.fn(async ({ data }) => ({ id: 't-new', ...data })) },
      shop: { create: jest.fn(async ({ data }) => ({ id: 's-new', ...data })) },
      user: { create: jest.fn(async ({ data }) => ({ id: 'u-new', ...data })) },
      cashRegister: { create: jest.fn(async () => ({})) },
      onboardingProgress: { create: jest.fn(async () => ({})) },
      activityLog: { create: jest.fn(async () => ({})) },
    };
    prisma = {
      user: { findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null), update: jest.fn() },
      session: { create: jest.fn(async () => ({})) },
      $transaction: jest.fn(async (cb: (t: any) => unknown) => cb(tx)),
    };
    const { v } = makeVerifier();
    service = new AuthService(
      prisma,
      new JwtService({}),
      config(),
      { send: jest.fn(async () => ({})) } as any,
      {} as any,
      { create: jest.fn(async () => ({})) } as any,
      v,
    );
  });

  it('signs in a user already linked to the Apple id', async () => {
    const user = { id: 'u1', tenantId: 't1', email: 'ahmad@example.com', role: UserRole.OWNER, shopId: 's1', isActive: true, appleId: '001234.abcdef.0999', passwordHash: 'x', tenant };
    prisma.user.findUnique.mockImplementation(async ({ where }: any) => (where.appleId ? user : null));
    const res: any = await service.appleSignIn({ identityToken: appleToken() });
    expect(res.accessToken).toBeTruthy();
    expect(res.isNewUser).toBe(false);
    expect(res.user.passwordHash).toBeUndefined();
    expect(prisma.session.create).toHaveBeenCalled();
  });

  it('links an existing account by a verified email', async () => {
    const existing = { id: 'u2', tenantId: 't1', email: 'ahmad@example.com', role: UserRole.OWNER, shopId: 's1', isActive: true, appleId: null, googleId: null, passwordHash: 'hash', emailVerifiedAt: null };
    prisma.user.findUnique.mockImplementation(async ({ where }: any) => (where.email ? existing : null));
    prisma.user.update.mockImplementation(async ({ data }: any) => ({ ...existing, ...data, tenant }));
    const res: any = await service.appleSignIn({ identityToken: appleToken() });
    expect(prisma.user.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'u2' },
      data: { appleId: '001234.abcdef.0999', emailVerified: true, authProvider: AuthProvider.HYBRID },
    });
    expect(res.isNewUser).toBe(false);
  });

  it('does not link by an unverified email', async () => {
    const existing = { id: 'u2', email: 'ahmad@example.com' };
    prisma.user.findUnique.mockImplementation(async ({ where }: any) => (where.email ? existing : null));
    await expect(service.appleSignIn({ identityToken: appleToken({ email_verified: 'false' }) })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('asks a new user for the shop name, then creates the business', async () => {
    const first: any = await service.appleSignIn({ identityToken: appleToken(), fullName: 'Ahmad Ali' });
    expect(first).toMatchObject({ needsShopName: true, email: 'ahmad@example.com', fullName: 'Ahmad Ali' });
    expect(prisma.$transaction).not.toHaveBeenCalled();

    const done: any = await service.completeAppleSignup(first.tempToken, 'Ahmad Store');
    expect(done.isNewUser).toBe(true);
    expect(tx.user.create.mock.calls[0][0].data).toMatchObject({
      fullName: 'Ahmad Ali', email: 'ahmad@example.com', appleId: '001234.abcdef.0999', googleId: null,
      authProvider: AuthProvider.APPLE, role: UserRole.OWNER, emailVerified: true, passwordHash: null,
    });
    expect(tx.onboardingProgress.create).toHaveBeenCalled();
    expect(tx.tenant.create.mock.calls[0][0].data.name).toBe('Ahmad Store');
  });

  it('creates the business in one step when the shop name is sent, private relay included', async () => {
    const res: any = await service.appleSignIn({
      identityToken: appleToken({ email: 'zz9@privaterelay.appleid.com', is_private_email: 'true' }),
      shopName: 'Zain Mart',
    });
    expect(res.isNewUser).toBe(true);
    // No name from Apple and a relay address: the shop name stands in.
    expect(tx.user.create.mock.calls[0][0].data).toMatchObject({ fullName: 'Zain Mart', email: 'zz9@privaterelay.appleid.com' });
  });

  it('refuses a new account when Apple sent no email', async () => {
    await expect(service.appleSignIn({ identityToken: appleToken({ email: undefined }) })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a Google sign-up token at the Apple completion step', async () => {
    const google = await new JwtService({}).signAsync({ purpose: 'google_signup', googleId: 'g', email: 'a@b.c' }, { secret: 'a'.repeat(32) });
    await expect(service.completeAppleSignup(google, 'Shop')).rejects.toBeInstanceOf(BadRequestException);
  });
});
