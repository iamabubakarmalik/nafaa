/**
 * The call card, mounted once by the app shell so a call keeps going on any
 * page: incoming (Accept / Decline), ringing, connecting, on the call (timer,
 * mute, screen share, minimise, end) and a short "call ended" note.
 * When the team shares their screen it opens large; the person's own screen
 * share shows a "you are sharing" bar with Stop. When the team records the
 * call (or the screen) a notice says so for as long as it lasts.
 */

import { useEffect, useRef, useState } from 'react';
import { CircleDot, Maximize2, Mic, MicOff, Minimize2, Monitor, MonitorOff, MonitorUp, Phone, PhoneOff } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { NafaaAiMark } from '@modules/ai-assistant/components/NafaaAiMark';
import { canShareScreen, useCallStore, type CallEndReason } from '../lib/call';
import { clock } from '../lib/recorder';

function useTicker(on: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => setN((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [on]);
}

function endText(reason: CallEndReason | null): string {
  switch (reason) {
    case 'declined': return t('Call decline ho gayi');
    case 'missed': return t('Call ka jawab nahi mila');
    case 'failed': return t('Call connect nahi hui. Internet check karein.');
    case 'no-mic': return t('Mic ki permission nahi mili. Browser settings mein mic allow karein.');
    case 'unsupported': return t('Is browser mein call nahi ho sakti. Chrome ya Edge use karein.');
    default: return t('Call khatam');
  }
}

function RemoteAudio({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    if (stream) void ref.current.play().catch(() => undefined);
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline className="hidden" />;
}

function RemoteScreen({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [big, setBig] = useState(true);
  useEffect(() => {
    if (ref.current) { ref.current.srcObject = stream; void ref.current.play().catch(() => undefined); }
  }, [stream]);
  return (
    <div className={cn('fixed z-[96] overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10 print:hidden',
      big ? 'inset-3 sm:inset-8' : 'bottom-24 end-4 h-44 w-72')}>
      <video ref={ref} autoPlay playsInline muted className="h-full w-full object-contain" />
      <div className="absolute start-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.75rem] font-medium text-white">{t('Nafaa team ki screen')}</div>
      <button type="button" onClick={() => setBig((b) => !b)} aria-label={big ? t('Chhota karein') : t('Bara karein')}
        className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
        {big ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

const roundBtn = 'flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

export function CallOverlay() {
  const s = useCallStore();
  useTicker(s.phase === 'active');
  if (s.phase === 'idle') return null;

  const name = s.peerName ? t('{{name}} (Nafaa team)', { name: s.peerName }) : t('Nafaa Support');
  const line = s.phase === 'incoming'
    ? (s.media === 'screen' ? t('Screen share ke liye call') : t('Voice call aa rahi hai'))
    : s.phase === 'outgoing' ? t('Ring ho rahi hai…')
      : s.phase === 'connecting' ? t('Call connect ho rahi hai…')
        : s.phase === 'active' ? clock(s.startedAt ? (Date.now() - s.startedAt) / 1000 : 0)
          : endText(s.endReason);

  if (s.minimized && s.phase === 'active') {
    return (
      <>
        <RemoteAudio stream={s.remoteAudio} />
        {s.remoteScreen && <RemoteScreen stream={s.remoteScreen} />}
        <button type="button" onClick={() => s.setMinimized(false)}
          className="fixed start-1/2 top-3 z-[95] flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-[0.8125rem] font-semibold text-white shadow-xl rtl:translate-x-1/2 print:hidden">
          <Phone className="h-4 w-4" /> {t('Call jari hai')} · <span className="tabular-nums">{line}</span>
          {s.screenRecorded ? <span className="inline-flex items-center gap-1">· <CircleDot className="h-3.5 w-3.5 animate-pulse" /> {t('Screen record ho rahi hai')}</span>
            : s.recorded && <CircleDot className="h-3.5 w-3.5" aria-label={t('Behtar support ke liye yeh call record ho rahi hai')} />}
        </button>
      </>
    );
  }

  return (
    <>
      <RemoteAudio stream={s.remoteAudio} />
      {s.remoteScreen && <RemoteScreen stream={s.remoteScreen} />}
      <div role="dialog" aria-live="assertive" aria-label={t('Support call')}
        className="fixed inset-x-3 top-3 z-[95] mx-auto max-w-sm overflow-hidden rounded-3xl bg-ink-900 text-white shadow-2xl ring-1 ring-white/10 print:hidden">
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <span className={cn('relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white', (s.phase === 'incoming' || s.phase === 'outgoing') && 'animate-pulse')}>
            <NafaaAiMark size={30} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.9375rem] font-semibold">{name}</div>
            <div className={cn('truncate text-[0.8125rem]', s.phase === 'ended' ? 'text-rose-300' : 'text-white/70', s.phase === 'active' && 'tabular-nums')}>
              {line}{s.phase === 'active' && s.peerMuted ? ` · ${t('Team ka mic band hai')}` : ''}
            </div>
          </div>
          {s.phase === 'active' && (
            <button type="button" onClick={() => s.setMinimized(true)} aria-label={t('Chhota karein')} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
              <Minimize2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {s.phase === 'active' && (s.recorded || s.screenRecorded) && (
          <div role="status" className="mx-4 mb-3 space-y-1 rounded-xl bg-white/10 px-3 py-2 text-[0.75rem] text-white/85">
            {s.recorded && <p className="flex items-start gap-2"><CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" /> {t('Behtar support ke liye yeh call record ho rahi hai')}</p>}
            {s.screenRecorded && <p className="flex items-start gap-2"><CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-pulse text-rose-300" /> {t('Screen record ho rahi hai')}</p>}
          </div>
        )}

        {s.sharing && (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-[0.75rem] text-emerald-200">
            <MonitorUp className="h-4 w-4 shrink-0" /> <span className="flex-1">{t('Aap ki screen share ho rahi hai')}</span>
            <button type="button" onClick={() => void s.toggleScreen()} className="font-semibold text-white underline-offset-2 hover:underline">{t('Rokein')}</button>
          </div>
        )}

        {s.phase !== 'ended' && (
          <div className="flex items-center justify-center gap-4 border-t border-white/10 px-4 py-3">
            {s.phase === 'incoming' ? (
              <>
                <div className="flex flex-col items-center gap-1">
                  <button type="button" onClick={s.decline} aria-label={t('Decline')} className={cn(roundBtn, 'h-12 w-12 bg-rose-600 hover:bg-rose-700')}><PhoneOff className="h-5 w-5" /></button>
                  <span className="text-[0.6875rem] text-white/70">{t('Decline')}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button type="button" onClick={() => void s.accept()} aria-label={t('Call join karein')} className={cn(roundBtn, 'h-12 w-12 animate-bounce bg-emerald-500 hover:bg-emerald-600')}><Phone className="h-5 w-5" /></button>
                  <span className="text-[0.6875rem] text-white/70">{t('Call join karein')}</span>
                </div>
              </>
            ) : (
              <>
                <button type="button" onClick={s.toggleMute} disabled={s.phase !== 'active'} aria-label={s.muted ? t('Mic on karein') : t('Mic band karein')} aria-pressed={s.muted}
                  className={cn(roundBtn, s.muted ? 'bg-ink-white text-ink-900' : 'bg-white/10 hover:bg-white/20', 'disabled:opacity-40')}>
                  {s.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                {canShareScreen() && (
                  <button type="button" onClick={() => void s.toggleScreen()} disabled={s.phase !== 'active'} aria-label={s.sharing ? t('Screen share band karein') : t('Screen share karein')} aria-pressed={s.sharing}
                    title={s.sharing ? t('Screen share band karein') : t('Screen share karein')}
                    className={cn(roundBtn, s.sharing ? 'bg-ink-white text-ink-900' : 'bg-white/10 hover:bg-white/20', 'disabled:opacity-40')}>
                    {s.sharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                  </button>
                )}
                <button type="button" onClick={s.hangUp} aria-label={t('Call khatam karein')} className={cn(roundBtn, 'h-12 w-12 bg-rose-600 hover:bg-rose-700')}>
                  <PhoneOff className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
