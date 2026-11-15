/**
 * Voice calls and screen share with a shop (WebRTC). Signalling goes over the
 * support socket (see SUPPORT_EVENTS in support.types.ts):
 *   caller: invite → (callee accepts) → offer → answer; ICE both ways
 *   callee: accept → receives offer → answer
 * Both sides keep one video transceiver from the start: the caller adds it
 * to its first offer, the callee turns the offered one to send-and-receive.
 * Screen share then swaps a track into it (replaceTrack, no renegotiation)
 * and announces it with support:call:media { screen }. If the other side
 * renegotiates anyway, offers are handled with "perfect negotiation" where
 * the admin is the impolite peer (it ignores an offer that crosses its own).
 * One call at a time.
 *
 * Recording (lib/recording.ts): when Support settings say "Record calls",
 * the call's audio is recorded from the moment it connects; a shared screen
 * is recorded only while the agent turns "Record" on. The shop side is told
 * over support:call:recording so it can show the notice. A recording that
 * fails is logged and the call goes on.
 */

import { create } from 'zustand';
import { toast } from 'sonner';
import { adminSupportApi } from '@/api/admin-support.api';
import { emitAck, supportSocket } from './socket';
import { startRing, stopRing } from './tones';
import { SUPPORT_EVENTS, type SupportCallMedia, type SupportCallSignal, type SupportIceServer } from './support.types';
import {
  addRecordingTrack,
  isRecordingScreen,
  onRecordingUploadFailed,
  startCallRecording,
  startScreenRecording,
  stopAllRecording,
  stopScreenRecording,
} from './recording';

type Phase = 'idle' | 'ringing-in' | 'calling' | 'connecting' | 'live';

interface CallInfo {
  conversationId: string;
  callId: string;
  media: SupportCallMedia;
  /** Who is on the other side (shop user's name). */
  peerName: string | null;
  shopName?: string | null;
  direction: 'in' | 'out';
}

interface CallStore {
  phase: Phase;
  call: CallInfo | null;
  startedAt: number | null;
  muted: boolean;
  sharing: boolean;
  remoteScreen: boolean;
  remoteStream: MediaStream | null;
  /** The call's audio is being recorded. */
  recording: boolean;
  /** The visible shared screen is being recorded. */
  recordingScreen: boolean;
  set: (p: Partial<CallStore>) => void;
}

export const useCallStore = create<CallStore>((set) => ({
  phase: 'idle', call: null, startedAt: null, muted: false, sharing: false, remoteScreen: false, remoteStream: null,
  recording: false, recordingScreen: false,
  set: (p) => set(p),
}));

let pc: RTCPeerConnection | null = null;
let mic: MediaStream | null = null;
let screen: MediaStream | null = null;
let screenSender: RTCRtpSender | null = null;
let videoTx: RTCRtpTransceiver | null = null;
let makingOffer = false;
/** First offer/answer done: later negotiation-needed events renegotiate. */
let negotiated = false;
let ice: SupportIceServer[] | null = null;
/** Support settings "Record calls", read when a call starts (on unless turned off). */
let recordCalls = true;
const pendingIce: RTCIceCandidateInit[] = [];

const st = () => useCallStore.getState();
export const screenShareSupported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices;

async function loadRecordSetting() {
  recordCalls = await adminSupportApi.settings().then((s) => s.recordCalls !== false).catch(() => true);
}

onRecordingUploadFailed((kind) => toast.error(`The ${kind === 'screen' ? 'screen' : 'call'} recording could not be uploaded, so it was saved to this computer. Please send it to the team lead.`));

