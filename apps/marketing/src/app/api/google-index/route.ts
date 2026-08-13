import { NextResponse } from 'next/server';

/**
 * Google Indexing API endpoint helper
 * NOTE: Requires service account JSON in GOOGLE_INDEXING_KEY env var
 * Only officially supported for JobPosting & BroadcastEvent schemas,
 * but many use it for general URL notification.
 */

export async function POST(request: Request) {
  try {
    const { urls, type = 'URL_UPDATED' } = await request.json();
    const keyJson = process.env.GOOGLE_INDEXING_KEY;

    if (!keyJson) {
      return NextResponse.json({
        ok: false,
        error: 'GOOGLE_INDEXING_KEY env var not set. Get service account from Google Cloud Console.',
      }, { status: 400 });
    }

    // NOTE: Full JWT signing needed here for production use.
    // Recommended: use google-auth-library.
    return NextResponse.json({
      ok: true,
      message: 'Endpoint ready — configure GOOGLE_INDEXING_KEY + install google-auth-library for full submission',
      queued: urls,
      type,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
