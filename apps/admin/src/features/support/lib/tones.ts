/**
 * Live support sounds (Web Audio, no files), different from the admin
 * notification chime: a soft two-note "pop" for a new message, a brighter
 * three-note phrase for a new conversation waiting for the team, and a
 * repeating ring for incoming calls.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

function notes(freqs: number[], gap: number, type: OscillatorType, volume = 0.16) {
  const c = audio();
  if (!c) return;
  const start = c.currentTime + 0.02;
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = f;
    const t = start + i * gap;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

export const playSupportMessage = () => notes([587, 880], 0.09, 'triangle');
export const playSupportWaiting = () => notes([523, 659, 1047], 0.11, 'triangle', 0.2);

let ringTimer: number | null = null;

export function startRing() {
  if (ringTimer != null) return;
  const ring = () => notes([740, 587, 740, 587], 0.16, 'sine', 0.14);
  ring();
  ringTimer = window.setInterval(ring, 2200);
}

export function stopRing() {
  if (ringTimer != null) window.clearInterval(ringTimer);
  ringTimer = null;
}
