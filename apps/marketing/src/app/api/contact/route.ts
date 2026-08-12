import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valid ContactFormType enum values (apps/api/prisma/schema.prisma)
const TOPIC_MAP: Record<string, string> = {
  sales: 'SALES',
  support: 'SUPPORT',
  partnership: 'PARTNERSHIP',
  press: 'MEDIA',
  media: 'MEDIA',
  career: 'CAREER',
  demo: 'DEMO_REQUEST',
  enterprise: 'ENTERPRISE',
  bug: 'BUG_REPORT',
  feature: 'FEATURE_REQUEST',
  general: 'GENERAL',
  other: 'OTHER',
};

function apiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, businessType, topic, message, sourceUrl } = body ?? {};

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
    }
    if (message.length < 10 || message.length > 5000) {
      return NextResponse.json({ ok: false, error: 'Message length invalid' }, { status: 400 });
    }

    const topicKey = String(topic ?? 'general').toLowerCase();
    const formType = TOPIC_MAP[topicKey] ?? 'GENERAL';
    const topicLabel = topic ? String(topic) : 'General';

    const res = await fetch(`${apiBase()}/public/marketing/contact-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: name,
        email,
        phone: phone || undefined,
        companyName: businessType || undefined,
        formType,
        subject: `[${topicLabel}] Website contact form`,
        message,
        sourceUrl: sourceUrl ?? undefined,
        sourcePage: '/contact',
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data.message ?? 'Backend error' }, { status: res.status });
    }
    return NextResponse.json({ ok: true, ticket: data.ticketNumber ?? data.form?.ticketNumber ?? data.submission?.ticketNumber ?? data.ticket ?? null });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
