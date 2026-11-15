/**
 * Floating call panel: incoming ring (accept / decline), outgoing "calling…",
 * and the live call with timer, mute, screen share and end. The shop's
 * screen, when shared, shows in a large panel above the controls.
 * While the call is recorded a short notice says so; "Record" appears while a
 * screen share is visible and records it (off by default for every call).
 */

import { useEffect, useRef, useState } from 'react';
import { CircleDot, Maximize2, Mic, MicOff, Minimize2, MonitorUp, MonitorX, Phone, PhoneOff, ScreenShare } from 'lucide-react';
import { cn } from '@/lib/cn';
import { acceptCall, declineCall, endCall, screenShareSupported, toggleMute, toggleScreen, toggleScreenRecording, useCallStore } from '../lib/call';

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function CallOverlay() {
  const { phase, call, startedAt, muted, sharing, remoteScreen, remoteStream, recording, recordingScreen } = useCallStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [now, setNow] = useState(Date.now());
  const [big, setBig] = useState(false);

  useEffect(() => {
    if (phase !== 'live') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (audioRef.current && audioRef.current.srcObject !== remoteStream) audioRef.current.srcObject = remoteStream;
    if (videoRef.current && videoRef.current.srcObject !== remoteStream) videoRef.current.srcObject = remoteStream;
  }, [remoteStream, remoteScreen]);

  if (phase === 'idle' || !call) return null;
  const who = call.shopName ? `${call.peerName ?? 'Shop'} · ${call.shopName}` : call.peerName ?? 'Shop';
  const btn = 'inline-flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

  return (
    <div className={cn('fixed bottom-4 end-4 z-[90] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl', remoteScreen ? (big ? 'inset-4 w-auto' : 'w-[min(92vw,44rem)]') : 'w-[min(92vw,22rem)]')} role="dialog" aria-label="Support call">
      <audio ref={audioRef} autoPlay />
      {remoteScreen && (
        <div className="relative min-h-0 flex-1 bg-slate-900">
          <video ref={videoRef} autoPlay playsInline muted className={cn('w-full object-contain', big ? 'h-full' : 'max-h-[60vh]')} />
          <button type="button" className="absolute end-2 top-2 rounded-lg bg-slate-900/70 p-1.5 text-white" onClick={() => setBig((b) => !b)} aria-label={big ? 'Smaller' : 'Full screen'}>
            {big ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      )}
      <div className="flex items-center gap-3 p-4">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', phase === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700')}>
          {call.media === 'screen' ? <ScreenShare className="h-5 w-5" /> : <Phone className={cn('h-5 w-5', phase === 'ringing-in' && 'animate-pulse')} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{who}</p>
          <p className="text-xs text-slate-500">
            {phase === 'ringing-in' && (call.media === 'screen' ? 'Wants to share their screen' : 'Incoming call')}
            {phase === 'calling' && 'Calling…'}
            {phase === 'connecting' && 'Connecting…'}
            {phase === 'live' && <span className="tabular-nums">{clock(now - (startedAt ?? now))}{muted ? ' · muted' : ''}{sharing ? ' · sharing your screen' : ''}</span>}
          </p>
        </div>
      </div>
      {phase === 'live' && (recording || recordingScreen) && (
        <p className="mx-4 mb-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[0.75rem] text-rose-800" role="status">
          <CircleDot className="h-3.5 w-3.5 shrink-0 animate-pulse" />
          {recording && recordingScreen ? 'This call and the screen are being recorded. The shop has been told.'
            : recordingScreen ? 'The screen is being recorded. The shop has been told.'
              : 'This call is recorded. The shop has been told.'}
        </p>
      )}
      <div className="flex items-center justify-center gap-3 border-t border-slate-100 px-4 py-3">
        {phase === 'ringing-in' ? (
          <>
            <button type="button" className={cn(btn, 'bg-rose-600 text-white hover:bg-rose-700')} onClick={declineCall} aria-label="Decline"><PhoneOff className="h-5 w-5" /></button>
            <button type="button" className={cn(btn, 'bg-emerald-600 text-white hover:bg-emerald-700')} onClick={() => void acceptCall()} aria-label="Accept"><Phone className="h-5 w-5" /></button>
          </>
        ) : (
          <>
            {(phase === 'live' || phase === 'connecting') && (
              <>
                <button type="button" className={cn(btn, muted ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')} onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
                  {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                {screenShareSupported() && (
                  <button type="button" className={cn(btn, sharing ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')} onClick={() => void toggleScreen()} aria-label={sharing ? 'Stop sharing my screen' : 'Share my screen'} title={sharing ? 'Stop sharing my screen' : 'Share my screen'}>
                    {sharing ? <MonitorX className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
                  </button>
                )}
                {phase === 'live' && (remoteScreen || sharing || recordingScreen) && (
                  <button type="button" className={cn('inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium transition', recordingScreen ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
                    onClick={() => void toggleScreenRecording()} aria-pressed={recordingScreen} title={recordingScreen ? 'Stop recording the screen' : 'Record the shared screen'}>
                    <CircleDot className="h-4 w-4" /> {recordingScreen ? 'Stop' : 'Record'}
                  </button>
                )}
              </>
            )}
            <button type="button" className={cn(btn, 'bg-rose-600 text-white hover:bg-rose-700')} onClick={() => void endCall()} aria-label="End call"><PhoneOff className="h-5 w-5" /></button>
          </>
        )}
      </div>
    </div>
  );
}
