import { NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';
const INDEXNOW_KEY = 'nafaa-2026-indexnow';

export async function POST(request: Request) {
  try {
    const { urls } = await request.json();
    const urlList: string[] = Array.isArray(urls) && urls.length ? urls : [SITE_URL];

    const body = {
      host: new URL(SITE_URL).host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList,
    };

    // Ping Bing IndexNow (covers Bing, Yandex, Seznam, Naver)
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      submitted: urlList.length,
      urls: urlList,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: `${SITE_URL}/api/indexnow`,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    usage: 'POST { urls: ["https://nafaa.pk/page1", ...] }',
  });
}
