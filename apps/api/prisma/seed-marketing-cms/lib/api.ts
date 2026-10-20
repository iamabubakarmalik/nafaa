/**
 * Thin client for the admin CMS API (/admin/marketing/cms). The seed writes
 * only through these endpoints, never to the database, so every write passes
 * the same validation, revisions and permissions as an edit in the admin.
 *
 * Authentication, first match wins:
 * - `CMS_SEED_TOKEN`: an admin access token, for example copied from a
 *   logged-in admin tab (see docs/marketing-site/LAUNCH.md). Access tokens are
 *   short-lived (JWT_ACCESS_EXPIRES_IN, 15 minutes by default).
 * - `--email=<admin email>`: logs in through POST /admin/auth/login. The
 *   password is read from the terminal (hidden) or from one line on stdin, is
 *   kept in memory only, and is used again to log in when a token expires.
 * - Local API only: a 30-minute access token is signed with JWT_ACCESS_SECRET
 *   from apps/api/.env for the first active SUPER_ADMIN (or
 *   `CMS_SEED_ADMIN_EMAIL`). The user lookup is a read; nothing is written.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { JwtService } from '@nestjs/jwt';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    readonly route: string,
  ) {
    super(`${route} → ${status}: ${typeof body === 'string' ? body : JSON.stringify(body).slice(0, 600)}`);
  }
}

interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

const API_ENV = join(__dirname, '..', '..', '..', '.env');

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || !m[1]) continue;
    out[m[1]] = (m[2] ?? '').replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

function isLocal(apiUrl: string): boolean {
  const host = new URL(apiUrl).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

export interface ResolvedAuth {
  token: string;
  as: string;
  /** Returns a fresh token after a 401 (only for --email logins). */
  reauth?: () => Promise<string>;
}

/** Reads a password without echo on a terminal, or the first line of piped stdin. */
export function readPassword(prompt: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    return new Promise((resolve, reject) => {
      let buf = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk: string) => (buf += chunk));
      stdin.on('end', () => resolve(buf.split(/\r?\n/)[0] ?? ''));
      stdin.on('error', reject);
    });
  }
  process.stderr.write(prompt);
  return new Promise((resolve) => {
    let buf = '';
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stderr.write('\n');
          resolve(buf);
          return;
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false);
          process.stderr.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') buf = buf.slice(0, -1);
        else buf += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function adminLogin(apiUrl: string, email: string, password: string): Promise<string> {
  const res = await fetch(`${apiUrl}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = (await res.json().catch(() => null)) as { data?: { accessToken?: string }; accessToken?: string; message?: unknown } | null;
  const token = json?.data?.accessToken ?? json?.accessToken;
  if (!res.ok || !token) throw new Error(`Admin login failed (${res.status}): ${JSON.stringify(json?.message ?? json).slice(0, 200)}`);
  return token;
}

/** Token for the admin API: CMS_SEED_TOKEN, then --email login, then (local only) a signed token. */
export async function resolveAuth(apiUrl: string, opts: { email?: string | undefined } = {}): Promise<ResolvedAuth> {
  if (process.env.CMS_SEED_TOKEN) return { token: process.env.CMS_SEED_TOKEN.trim(), as: 'CMS_SEED_TOKEN' };
  if (opts.email) {
    const email = opts.email;
    const password = await readPassword(`Password for ${email} on ${new URL(apiUrl).host}: `);
    if (!password) throw new Error('No password given.');
    const token = await adminLogin(apiUrl, email, password);
    return { token, as: email, reauth: () => adminLogin(apiUrl, email, password) };
  }
  return resolveToken(apiUrl);
}

/** Opens an authenticated client. */
export async function connect(apiUrl: string, opts: { email?: string | undefined } = {}): Promise<{ api: CmsApi; as: string }> {
  const auth = await resolveAuth(apiUrl, opts);
  return { api: new CmsApi(apiUrl, auth.token, auth.reauth), as: auth.as };
}

export async function resolveToken(apiUrl: string): Promise<{ token: string; as: string }> {
  if (process.env.CMS_SEED_TOKEN) return { token: process.env.CMS_SEED_TOKEN, as: 'CMS_SEED_TOKEN' };
  if (!isLocal(apiUrl)) throw new Error('Non-local API: set CMS_SEED_TOKEN (an admin access token) or pass --email=<admin email>.');

  const env = readEnvFile(API_ENV);
  const secret = process.env.JWT_ACCESS_SECRET ?? env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET not found in apps/api/.env; set CMS_SEED_TOKEN instead.');
  if (!process.env.DATABASE_URL && env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;

  // Read-only lookup of the admin the token is issued for.
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const email = process.env.CMS_SEED_ADMIN_EMAIL;
    const user = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN', isActive: true, ...(email ? { email } : {}) },
      select: { id: true, email: true, tenantId: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!user) throw new Error(email ? `No active SUPER_ADMIN with email ${email}.` : 'No active SUPER_ADMIN user in the local database.');
    const token = new JwtService({ secret }).sign(
      { sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
      { expiresIn: '30m' },
    );
    return { token, as: user.email };
  } finally {
    await prisma.$disconnect();
  }
}

const MAX_RETRIES = 8;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry-After (seconds or HTTP date) when present, else 1 s, 2 s, 4 s ... capped at 30 s, plus jitter. */
function retryDelayMs(retryAfter: string | null, attempt: number): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(ms) && ms > 0) return Math.min(ms, MAX_DELAY_MS) + 100;
  }
  return Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS) + Math.floor(Math.random() * 250);
}

export class CmsApi {
  constructor(
    private readonly baseUrl: string,
    private token: string,
    private readonly reauth?: () => Promise<string>,
  ) {}

  /**
   * One admin request. A 429 (the API throttles bursts) is retried with
   * exponential backoff, honouring Retry-After when the API sends it.
   */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const route = `${method} /admin/marketing/cms${path}`;
    let res: Response;
    let renewed = false;
    for (let attempt = 0; ; attempt++) {
      res = await fetch(`${this.baseUrl}/admin/marketing/cms${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.token}`, ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: isForm ? (body as FormData) : JSON.stringify(body) } : {}),
      });
      if (res.status === 401 && this.reauth && !renewed) {
        // An expired access token: log in again once and repeat the request.
        await res.text().catch(() => '');
        this.token = await this.reauth();
        renewed = true;
        continue;
      }
      if (res.status !== 429 || attempt >= MAX_RETRIES) break;
      await res.text().catch(() => '');
      await sleep(retryDelayMs(res.headers.get('retry-after'), attempt));
    }
    const text = await res.text();
    let json: unknown = text;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* keep text */
    }
    if (!res.ok) throw new ApiError(res.status, json, route);
    // The API's response interceptor wraps payloads as { success, data }.
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) return (json as { data: T }).data;
    return json as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }
  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }
  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }
  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }
  /** Multipart upload (FormData with a `file` part). */
  upload<T>(path: string, form: FormData): Promise<T> {
    return this.request<T>('POST', path, form);
  }

  /** Reads every page of a paginated admin list. */
  async listAll<T>(path: string, query: Record<string, string> = {}): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page < 1000; page++) {
      const qs = new URLSearchParams({ ...query, page: String(page), limit: '200' });
      const res = await this.get<Paginated<T>>(`${path}?${qs.toString()}`);
      out.push(...res.items);
      if (!res.meta?.hasNext) break;
    }
    return out;
  }
}
