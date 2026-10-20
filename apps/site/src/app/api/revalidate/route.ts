/**
 * POST /api/revalidate (API-CONTRACT 6). Called by the API after any change to
 * public data. Signed: HMAC-SHA256(SITE_REVALIDATE_SECRET, `${timestamp}.${rawBody}`)
 * in X-Nafaa-Signature ("sha256=<hex>"), timestamp in X-Nafaa-Timestamp
 * (unix seconds, ±300 s).
 *
 * 401 bad or stale signature (or no secret configured), 400 bad body,
 * 200 { ok, revalidated, at }.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { REVALIDATION, revalidateRequestSchema, revalidationSigningInput, type RevalidateResponse } from '@/lib/cms/contract/cms-contract';
import { revalidateSecret } from '@/lib/cms/env';
import { normalizeTags } from '@/lib/cms/tags';

export const dynamic = 'force-dynamic';

function unauthorized(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 401 });
}

function validSignature(secret: string, timestamp: string, rawBody: string, header: string): boolean {
  if (!header.startsWith(REVALIDATION.signaturePrefix)) return false;
  const given = Buffer.from(header.slice(REVALIDATION.signaturePrefix.length), 'hex');
  const expected = createHmac('sha256', secret).update(revalidationSigningInput(timestamp, rawBody)).digest();
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  const secret = revalidateSecret();
  if (!secret) return unauthorized('Revalidation is not configured');

  const rawBody = await request.text();
  const timestamp = request.headers.get(REVALIDATION.timestampHeader) ?? '';
  const signature = request.headers.get(REVALIDATION.signatureHeader) ?? '';
  const seconds = Number(timestamp);
  if (!/^\d{9,11}$/.test(timestamp) || Math.abs(Date.now() / 1000 - seconds) > REVALIDATION.maxSkewSeconds) {
    return unauthorized('Stale or missing timestamp');
  }
  if (!validSignature(secret, timestamp, rawBody, signature)) return unauthorized('Bad signature');

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, message: 'Body must be JSON' }, { status: 400 });
  }
  const parsed = revalidateRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'tags must be a non-empty list of strings (≤ 256 chars)' }, { status: 400 });
  }

  const tags = normalizeTags(parsed.data.tags);
  for (const tag of tags) revalidateTag(tag);

  const body: RevalidateResponse = { ok: true, revalidated: tags.length, at: new Date().toISOString() };
  return NextResponse.json(body);
}
