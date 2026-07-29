import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { email, source } = await request.json();

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
    }

    // TODO: wire to Resend / Mailchimp / your database
    // Example:
    // await resend.contacts.create({ email, audienceId: process.env.RESEND_AUDIENCE_ID! });

    console.log(`[newsletter] ${email} from ${source ?? 'unknown'}`);

    return NextResponse.json({ ok: true, message: 'Subscribed' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'newsletter endpoint healthy' });
}
