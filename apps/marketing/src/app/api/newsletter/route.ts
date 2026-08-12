import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valid MarketingLeadSource enum values (apps/api/prisma/schema.prisma)
const VALID_SOURCES = new Set([
  'NEWSLETTER', 'CONTACT_FORM', 'DEMO_REQUEST', 'BLOG_SIGNUP', 'CHATBOT',
  'REFERRAL', 'ORGANIC_SEARCH', 'PAID_ADS', 'SOCIAL_MEDIA', 'DIRECT',
  'EMAIL_CAMPAIGN', 'AFFILIATE', 'OTHER',
]);

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
        source: VALID_SOURCES.has(source) ? source : 'NEWSLETTER',
        sourcePage: sourceUrl ?? '/',
        sourceUrl: sourceUrl ?? undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data.message ?? 'Backend error' }, { status: res.status });
    }
    return NextResponse.json({ ok: true, message: 'Subscribed' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'newsletter endpoint healthy' });
}