/** Tells the shop side what is being recorded (and the server, which logs failures). */
function sendRecordingState(error?: string) {
  const c = st().call;
  if (!c) return;
  supportSocket()?.emit(SUPPORT_EVENTS.callRecording, { conversationId: c.conversationId, callId: c.callId, audio: st().recording, screen: st().recordingScreen, ...(error && { error }) });
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

async function beginCallRecording() {
  const c = st().call;
  if (!c || !recordCalls || st().recording) return;
  try {
    const tracks = [...(mic?.getAudioTracks() ?? []), ...(st().remoteStream?.getAudioTracks() ?? [])];
    await startCallRecording({ conversationId: c.conversationId, callId: c.callId }, tracks);
    st().set({ recording: true });
    sendRecordingState();
  } catch (e) {
    console.warn('[support] call recording did not start', e);
    sendRecordingState(`call: ${errText(e)}`);
  }
}

/** The video of the screen that is on show right now: the shop's, else our own share. */
function visibleScreenTrack(): MediaStreamTrack | null {
  if (st().remoteScreen) {
    const t = st().remoteStream?.getVideoTracks().find((v) => v.readyState === 'live');
    if (t) return t;
  }
  if (st().sharing) return screen?.getVideoTracks().find((v) => v.readyState === 'live') ?? null;
  return null;
}

/** "Record" while a screen share is visible. Off by default for every call. */
export async function toggleScreenRecording() {
  const c = st().call;
  if (!c || st().phase !== 'live') return;
  if (st().recordingScreen) {
    stopScreenRecording();
    st().set({ recordingScreen: false });
    sendRecordingState();
    return;
  }
  const video = visibleScreenTrack();
  if (!video) { toast.error('No shared screen to record.'); return; }
  try {
    const audio = [...(mic?.getAudioTracks() ?? []), ...(st().remoteStream?.getAudioTracks() ?? [])];
    await startScreenRecording({ conversationId: c.conversationId, callId: c.callId }, video, audio);
    st().set({ recordingScreen: true });
    sendRecordingState();
  } catch (e) {
    console.warn('[support] screen recording did not start', e);
    toast.error('Screen recording could not start. The call goes on.');
    sendRecordingState(`screen: ${errText(e)}`);
  }
}

/** The screen being recorded went away: stop that recording (the audio one goes on). */
function screenGone() {
  if (!isRecordingScreen() || visibleScreenTrack()) return;
  stopScreenRecording();
  st().set({ recordingScreen: false });
  sendRecordingState();
}

async function iceServers(): Promise<RTCIceServer[]> {
  if (!ice) ice = await adminSupportApi.ice().catch(() => [{ urls: 'stun:stun.l.google.com:19302' }]);
  return ice as RTCIceServer[];
}

function signal(type: SupportCallSignal['type'], extra: Partial<SupportCallSignal>) {
  const c = st().call;
  if (!c) return;
  supportSocket()?.emit(SUPPORT_EVENTS.callSignal, { conversationId: c.conversationId, callId: c.callId, type, ...extra });
}

async function makePeer() {
  pc = new RTCPeerConnection({ iceServers: await iceServers() });
  const remote = new MediaStream();
  st().set({ remoteStream: remote });
  pc.ontrack = (e) => {
    if (!remote.getTracks().includes(e.track)) remote.addTrack(e.track);
    if (e.track.kind === 'audio' && st().recording) addRecordingTrack(e.track);
    // The video track exists from the start (empty); the other side says when its screen is on
    // (support:call:media). An unmuted track also means frames are arriving.
    if (e.track.kind === 'video') {
      e.track.onunmute = () => st().set({ remoteScreen: true });
      e.track.onended = () => { st().set({ remoteScreen: false }); screenGone(); };
    }
    st().set({ remoteStream: remote });
  };
  pc.onnegotiationneeded = () => { if (negotiated) void sendOffer(); };
  pc.onicecandidate = (e) => { if (e.candidate) signal('ice', { candidate: e.candidate.toJSON() }); };
  pc.onconnectionstatechange = () => {
    if (pc?.connectionState === 'connected' && st().phase !== 'live') {
      st().set({ phase: 'live', startedAt: Date.now() });
      void beginCallRecording();
    }
    if (pc?.connectionState === 'failed') {
      toast.error('The call could not connect. Their network may need a TURN server.');
      void endCall();
    }
  };
  mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  mic.getTracks().forEach((t) => pc!.addTrack(t, mic!));
  // Caller: offer a video slot from the start so either side can share a screen without renegotiation.
  if (st().call?.direction === 'out') videoTx = pc.addTransceiver('video', { direction: 'sendrecv' });
}

async function sendOffer() {
  if (!pc || makingOffer) return;
  try {
    makingOffer = true;
    await pc.setLocalDescription();
    const d = pc.localDescription;
    if (d) signal('offer', { sdp: { type: d.type, sdp: d.sdp } });
  } finally {
    makingOffer = false;
  }
}

function cleanup() {
  stopRing();
  // Recorders stop first so their last data is kept; the files upload in the background.
  stopAllRecording();
  pc?.getSenders().forEach((s) => s.track?.stop());
  pc?.close();
  mic?.getTracks().forEach((t) => t.stop());
  screen?.getTracks().forEach((t) => t.stop());
  pc = null; mic = null; screen = null; screenSender = null; videoTx = null; makingOffer = false; negotiated = false;
  pendingIce.length = 0;
  st().set({ phase: 'idle', call: null, startedAt: null, muted: false, sharing: false, remoteScreen: false, remoteStream: null, recording: false, recordingScreen: false });
}

/* ───────────────────────── outgoing ───────────────────────── */

export async function startCall(conversationId: string, media: SupportCallMedia, peerName: string | null, shopName?: string | null) {
  if (st().phase !== 'idle') { toast.error('Finish the current call first.'); return; }
  const callId = crypto.randomUUID();
  void loadRecordSetting();
  st().set({ phase: 'calling', call: { conversationId, callId, media, peerName, shopName, direction: 'out' } });
  const r = await emitAck(SUPPORT_EVENTS.callInvite, { conversationId, callId, media });
  if (!r.ok) {
    toast.error(r.error === 'busy' ? 'A call is already running in this chat.' : 'Could not start the call.');
    cleanup();
  }
}

/* ───────────────────────── incoming ───────────────────────── */

export function incomingCall(info: Omit<CallInfo, 'direction'>) {
  if (st().phase !== 'idle') return;
  st().set({ phase: 'ringing-in', call: { ...info, direction: 'in' } });
  startRing();
}

export async function acceptCall() {
  const c = st().call;
  if (!c || st().phase !== 'ringing-in') return;
  stopRing();
  void loadRecordSetting();
  const r = await emitAck(SUPPORT_EVENTS.callAccept, { conversationId: c.conversationId, callId: c.callId });
  if (!r.ok) { toast.error('Someone else answered, or the call ended.'); cleanup(); return; }
  st().set({ phase: 'connecting' });
  try {
    await makePeer();
  } catch {
    toast.error('Allow the microphone to talk.');
    void endCall();
  }
}

export function declineCall() {
  const c = st().call;
  if (!c) return;
  supportSocket()?.emit(SUPPORT_EVENTS.callDecline, { conversationId: c.conversationId, callId: c.callId });
  cleanup();
}

/* ───────────────────────── during the call ───────────────────────── */

export async function endCall() {
  const c = st().call;
  if (c) {
    const event = st().phase === 'calling' ? SUPPORT_EVENTS.callCancel : SUPPORT_EVENTS.callEnd;
    supportSocket()?.emit(event, { conversationId: c.conversationId, callId: c.callId });
  }
  cleanup();
}

export function toggleMute() {
  const muted = !st().muted;
  mic?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  st().set({ muted });
  const c = st().call;
  if (c) supportSocket()?.emit(SUPPORT_EVENTS.callMedia, { conversationId: c.conversationId, callId: c.callId, screen: st().sharing, muted });
}

export async function toggleScreen() {
  const c = st().call;
  if (!pc || !c) return;
  if (st().sharing) {
    screen?.getTracks().forEach((t) => t.stop());
    if (videoTx) await videoTx.sender.replaceTrack(null);
    else if (screenSender) pc.removeTrack(screenSender);
    screen = null; screenSender = null;
    st().set({ sharing: false });
    screenGone();
  } else {
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    } catch {
      return;
    }
    const track = screen.getVideoTracks()[0];
    track.onended = () => { if (st().sharing) void toggleScreen(); };
    if (videoTx) await videoTx.sender.replaceTrack(track);
    else screenSender = pc.addTrack(track, screen); // renegotiates through onnegotiationneeded
    st().set({ sharing: true });
  }
  supportSocket()?.emit(SUPPORT_EVENTS.callMedia, { conversationId: c.conversationId, callId: c.callId, screen: st().sharing, muted: st().muted });
}

