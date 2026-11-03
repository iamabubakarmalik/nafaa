/**
 * Times sent by a client that worked offline (a bill rung up, a till opened
 * or closed) and reached the server later. The server keeps its own clock
 * unless the client's time is believable:
 *
 *  - not in the future (a phone clock up to two minutes ahead counts as now);
 *  - at most 72 hours old (older work is dated when it arrives, as before).
 *
 * Without a client time, or with one that fails these checks, callers use the
 * server time exactly as they did before the field existed.
 */

export const CLIENT_TIME_MAX_AGE_MS = 72 * 60 * 60 * 1000;
export const CLIENT_TIME_SKEW_MS = 2 * 60 * 1000;

/** The client's time as a Date when it may be used, otherwise null. */
export function acceptClientTime(raw: unknown, now: Date = new Date()): Date | null {
  if (raw == null || raw === '') return null;
  const at = raw instanceof Date ? raw : typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : null;
  if (!at || Number.isNaN(at.getTime())) return null;
  const diff = now.getTime() - at.getTime();
  if (diff < -CLIENT_TIME_SKEW_MS) return null;
  if (diff > CLIENT_TIME_MAX_AGE_MS) return null;
  return diff < 0 ? new Date(now.getTime()) : at;
}

export interface RegisterWindow {
  id: string;
  openedAt: Date;
  closedAt?: Date | null;
}

/**
 * Sale time and till for a bill sold at `client` (already accepted):
 *  - the till that was open at that moment, when there is one;
 *  - otherwise the till open now (the same choice as a bill without a client
 *    time), with the time moved up to its opening so the bill stays inside
 *    that till's count;
 *  - no till at all: the client time.
 */
export function saleClock<R extends RegisterWindow>(client: Date, openAtTime: R | null, openNow: R | null): { soldAt: Date; register: R | null } {
  if (openAtTime) return { soldAt: client, register: openAtTime };
  if (openNow) {
    const opened = new Date(openNow.openedAt);
    return { soldAt: client < opened ? opened : client, register: openNow };
  }
  return { soldAt: client, register: null };
}

/** The later of the two times (a till may not start before the previous one closed, or close before it opened). */
export function notBefore(at: Date, floor: Date | null | undefined): Date {
  return floor && at < floor ? new Date(floor) : at;
}
