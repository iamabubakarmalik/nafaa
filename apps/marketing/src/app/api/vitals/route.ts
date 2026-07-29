import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // TODO: forward to Vercel Analytics, Datadog, or your dashboard
    // For now, just log in dev
    if (process.env.NODE_ENV !== 'production') {
      console.log('[vitals]', body.name, body.value, body.rating);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
