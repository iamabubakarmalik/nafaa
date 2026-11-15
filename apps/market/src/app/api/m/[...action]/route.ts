/**
 * Browser → Market API bridge. /api/m/auth/* handles sign-in and keeps the
 * tokens in httpOnly cookies; every other action is looked up in
 * lib/bridge.ts and run with the customer's token (lib/session.ts).
 *
 * Errors come back as { error, code? } with the API's status. Messages that
 * read like system text are replaced by a neutral one, so customers never
 * see technical wording.
 */
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { api } from '@/lib/api';
import { matchRoute } from '@/lib/bridge';
import { normalizePhone } from '@/lib/format';
import { clearSession, refreshToken, setSession, withToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

const TECHNICAL = /property|should|must be|validation|token|prisma|undefined|null|exception|internal|cannot|unauthori[sz]ed|forbidden|not found$/i;

function fail(e: unknown) {
  const err = e as { status?: number; message?: string; code?: string };
  const status = typeof err.status === 'number' && err.status >= 400 ? err.status : 500;
  let message = typeof err.message === 'string' ? err.message : '';
  if (status >= 500 || status === 401 || !message || TECHNICAL.test(message)) message = '';
  return NextResponse.json({ error: message || null, code: err.code ?? (status === 401 ? 'SIGNIN' : status === 503 ? 'NETWORK' : undefined) }, { status });
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  if (req.method === 'GET') return {};
  try {
    const b = await req.json();
    return b && typeof b === 'object' ? b : {};
  } catch {
    return {};
  }
}

async function auth(action: string, body: Record<string, unknown>) {
  const jar = await cookies();
  if (action === 'auth/otp/send') {
    const phone = normalizePhone(String(body.phone ?? ''));
    if (!phone) return NextResponse.json({ error: null, code: 'PHONE' }, { status: 400 });
    try {
      const r = await api.customer.sendOtp(phone, 'LOGIN');
      return NextResponse.json({ isNew: false, devCode: r.devCode });
    } catch (e) {
      // LOGIN answers 404 for an unknown number: that customer registers instead.
      if ((e as { status?: number }).status !== 404) return fail(e);
      const r = await api.customer.sendOtp(phone, 'REGISTER');
      return NextResponse.json({ isNew: true, devCode: r.devCode });
    }
  }
  if (action === 'auth/otp/verify') {
    const phone = normalizePhone(String(body.phone ?? ''));
    const code = String(body.code ?? '').replace(/\D/g, '').slice(0, 6);
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 100) : undefined;
    if (!phone || code.length !== 6) return NextResponse.json({ error: null, code: 'CODE' }, { status: 400 });
    const r = await api.customer.verifyOtp({ phone, code, purpose: body.isNew ? 'REGISTER' : 'LOGIN', fullName: body.isNew ? fullName : undefined });
    setSession(jar, r);
    return NextResponse.json({ customer: r.customer });
  }
  if (action === 'auth/logout') {
    const rt = await refreshToken();
    try {
      if (rt) await withToken((t) => api.customer.logout(t, rt));
    } catch {
      // Signing out locally is enough when the API call fails.
    }
    clearSession(jar);
    return NextResponse.json({ ok: true });
  }
  return null;
}

async function handle(req: NextRequest, ctx: { params: Promise<{ action: string[] }> }) {
  const action = (await ctx.params).action.join('/');
  const body = await readBody(req);
  try {
    if (action.startsWith('auth/')) {
      const res = await auth(action, body);
      if (res) return res;
    }
    const hit = matchRoute(req.method, action);
    if (!hit) return NextResponse.json({ error: null }, { status: 404 });
    const data = await withToken((token) => hit.route.run({ token, body, query: req.nextUrl.searchParams, args: hit.args }));
    if ((req.method === 'DELETE' && action === 'me')) clearSession(await cookies());
    return NextResponse.json({ data: data ?? null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if ((e as { status?: number }).status === 401) clearSession(await cookies());
    return fail(e);
  }
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
