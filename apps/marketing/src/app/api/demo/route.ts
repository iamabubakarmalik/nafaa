import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function apiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, company, industry, preferredDate, preferredTime, message, sourceUrl } = body ?? {};

    if (!name || name.length < 2) {
      return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ ok: false, error: 'Phone is required' }, { status: 400 });
    }

    const res = await fetch(`${apiBase()}/public/marketing/demo-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: name,
        email,
        phone,
        companyName: company || undefined,
        industry: industry || undefined,
        preferredDate: preferredDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        preferredTime: preferredTime || '14:00',
        meetingType: 'VIDEO_CALL',
        painPoints: message || undefined,
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
    return NextResponse.json({ ok: true, booking: data?.bookingNumber ?? null });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
