/**
 * Support sounds, made with Web Audio so nothing is downloaded:
 *
 *   playSupportTone()  a soft two-note "ding" for a new support message,
 *                      different from the order and sale tones.
 *   startRingtone()    a gentle repeating ring for an incoming or outgoing
 *                      call; returns a function that stops it.
 *
 * Both follow the browser volume saved by the notifications page
 * (`nafaa-notifications-volume`) and are quieter than the order alert.
 */

const VOLUME_KEY = 'nafaa-notifications-volume';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

function volume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    const v = raw === null ? 0.9 : Number(raw);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.9;
  } catch {
    return 0.9;
  }
}

/** One soft note: sine with a short attack and a long, gentle fade. */
function note(ac: AudioContext, freq: number, at: number, length: number, gain: number) {
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, at);
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(gain, at + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(env);
  env.connect(ac.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

/** New support message: E6 then B5, soft and short (about half a second). */
export function playSupportTone() {
  const ac = audio();
  if (!ac) return;
  const g = 0.22 * volume();
  if (g <= 0) return;
  const now = ac.currentTime + 0.01;
  note(ac, 1318.5, now, 0.35, g);
  note(ac, 987.8, now + 0.13, 0.5, g * 0.85);
}

/**
 * Call ring: two short pairs of notes every two seconds, until stopped.
 * `outgoing` uses a lower, quieter pattern (the "it is ringing" sound).
 */
export function startRingtone(outgoing = false): () => void {
  const ac = audio();
  if (!ac) return () => undefined;
  const ring = () => {
    const g = (outgoing ? 0.12 : 0.25) * volume();
    if (g <= 0) return;
    const now = ac.currentTime + 0.01;
    if (outgoing) {
      note(ac, 440, now, 0.9, g);
      note(ac, 480, now, 0.9, g);
    } else {
      note(ac, 1046.5, now, 0.25, g);
      note(ac, 1318.5, now + 0.18, 0.3, g);
      note(ac, 1046.5, now + 0.5, 0.25, g);
      note(ac, 1318.5, now + 0.68, 0.3, g);
    }
  };
  ring();
  const timer = window.setInterval(ring, outgoing ? 3000 : 2000);
  return () => window.clearInterval(timer);
}

/** Browsers block audio until the page was clicked once; call this on a click to unlock it early. */
export function unlockAudio() {
  audio();
}
