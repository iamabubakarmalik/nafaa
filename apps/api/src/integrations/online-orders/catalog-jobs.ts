/**
 * Catalog job helpers: chunk sizes per channel, the next chunk of a work list,
 * and the error list kept on a job. The job service does the database work.
 */

export const JOB_KINDS = ['IMPORT_ALL', 'LINK_ALL', 'PUSH', 'PUBLISH'] as const;
export type JobKind = (typeof JOB_KINDS)[number];
export type JobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED';

export const ACTIVE_STATUSES: JobStatus[] = ['QUEUED', 'RUNNING'];

/** Errors kept per job (the first ones; the count is in `failed`). */
export const MAX_JOB_ERRORS = 50;

/**
 * Items per chunk. Small enough that one chunk stays well inside a platform's
 * rate limit (Shopify GraphQL cost, Daraz QPS) and a restart repeats little.
 */
export function chunkSize(kind: JobKind, channelType: string | null): number {
  switch (kind) {
    case 'IMPORT_ALL': return 25;
    case 'LINK_ALL': return 200;
    case 'PUBLISH': return channelType === 'SHOPIFY' ? 10 : 20;
    case 'PUSH':
      if (channelType === 'SHOPIFY') return 25;
      if (channelType === 'WOOCOMMERCE') return 50;
      if (channelType === 'DARAZ') return 100;
      return 25;
  }
}

/** Pause after a chunk before the next one of the same job. */
export function chunkDelayMs(channelType: string | null): number {
  if (channelType === 'SHOPIFY') return 1500;
  if (channelType === 'WOOCOMMERCE') return 800;
  if (channelType === 'DARAZ') return 1000;
  return 1000;
}

/** The slice that starts at `cursor`; `next` is where the following chunk starts. */
export function nextChunk<T>(items: readonly T[], cursor: number, size: number): { chunk: T[]; next: number; last: boolean } {
  const start = Math.max(0, Math.min(items.length, Math.floor(cursor) || 0));
  const n = Math.max(1, Math.floor(size) || 1);
  const chunk = items.slice(start, start + n);
  const next = start + chunk.length;
  return { chunk, next, last: next >= items.length };
}

/** How many chunks a list needs. */
export function chunkCount(total: number, size: number): number {
  return total <= 0 ? 0 : Math.ceil(total / Math.max(1, size));
}

export function addErrors(prev: unknown, add: string[]): string[] {
  const list = Array.isArray(prev) ? (prev as unknown[]).map(String) : [];
  return [...list, ...add].slice(0, MAX_JOB_ERRORS);
}

export function percent(done: number, failed: number, total: number): number {
  if (total <= 0) return 100;
  return Math.min(100, Math.round(((done + failed) / total) * 100));
}
