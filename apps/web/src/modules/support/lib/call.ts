/**
 * Voice call and screen share with the Nafaa team over WebRTC.
 *
 * Signalling goes through the support socket (SUPPORT_EVENTS.call*):
 *   invite → accept | decline (| cancel by the caller) → offer / answer / ice
 *   (callSignal) → end. The side that invited sends the first offer.
 * Offers carry an audio and a video line, so a screen share later only swaps
 * the video track. If the other side's offer had no video line, adding the
 * screen sends a new offer; this browser is the "polite" side when two offers
 * cross (it rolls its own back). `callMedia` tells the other side when the
 * screen share or mute changes.
 *
 * The server relays every call event to the other people in the conversation
 * with `from`; events from another tab of this shop (from.side MERCHANT) only
 * stop this tab ringing.
 *
 * The team may record the call (and a shared screen). `callRecording` says
 * what is being recorded right now, and the call card shows the notice.
 */

import { create } from 'zustand';
import { t } from '@core/i18n';
import {
  SUPPORT_EVENTS, type SupportCallInvite, type SupportCallMedia, type SupportCallRecording, type SupportCallRelay, type SupportCallSignal, type SupportIceServer,
} from '../api/support.types';
import { emitWithAck, getSupportSocket } from './socket';
import { alertIncomingCall } from './notify';
import { startRingtone } from './sounds';

export type CallPhase = 'idle' | 'incoming' | 'outgoing' | 'connecting' | 'active' | 'ended';
export type CallEndReason = 'ended' | 'declined' | 'missed' | 'failed' | 'no-mic' | 'unsupported';

type CallRef = { conversationId: string; callId: string };

const RING_TIMEOUT_MS = 45_000;
const FALLBACK_ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export const canCall = (): boolean =>
  typeof window !== 'undefined' && typeof window.RTCPeerConnection !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/** Screen sharing needs getDisplayMedia, which phones and tablets do not have. */
export const canShareScreen = (): boolean =>
  canCall() && typeof navigator.mediaDevices.getDisplayMedia === 'function' && !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

interface CallState {
  phase: CallPhase;
  callId: string | null;
  conversationId: string | null;
  media: SupportCallMedia;
  /** The agent's name when known. */
  peerName: string | null;
  incoming: boolean;
  muted: boolean;
  /** The other side muted its microphone. */
  peerMuted: boolean;
  sharing: boolean;
  remoteAudio: MediaStream | null;
  remoteScreen: MediaStream | null;
  startedAt: number | null;
  endReason: CallEndReason | null;
  minimized: boolean;
  /** The team is recording the call's audio. */
  recorded: boolean;
  /** The team is recording a shared screen. */
  screenRecorded: boolean;

  setIceServers: (list: SupportIceServer[] | undefined) => void;
  start: (conversationId: string, media: SupportCallMedia) => Promise<void>;
  accept: () => Promise<void>;
  decline: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleScreen: () => Promise<void>;
  setMinimized: (on: boolean) => void;
  dismiss: () => void;

  onInvite: (e: SupportCallRelay<SupportCallInvite>) => void;
  onAccept: (e: SupportCallRelay<CallRef>) => void;
  onDecline: (e: SupportCallRelay<CallRef>) => void;
  onCancel: (e: SupportCallRelay<CallRef> & { reason?: string }) => void;
  onSignal: (e: SupportCallRelay<SupportCallSignal>) => void;
  onMedia: (e: SupportCallRelay<CallRef & { screen: boolean; muted: boolean }>) => void;
  onEnd: (e: SupportCallRelay<CallRef> & { reason?: string }) => void;
  onRecording: (e: SupportCallRelay<SupportCallRecording>) => void;
}

/* Connection objects live outside the store: they are not render state. */
let pc: RTCPeerConnection | null = null;
let micStream: MediaStream | null = null;
let screenStream: MediaStream | null = null;
let screenSender: RTCRtpSender | null = null;
let stopRing: (() => void) | null = null;
let ringTimer: number | null = null;
let dismissTimer: number | null = null;
let iceServers: RTCIceServer[] = FALLBACK_ICE;
let pendingCandidates: RTCIceCandidateInit[] = [];
let makingOffer = false;
let shareAfterConnect = false;

