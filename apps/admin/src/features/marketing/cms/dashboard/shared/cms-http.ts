/**
 * HTTP helpers shared by the Website resource screens (media, FAQs, menus,
 * redirects, settings, customers, overview). Every call goes to
 * /admin/marketing/cms/* (API-CONTRACT section 8). The API wraps every
 * success body as { success, data }, so `unwrap` returns `data`.
 */
import type { AxiosResponse } from 'axios';
import { apiClient } from '../../../../../api/client';
import type { Issue, RevisionListItem } from '../../contract/cms-contract';

export const CMS_BASE = '/admin/marketing/cms';

export const cmsHttp = apiClient;

export function unwrap<T>(res: AxiosResponse): T {
  const body = res.data as { data?: T } | T | undefined;
  if (body && typeof body === 'object' && 'data' in (body as object)) return (body as { data: T }).data;
  return body as T;
}

/** Drops empty strings and undefined so list filters do not send blank params. */
export function cleanParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

interface ApiErrorBody {
  message?: string | string[];
  issues?: Issue[];
  duplicateOf?: unknown;
  current?: unknown;
}

function errorBody(error: unknown): ApiErrorBody | undefined {
  return (error as { response?: { data?: ApiErrorBody } })?.response?.data;
}

export function errorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

/** A readable message for a failed request (Nest message, or a plain fallback). */
export function errorMessage(error: unknown, fallback = 'Kuch ghalat ho gaya. Dobara try karein.'): string {
  const msg = errorBody(error)?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}

/** Issues from a 422 response, when the API sends them. */
export function errorIssues(error: unknown): Issue[] {
  const issues = errorBody(error)?.issues;
  return Array.isArray(issues) ? issues : [];
}

export function errorDuplicateOf<T>(error: unknown): T | null {
  return (errorBody(error)?.duplicateOf as T | undefined) ?? null;
}

// ─── Time (shown in Asia/Karachi; stored as UTC ISO) ───

const PKT = 'Asia/Karachi';

export function formatPkt(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: PKT,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d);
}

/** YYYY-MM-DD of an instant in Asia/Karachi, for <input type="date">. */
export function pktDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: PKT, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** A PKT calendar date (YYYY-MM-DD) as an ISO instant at PKT midnight. */
export function pktDateToIso(date: string): string {
  return new Date(`${date}T00:00:00+05:00`).toISOString();
}

// ─── Zod helpers ───

export type FieldErrors = Record<string, string>;

/** Flattens a zod error into { "a.b.0": "message" } for inline field errors. */
export function zodFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// ─── Shared history endpoint (MENU, SETTING, FAQ) ───

export function fetchHistory(subject: 'MENU' | 'SETTING' | 'FAQ', key: string): Promise<RevisionListItem[]> {
  return cmsHttp.get(`${CMS_BASE}/history`, { params: { subject, key } }).then((r) => unwrap<RevisionListItem[]>(r));
}

// ─── Entry lookup (pickers) ───

export interface EntryLookupRow {
  id: string;
  type: string;
  title: string;
  path: string;
  status: string;
}

export function lookupEntries(q: string, types?: string[], limit = 10): Promise<EntryLookupRow[]> {
  return cmsHttp
    .get(`${CMS_BASE}/entries/lookup`, { params: cleanParams({ q, types: types?.join(','), limit }) })
    .then((r) => unwrap<EntryLookupRow[]>(r));
}
