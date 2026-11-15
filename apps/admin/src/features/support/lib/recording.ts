/**
 * Recording of support calls in the admin app.
 *
 * Audio: the agent's microphone and the shop's audio are mixed with WebAudio
 * into one track and recorded with MediaRecorder (opus in webm). Screen: the
 * visible shared screen (the shop's, or the agent's own) plus the same mixed
 * audio, recorded as webm video, only while the agent switches it on.
 *
 * Long recordings are cut into parts of about 80 MB, each uploaded as soon as
 * it is finished, so nothing large waits in memory and every part stays under
 * the server limit. The server adds each file to the call's line in the chat.
 * If an upload fails twice, the file is downloaded on this computer instead,
 * so a recording is never lost silently.
 *
 * Nothing here may break a call: every failure is caught and reported to the
 * caller, which logs it and carries on.
 */

import { adminSupportApi } from '@/api/admin-support.api';

const PART_BYTES = 80 * 1024 * 1024;
const TIMESLICE_MS = 5_000;

export interface RecordingRef {
  conversationId: string;
  callId: string;
}

type Kind = 'call' | 'screen';

let audioCtx: AudioContext | null = null;
let mix: MediaStreamAudioDestinationNode | null = null;
const sources = new Map<string, MediaStreamAudioSourceNode>();
let ref: RecordingRef | null = null;
let callRec: PartRecorder | null = null;
let screenRec: PartRecorder | null = null;

export const recordingSupported = () => typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && typeof window.AudioContext !== 'undefined';

function pickMime(video: boolean): string {
  const list = video
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return list.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
}

function saveLocally(blob: Blob, name: string) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    /* nothing more we can do */
  }
}

async function upload(r: RecordingRef, kind: Kind, blob: Blob, part: number, startedAt: number, endedAt: number) {
  const extra = { conversationId: r.conversationId, kind, durationSec: (endedAt - startedAt) / 1000, startedAt: new Date(startedAt).toISOString(), part };
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await adminSupportApi.uploadRecording(r.callId, blob, extra);
      return;
    } catch (e) {
      console.warn(`[support] ${kind} recording upload failed (attempt ${attempt})`, e);
      if (attempt === 1) await new Promise((res) => window.setTimeout(res, 3_000));
    }
  }
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  saveLocally(blob, `nafaa-support-${kind}-${r.callId.slice(0, 8)}-part${part}.${ext}`);
  onUploadFailed?.(kind);
}

/** Set by the call module to tell the agent when a file had to be saved locally. */
let onUploadFailed: ((kind: Kind) => void) | null = null;
export function onRecordingUploadFailed(fn: (kind: Kind) => void) {
  onUploadFailed = fn;
}

/** MediaRecorder that starts a new file every ~80 MB and uploads each finished one. */
class PartRecorder {
  private rec: MediaRecorder | null = null;
  private part = 0;
  private stopped = false;

  constructor(private readonly stream: MediaStream, private readonly kind: Kind, private readonly r: RecordingRef) {}

  start() {
    this.open();
  }

  private open() {
    const video = this.kind === 'screen';
    const mime = pickMime(video);
    const rec = new MediaRecorder(this.stream, {
      ...(mime && { mimeType: mime }),
      audioBitsPerSecond: 48_000,
      ...(video && { videoBitsPerSecond: 900_000 }),
    });
    const part = ++this.part;
    const startedAt = Date.now();
    const chunks: Blob[] = [];
    let bytes = 0;
    rec.ondataavailable = (e) => {
      if (!e.data.size) return;
      chunks.push(e.data);
      bytes += e.data.size;
      if (bytes >= PART_BYTES && !this.stopped && this.rec === rec) this.rotate();
    };
    rec.onstop = () => {
      if (!chunks.length) return;
      const blob = new Blob(chunks, { type: (rec.mimeType || mime || (video ? 'video/webm' : 'audio/webm')).split(';')[0] });
      void upload(this.r, this.kind, blob, part, startedAt, Date.now());
    };
    rec.onerror = (e) => console.warn(`[support] ${this.kind} recorder error`, e);
    rec.start(TIMESLICE_MS);
    this.rec = rec;
  }

  private rotate() {
    const old = this.rec;
    this.open();
    if (old && old.state !== 'inactive') old.stop();
  }

  stop() {
    this.stopped = true;
    const rec = this.rec;
    this.rec = null;
    if (rec && rec.state !== 'inactive') rec.stop();
  }
}

/** Adds an audio track (the mic, or the shop's audio when it arrives) to the mix. */
export function addRecordingTrack(track: MediaStreamTrack) {
  if (!audioCtx || !mix || track.kind !== 'audio' || sources.has(track.id)) return;
  try {
    const src = audioCtx.createMediaStreamSource(new MediaStream([track]));
    src.connect(mix);
    sources.set(track.id, src);
  } catch (e) {
    console.warn('[support] could not add a track to the call recording', e);
  }
}

/** Starts recording the call's audio. Throws when the browser cannot record (the caller logs it). */
export async function startCallRecording(r: RecordingRef, tracks: MediaStreamTrack[]) {
  if (!recordingSupported()) throw new Error('This browser cannot record (no MediaRecorder or AudioContext).');
  if (callRec) return;
  ref = r;
  audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => undefined);
  mix = audioCtx.createMediaStreamDestination();
  tracks.forEach(addRecordingTrack);
  callRec = new PartRecorder(mix.stream, 'call', r);
  callRec.start();
}

/** Starts recording a shared screen (video track) with the mixed call audio. */
export async function startScreenRecording(r: RecordingRef, video: MediaStreamTrack, audioTracks: MediaStreamTrack[]) {
  if (!recordingSupported()) throw new Error('This browser cannot record.');
  if (screenRec) return;
  if (!audioCtx || !mix) {
    // Audio recording is off for calls: build the mix just for the screen recording.
    ref = r;
    audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => undefined);
    mix = audioCtx.createMediaStreamDestination();
    audioTracks.forEach(addRecordingTrack);
  }
  screenRec = new PartRecorder(new MediaStream([video, ...mix.stream.getAudioTracks()]), 'screen', r);
  screenRec.start();
}

export function stopScreenRecording() {
  screenRec?.stop();
  screenRec = null;
}

export const isRecordingCall = () => !!callRec;
export const isRecordingScreen = () => !!screenRec;

/** Ends every recording of the call; the last parts upload in the background. */
export function stopAllRecording() {
  stopScreenRecording();
  callRec?.stop();
  callRec = null;
  const ctx = audioCtx;
  audioCtx = null;
  mix = null;
  sources.clear();
  ref = null;
  // Let the recorders hand over their last data before the audio graph goes.
  if (ctx) window.setTimeout(() => { void ctx.close().catch(() => undefined); }, 1_500);
}

export const recordingRef = () => ref;
