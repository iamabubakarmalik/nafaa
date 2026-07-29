import { NextResponse } from 'next/server';

interface ContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  topic?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactPayload;
    const { name, email, phone, topic, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
    }
    if (message.length < 10 || message.length > 5000) {
      return NextResponse.json({ ok: false, error: 'Message length invalid' }, { status: 400 });
    }

    // TODO: wire to Resend + optionally Slack webhook
    // Example:
    // await resend.emails.send({
    //   from: 'Nafaa <noreply@nafaa.pk>',
    //   to: routingEmailForTopic(topic),
    //   replyTo: email,
    //   subject: `[${topic ?? 'contact'}] ${name}`,
    //   html: template({ name, email, phone, message, topic }),
    // });

    console.log(`[contact] ${topic} · ${name} <${email}> · ${phone ?? '-'}`);

    return NextResponse.json({ ok: true, message: 'Received' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
