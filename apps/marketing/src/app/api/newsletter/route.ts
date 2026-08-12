import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function apiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

export async function POST(request: Request) {
  try {
    const { email, source, sourceUrl } = await request.json();

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
    }

    const res = await fetch(`${apiBase()}/public/marketing/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        source: source ?? 'FOOTER',
        sourcePage: sourceUrl ?? '/',
        sourceUrl: sourceUrl ?? undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.message ?? 'Backend rejected the request' },
        { status: res.status },
      );
    }
    return NextResponse.json({ ok: true, message: 'Subscribed' });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'newsletter endpoint healthy' });
}