/* ───────────────────────── socket wiring ───────────────────────── */

type From = { from?: { side: string; name: string | null } };
type CallEvt = { conversationId: string; callId: string; reason?: string } & From;

/** Call once (by SupportLive): handles every call event from the socket. */
export function wireCallEvents(onInvite: (e: { conversationId: string; callId: string; media: SupportCallMedia; from: { side: string; name: string | null } }) => void) {
  const s = supportSocket();
  if (!s) return () => undefined;
  const same = (e: CallEvt) => st().call?.callId === e.callId;

  const onInviteEvt = (e: { conversationId: string; callId: string; media: SupportCallMedia; from: { side: string; name: string | null } }) => {
    if (e.from?.side === 'MERCHANT') onInvite(e);
  };
  const onAccept = async (e: CallEvt) => {
    if (!same(e) || st().phase !== 'calling') return;
    st().set({ phase: 'connecting' });
    try {
      await makePeer();
      if (st().call?.media === 'screen' && screenShareSupported()) {
        screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }).catch(() => null);
        const track = screen?.getVideoTracks()[0];
        if (track && videoTx) {
          track.onended = () => { if (st().sharing) void toggleScreen(); };
          await videoTx.sender.replaceTrack(track);
          st().set({ sharing: true });
        }
      }
      await sendOffer();
      const c = st().call;
      if (c && st().sharing) supportSocket()?.emit(SUPPORT_EVENTS.callMedia, { conversationId: c.conversationId, callId: c.callId, screen: true, muted: false });
    } catch {
      toast.error('Allow the microphone to talk.');
      void endCall();
    }
  };
  const onDecline = (e: CallEvt) => {
    if (!same(e)) return;
    toast.message('Call declined');
    cleanup();
  };
  const onCancel = (e: CallEvt) => {
    if (!same(e)) return;
    if (st().phase === 'ringing-in' && e.reason !== 'answered_elsewhere') toast.message('Missed call from the shop');
    cleanup();
  };
  const onEnd = (e: CallEvt) => {
    if (!same(e)) return;
    toast.message(e.reason === 'missed' ? 'No answer' : 'Call ended');
    cleanup();
  };
  const onSignal = async (e: SupportCallSignal & From) => {
    if (st().call?.callId !== e.callId || !pc) return;
    try {
      if (e.type === 'offer' && e.sdp) {
        // Impolite peer: when our own offer is in flight, the crossing offer is ignored.
        if (makingOffer || pc.signalingState !== 'stable') return;
        await pc.setRemoteDescription(e.sdp as RTCSessionDescriptionInit);
        for (const c of pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => undefined);
        // Callee: take the offered video slot as send-and-receive, so our screen can go into it later.
        if (!videoTx) {
          videoTx = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video' && t.currentDirection !== 'stopped') ?? null;
          if (videoTx) videoTx.direction = 'sendrecv';
        }
        await pc.setLocalDescription();
        const d = pc.localDescription;
        if (d) signal('answer', { sdp: { type: d.type, sdp: d.sdp } });
        negotiated = true;
      } else if (e.type === 'answer' && e.sdp) {
        if (pc.signalingState !== 'have-local-offer') return;
        await pc.setRemoteDescription(e.sdp as RTCSessionDescriptionInit);
        negotiated = true;
        for (const c of pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => undefined);
      } else if (e.type === 'ice' && e.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(e.candidate as RTCIceCandidateInit).catch(() => undefined);
        else pendingIce.push(e.candidate as RTCIceCandidateInit);
      }
    } catch {
      // A bad signal from the other side should not end a working call.
    }
  };
  const onMedia = (e: CallEvt & { screen?: boolean }) => {
    if (!same(e)) return;
    st().set({ remoteScreen: !!e.screen });
    if (!e.screen) screenGone();
  };

  s.on(SUPPORT_EVENTS.callInvite, onInviteEvt);
  s.on(SUPPORT_EVENTS.callAccept, onAccept);
  s.on(SUPPORT_EVENTS.callDecline, onDecline);
  s.on(SUPPORT_EVENTS.callCancel, onCancel);
  s.on(SUPPORT_EVENTS.callEnd, onEnd);
  s.on(SUPPORT_EVENTS.callSignal, onSignal);
  s.on(SUPPORT_EVENTS.callMedia, onMedia);
  return () => {
    s.off(SUPPORT_EVENTS.callInvite, onInviteEvt);
    s.off(SUPPORT_EVENTS.callAccept, onAccept);
    s.off(SUPPORT_EVENTS.callDecline, onDecline);
    s.off(SUPPORT_EVENTS.callCancel, onCancel);
    s.off(SUPPORT_EVENTS.callEnd, onEnd);
    s.off(SUPPORT_EVENTS.callSignal, onSignal);
    s.off(SUPPORT_EVENTS.callMedia, onMedia);
  };
}