const newCallId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `call-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emit = (event: string, payload: unknown) => { getSupportSocket()?.emit(event, payload); };

function clearRing() {
  stopRing?.();
  stopRing = null;
  if (ringTimer) window.clearTimeout(ringTimer);
  ringTimer = null;
}

function teardown() {
  clearRing();
  try { pc?.close(); } catch { /* already closed */ }
  pc = null;
  micStream?.getTracks().forEach((tr) => tr.stop());
  micStream = null;
  screenStream?.getTracks().forEach((tr) => tr.stop());
  screenStream = null;
  screenSender = null;
  pendingCandidates = [];
  makingOffer = false;
  shareAfterConnect = false;
}

const fromOtherTab = (e: { from?: { side: string } }) => e.from?.side === 'MERCHANT';

export const useCallStore = create<CallState>((set, get) => {
  const ref = (): CallRef | null => {
    const { callId, conversationId } = get();
    return callId && conversationId ? { callId, conversationId } : null;
  };
  const sendSignal = (body: Omit<SupportCallSignal, 'conversationId' | 'callId'>) => {
    const r = ref();
    if (r) emit(SUPPORT_EVENTS.callSignal, { ...r, ...body });
  };
  const sendMedia = () => {
    const r = ref();
    if (r) emit(SUPPORT_EVENTS.callMedia, { ...r, screen: get().sharing, muted: get().muted });
  };

  /** Shows "call ended" for a moment, then closes the call card. */
  const ended = (reason: CallEndReason) => {
    teardown();
    const id = get().callId;
    set({ phase: 'ended', endReason: reason, remoteAudio: null, remoteScreen: null, sharing: false, minimized: false });
    if (dismissTimer) window.clearTimeout(dismissTimer);
    dismissTimer = window.setTimeout(() => { if (get().phase === 'ended' && get().callId === id) get().dismiss(); }, 2500);
  };

  const getMic = async (): Promise<boolean> => {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      return true;
    } catch {
      return false;
    }
  };

  const createPeer = () => {
    const conn = new RTCPeerConnection({ iceServers });
    pc = conn;
    conn.onicecandidate = (e) => { if (e.candidate) sendSignal({ type: 'ice', candidate: e.candidate.toJSON() }); };
    conn.ontrack = (e) => {
      if (e.track.kind === 'audio') {
        set({ remoteAudio: e.streams[0] ?? new MediaStream([e.track]) });
        return;
      }
      const track = e.track;
      const show = () => set({ remoteScreen: new MediaStream([track]) });
      const hide = () => set({ remoteScreen: null });
      track.onunmute = show;
      track.onmute = hide;
      track.onended = hide;
      if (!track.muted) show();
    };
    conn.onconnectionstatechange = () => {
      const s = conn.connectionState;
      if (s === 'connected') {
        clearRing();
        if (get().phase !== 'active') set({ phase: 'active', startedAt: Date.now() });
        if (shareAfterConnect) { shareAfterConnect = false; void get().toggleScreen(); }
      } else if (s === 'failed') {
        const r = ref();
        if (r) emit(SUPPORT_EVENTS.callEnd, r);
        ended('failed');
      }
    };
    conn.onnegotiationneeded = async () => {
      // Only renegotiation after the first exchange; the first offer is sent on accept.
      if (conn.signalingState !== 'stable' || !conn.remoteDescription) return;
      try {
        makingOffer = true;
        await conn.setLocalDescription(await conn.createOffer());
        sendSignal({ type: 'offer', sdp: conn.localDescription?.toJSON() });
      } catch { /* the next change retries */ } finally {
        makingOffer = false;
      }
    };
    return conn;
  };

  /** Microphone plus a ready video line, so a screen share is only a track swap. */
  const addLocalTracks = (conn: RTCPeerConnection) => {
    micStream?.getAudioTracks().forEach((tr) => conn.addTrack(tr, micStream!));
    const video = conn.getTransceivers().find((tr) => tr.receiver.track.kind === 'video');
    if (video) {
      video.direction = 'sendrecv';
      screenSender = video.sender;
    } else {
      screenSender = conn.addTransceiver('video', { direction: 'sendrecv' }).sender;
    }
  };

  const flushCandidates = async () => {
    const list = pendingCandidates;
    pendingCandidates = [];
    for (const c of list) { try { await pc?.addIceCandidate(c); } catch { /* stale */ } }
  };

  const fresh = {
    muted: false, peerMuted: false, sharing: false, startedAt: null, endReason: null, remoteAudio: null, remoteScreen: null, minimized: false,
    recorded: false, screenRecorded: false,
  } as const;

  return {
    phase: 'idle',
    callId: null,
    conversationId: null,
    media: 'voice',
    peerName: null,
    incoming: false,
    ...fresh,

    setIceServers: (list) => { iceServers = list?.length ? (list as RTCIceServer[]) : FALLBACK_ICE; },

    start: async (conversationId, media) => {
      const { phase } = get();
      if (phase !== 'idle' && phase !== 'ended') return;
      teardown();
      if (!canCall()) { set({ callId: null }); ended('unsupported'); return; }
      const callId = newCallId();
      set({ ...fresh, phase: 'outgoing', callId, conversationId, media, incoming: false, peerName: null });
      if (!(await getMic())) { ended('no-mic'); return; }
      if (get().callId !== callId || get().phase !== 'outgoing') { teardown(); return; }
      shareAfterConnect = media === 'screen';
      void emitWithAck<{ ok?: boolean }>(SUPPORT_EVENTS.callInvite, { conversationId, callId, media } satisfies SupportCallInvite).then((ack) => {
        // Refused (the team is already on this chat's call, or the chat is gone).
        if (ack && ack.ok === false && get().callId === callId && get().phase === 'outgoing') ended('failed');
      });
      stopRing = startRingtone(true);
      ringTimer = window.setTimeout(() => {
        if (get().phase === 'outgoing' && get().callId === callId) {
          emit(SUPPORT_EVENTS.callCancel, { conversationId, callId });
          ended('missed');
        }
      }, RING_TIMEOUT_MS);
    },

    accept: async () => {
      const r = ref();
      if (get().phase !== 'incoming' || !r) return;
      clearRing();
      set({ phase: 'connecting' });
      if (!canCall() || !(await getMic())) {
        emit(SUPPORT_EVENTS.callDecline, r);
        ended(canCall() ? 'no-mic' : 'unsupported');
        return;
      }
      createPeer();
      emit(SUPPORT_EVENTS.callAccept, r);
      // The caller now sends its offer; onSignal answers it.
    },

    decline: () => {
      const r = ref();
      if (r) emit(SUPPORT_EVENTS.callDecline, r);
      teardown();
      set({ phase: 'idle', callId: null, conversationId: null, endReason: null });
    },

    hangUp: () => {
      const r = ref();
      const { phase } = get();
      if (r) emit(phase === 'outgoing' ? SUPPORT_EVENTS.callCancel : SUPPORT_EVENTS.callEnd, r);
      ended(phase === 'outgoing' ? 'missed' : 'ended');
    },

    toggleMute: () => {
      const muted = !get().muted;
      micStream?.getAudioTracks().forEach((tr) => { tr.enabled = !muted; });
      set({ muted });
      sendMedia();
    },

    toggleScreen: async () => {
      if (!pc || get().phase !== 'active') return;
      if (get().sharing) {
        screenStream?.getTracks().forEach((tr) => tr.stop());
        screenStream = null;
        try { await screenSender?.replaceTrack(null); } catch { /* closed */ }
        set({ sharing: false });
        sendMedia();
        return;
      }
      if (!canShareScreen()) return;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
      } catch {
        return; // the picker was closed
      }
      const track = screenStream.getVideoTracks()[0];
      if (!track || !pc) return;
      // The browser's own "Stop sharing" bar.
      track.onended = () => { if (get().sharing) void get().toggleScreen(); };
      try {
        if (screenSender) await screenSender.replaceTrack(track);
        else screenSender = pc.addTrack(track, screenStream);
      } catch {
        screenSender = pc.addTrack(track, screenStream);
      }
      set({ sharing: true });
      sendMedia();
    },

    setMinimized: (minimized) => set({ minimized }),

    dismiss: () => {
      teardown();
      set({ ...fresh, phase: 'idle', callId: null, conversationId: null, peerName: null });
    },

    onInvite: (e) => {
      if (fromOtherTab(e)) return;
      const { phase } = get();
      if (phase !== 'idle' && phase !== 'ended') {
        // Already on a call.
        emit(SUPPORT_EVENTS.callDecline, { conversationId: e.conversationId, callId: e.callId });
        return;
      }
      teardown();
      set({ ...fresh, phase: 'incoming', callId: e.callId, conversationId: e.conversationId, media: e.media, incoming: true, peerName: e.from?.name ?? null });
      stopRing = alertIncomingCall(
        e.media === 'screen' ? t('Nafaa team screen share karna chahti hai') : t('Nafaa team call kar rahi hai'),
        e.from?.name ?? '',
      );
      ringTimer = window.setTimeout(() => {
        if (get().phase === 'incoming' && get().callId === e.callId) ended('missed');
      }, RING_TIMEOUT_MS);
    },

    onAccept: async (e) => {
      if (get().callId !== e.callId) return;
      // Picked up in another tab of this shop: stop ringing here.
      if (fromOtherTab(e)) { if (get().phase === 'incoming') get().dismiss(); return; }
      if (get().phase !== 'outgoing') return;
      clearRing();
      set({ phase: 'connecting', peerName: e.from?.name ?? get().peerName });
      const conn = createPeer();
      addLocalTracks(conn);
      try {
        makingOffer = true;
        await conn.setLocalDescription(await conn.createOffer());
        sendSignal({ type: 'offer', sdp: conn.localDescription?.toJSON() });
      } catch {
        emit(SUPPORT_EVENTS.callEnd, ref());
        ended('failed');
      } finally {
        makingOffer = false;
      }
    },

    onDecline: (e) => {
      if (get().callId !== e.callId) return;
      if (fromOtherTab(e)) { if (get().phase === 'incoming') get().dismiss(); return; }
      ended('declined');
    },

    onCancel: (e) => {
      if (get().callId !== e.callId) return;
      const { phase } = get();
      if (phase !== 'incoming' && phase !== 'outgoing') return;
      // Answered or declined in another tab of this shop: just stop ringing here.
      if (e.reason === 'answered_elsewhere' || fromOtherTab(e)) { get().dismiss(); return; }
      ended('missed');
    },

    onSignal: async (e) => {
      if (get().callId !== e.callId || !pc) return;
      const conn = pc;
      try {
        if ((e.type === 'offer' || e.type === 'answer') && e.sdp) {
          const desc = e.sdp as RTCSessionDescriptionInit;
          if (desc.type === 'offer' && (makingOffer || conn.signalingState !== 'stable')) {
            // Polite side: drop our own offer and take theirs.
            await conn.setLocalDescription({ type: 'rollback' });
          }
          await conn.setRemoteDescription(desc);
          if (desc.type === 'offer') {
            if (!conn.getSenders().some((s) => s.track?.kind === 'audio')) addLocalTracks(conn);
            await conn.setLocalDescription(await conn.createAnswer());
            sendSignal({ type: 'answer', sdp: conn.localDescription?.toJSON() });
          }
          await flushCandidates();
        } else if (e.type === 'ice' && e.candidate) {
          const c = e.candidate as RTCIceCandidateInit;
          if (conn.remoteDescription) await conn.addIceCandidate(c);
          else pendingCandidates.push(c);
        }
      } catch {
        /* a late or duplicate signal; the connection state decides */
      }
    },

    onMedia: (e) => {
      if (get().callId !== e.callId) return;
      set({ peerMuted: !!e.muted, ...(e.screen ? {} : { remoteScreen: null }) });
    },

    onRecording: (e) => {
      if (get().callId !== e.callId) return;
      set({ recorded: !!e.audio, screenRecorded: !!e.screen });
    },

    onEnd: (e) => {
      // Sent only to the two people on the call (or to the caller when nobody answered).
      if (get().callId !== e.callId) return;
      ended(e.reason === 'missed' ? 'missed' : 'ended');
    },
  };
});
