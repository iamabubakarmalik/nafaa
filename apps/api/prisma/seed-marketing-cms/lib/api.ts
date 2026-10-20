/**
 * Thin client for the admin CMS API (/admin/marketing/cms). The seed writes
 * only through these endpoints, never to the database, so every write passes
 * the same validation, revisions and permissions as an edit in the admin.
 *
 * Authentication:
 * - `CMS_SEED_TOKEN`: an admin access token (required for any non-local API).
 * - Local API only: when no token is given, a 30-minute access token is signed
 *   with JWT_ACCESS_SECRET from apps/api/.env for the first active SUPER_ADMIN
 *   (or `CMS_SEED_ADMIN_EMAIL`). The user lookup is a read; nothing is written.
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

export async function resolveToken(apiUrl: string): Promise<{ token: string; as: string }> {
  if (process.env.CMS_SEED_TOKEN) return { token: process.env.CMS_SEED_TOKEN, as: 'CMS_SEED_TOKEN' };
  if (!isLocal(apiUrl)) throw new Error('Set CMS_SEED_TOKEN (an admin access token) to seed a non-local API.');

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
    private readonly token: string,
  ) {}

  /**
   * One admin request. A 429 (the API throttles bursts) is retried with
   * exponential backoff, honouring Retry-After when the API sends it.
   */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const route = `${method} /admin/marketing/cms${path}`;
    let res: Response;
    for (let attempt = 0; ; attempt++) {
      res = await fetch(`${this.baseUrl}/admin/marketing/cms${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
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
