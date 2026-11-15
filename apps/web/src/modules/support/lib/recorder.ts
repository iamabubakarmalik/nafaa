/**
 * Voice note recording with a live level meter.
 *
 * Uses MediaRecorder (Opus in WebM on Chrome/Edge/Firefox, AAC in MP4 on
 * Safari) and samples the microphone level about 12 times a second, so the
 * composer can draw the waveform while recording and the message keeps a
 * short waveform (WAVEFORM_BARS values, 0-1) for the player.
 */

export const MAX_VOICE_SECONDS = 120;
export const WAVEFORM_BARS = 48;

export interface VoiceRecording {
  blob: Blob;
  mime: string;
  durationSec: number;
  waveform: number[];
}

export interface RecorderHandle {
  /** Stops and returns the recording (null when nothing was captured). */
  stop: () => Promise<VoiceRecording | null>;
  /** Stops and throws the recording away. */
  cancel: () => void;
}

const MIME_CHOICES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export function canRecordVoice(): boolean {
  return typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/** Shrinks a list of levels to `bars` values by taking the peak of each slice. */
export function compressWaveform(levels: number[], bars = WAVEFORM_BARS): number[] {
  if (!levels.length) return Array.from({ length: bars }, () => 0.05);
  const out: number[] = [];
  const step = levels.length / bars;
  for (let i = 0; i < bars; i++) {
    const from = Math.floor(i * step);
    const to = Math.max(from + 1, Math.floor((i + 1) * step));
    let peak = 0;
    for (let j = from; j < to && j < levels.length; j++) peak = Math.max(peak, levels[j]);
    out.push(Math.round(Math.max(0.05, Math.min(1, peak)) * 100) / 100);
  }
  return out;
}

/**
 * Starts recording. `onLevel` receives each level (0-1) and the seconds so
 * far; recording stops by itself at MAX_VOICE_SECONDS and calls `onLimit`.
 * Throws when the microphone is blocked or missing.
 */
export async function startVoiceRecording(onLevel: (level: number, seconds: number) => void, onLimit: () => void): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = MIME_CHOICES.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? '';
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32_000 } : undefined);
  const chunks: Blob[] = [];
  const levels: number[] = [];
  const started = performance.now();

  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const ac = Ctx ? new Ctx() : null;
  const analyser = ac?.createAnalyser();
  if (ac && analyser) {
    analyser.fftSize = 512;
    ac.createMediaStreamSource(stream).connect(analyser);
  }
  const buf = analyser ? new Uint8Array(analyser.fftSize) : null;

  const sample = window.setInterval(() => {
    const seconds = (performance.now() - started) / 1000;
    let level = 0;
    if (analyser && buf) {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      // RMS, lifted so normal speech fills most of the bar.
      level = Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
    }
    levels.push(level);
    onLevel(level, seconds);
    if (seconds >= MAX_VOICE_SECONDS) onLimit();
  }, 80);

  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start(250);

  const cleanup = () => {
    window.clearInterval(sample);
    stream.getTracks().forEach((t) => t.stop());
    void ac?.close().catch(() => undefined);
  };

  let done = false;
  return {
    stop: () => new Promise<VoiceRecording | null>((resolve) => {
      if (done) { resolve(null); return; }
      done = true;
      const durationSec = Math.min(MAX_VOICE_SECONDS, Math.round((performance.now() - started) / 100) / 10);
      recorder.onstop = () => {
        cleanup();
        const type = recorder.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunks, { type });
        resolve(blob.size && durationSec >= 0.5 ? { blob, mime: type.split(';')[0], durationSec, waveform: compressWaveform(levels) } : null);
      };
      try { recorder.stop(); } catch { cleanup(); resolve(null); }
    }),
    cancel: () => {
      if (done) return;
      done = true;
      recorder.onstop = cleanup;
      try { recorder.stop(); } catch { cleanup(); }
    },
  };
}

/** "0:07", "1:42". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}
