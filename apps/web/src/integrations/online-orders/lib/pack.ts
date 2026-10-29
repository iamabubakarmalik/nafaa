/**
 * Packing checks on each scan; the same rules as the API (order-scan.ts),
 * which checks the final counts again.
 */

export interface PackLine { index: number; name: string; quantity: number; codes: string[] }
export type ScanResult = { kind: 'OK'; index: number; done: boolean } | { kind: 'EXTRA'; index: number } | { kind: 'WRONG' };

const norm = (v: unknown) => String(v ?? '').toUpperCase().replace(/\s+/g, '');

export function matchScan(lines: PackLine[], counts: Record<number, number>, scanned: string): ScanResult {
  const c = norm(scanned);
  const hits = lines.filter((l) => l.codes.includes(c));
  if (!hits.length) return { kind: 'WRONG' };
  const open = hits.find((l) => (counts[l.index] ?? 0) < l.quantity);
  if (!open) return { kind: 'EXTRA', index: hits[0].index };
  return { kind: 'OK', index: open.index, done: (counts[open.index] ?? 0) + 1 >= open.quantity };
}

/** Short beeps: a high one for a good scan, a low buzz for a wrong one. */
export function beep(ok: boolean) {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctx) return;
    const ctx = new Ctx();
    const play = (freq: number, at: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = ok ? 'sine' : 'square';
      o.frequency.value = freq;
      g.gain.value = ok ? 0.15 : 0.3;
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + dur);
    };
    if (ok) play(1320, 0, 0.08);
    else { play(220, 0, 0.18); play(180, 0.22, 0.3); }
    setTimeout(() => ctx.close().catch(() => undefined), 800);
  } catch { /* no sound on this device */ }
}
