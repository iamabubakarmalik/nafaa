/**
 * Counter keyboard helpers: quantity prefixes typed in the search box,
 * phone numbers, short beeps and the most-sold items on this counter.
 */

/**
 * "3*" / "3x" / "*3" / "x3" set a quantity; "3*maggi" or "3*<barcode>" add
 * that item three times. `rest` is what is left to search for.
 */
export function parseQtyPrefix(raw: string): { qty: number | null; rest: string } {
  const s = raw.trim();
  let m = s.match(/^(\d+(?:\.\d+)?)\s*[*xX×]\s*(.*)$/);
  if (m) return { qty: Number(m[1]), rest: m[2].trim() };
  m = s.match(/^[*xX×]\s*(\d+(?:\.\d+)?)$/);
  if (m) return { qty: Number(m[1]), rest: '' };
  return { qty: null, rest: s };
}

/** Pakistani mobile number as typed at the counter: 03001234567, +923001234567, 923001234567. */
export function looksLikePhone(s: string): boolean {
  const d = s.replace(/[\s-]/g, '');
  return /^(?:\+?92|0)3\d{9}$/.test(d);
}

export const phoneDigits = (s: string) => s.replace(/\D/g, '').replace(/^92/, '0');

let ctx: AudioContext | null = null;
/** Short beep: a high one for an item added, a low one for a problem. */
export function posBeep(kind: 'ok' | 'error' | 'done') {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = kind === 'error' ? 'square' : 'sine';
    o.frequency.value = kind === 'ok' ? 1320 : kind === 'done' ? 880 : 220;
    g.gain.value = 0.06;
    o.connect(g); g.connect(ctx.destination);
    const len = kind === 'error' ? 0.22 : 0.08;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + len);
    o.stop(ctx.currentTime + len);
  } catch { /* no audio on this device */ }
}

type RecentMap = Record<string, { n: number; t: number }>;
const recentKey = (scope: string) => `nafaa.${scope}-pos.recent`;

export function readRecent(scope: string): RecentMap {
  try { return JSON.parse(localStorage.getItem(recentKey(scope)) || '{}') as RecentMap; } catch { return {}; }
}

/** Counts an item sold on this counter; keeps the 60 most used. */
export function bumpRecent(scope: string, productId: string) {
  try {
    const m = readRecent(scope);
    m[productId] = { n: (m[productId]?.n ?? 0) + 1, t: Date.now() };
    const top = Object.entries(m).sort((a, b) => b[1].n - a[1].n || b[1].t - a[1].t).slice(0, 60);
    localStorage.setItem(recentKey(scope), JSON.stringify(Object.fromEntries(top)));
  } catch { /* storage full or blocked */ }
}

/** Product ids, most sold first (ties: most recent). */
export function topRecent(scope: string, limit = 9): string[] {
  return Object.entries(readRecent(scope)).sort((a, b) => b[1].n - a[1].n || b[1].t - a[1].t).slice(0, limit).map(([id]) => id);
}
