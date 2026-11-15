/** Google sign-in failed on the API side: back to the login page with a notice. */
import { NextResponse, type NextRequest } from 'next/server';

export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/login?google=failed', req.url));
}
