import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const res = await fetch(`${apiBase()}/public/marketing/contact-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: name,
        email,
        phone: phone || undefined,
        formType: 'GENERAL',
        subject: `[${topic ?? businessType ?? 'contact'}] Website inquiry — ${name}`,
        message,
        sourceUrl: sourceUrl ?? undefined,
        sourcePage: '/contact',
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.message ?? 'Backend rejected the request' },
        { status: res.status },
      );
    }
    return NextResponse.json({ ok: true, message: 'Received' });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
