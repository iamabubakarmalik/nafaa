/**
 * Camera barcode / IMEI scanner. Asks for the camera, prefers the back
 * camera, offers torch and camera switch where the device has them, and
 * always lets the code be typed instead. One read closes it with a beep.
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { AlertCircle, CameraOff, CheckCircle2, Keyboard, Loader2, RefreshCw, SwitchCamera, X, Zap } from 'lucide-react';
import { cn } from '@core/lib/cn';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
}

type CameraState = 'starting' | 'live' | 'denied' | 'none' | 'failed';

const MESSAGES: Record<Exclude<CameraState, 'starting' | 'live'>, { title: string; body: string }> = {
  denied: { title: 'Camera ki ijazat nahi mili', body: 'Address bar me 🔒 par tap karein, Camera ko Allow karein, phir dobara koshish karein.' },
  none: { title: 'Camera nahi mila', body: 'Is device par camera nahi hai ya browser camera nahi deta. Neeche code likh dein.' },
  failed: { title: 'Camera shuru nahi hua', body: 'Shayad koi aur app camera chala rahi hai. Use band kar ke dobara koshish karein.' },
};

export default function BarcodeScanner({ onDetected, onClose, title = 'Barcode scan', hint = 'Barcode ya IMEI ko dabbe ke andar rakhein' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const doneRef = useRef(false);
  const detectedRef = useRef(onDetected);
  detectedRef.current = onDetected;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const [state, setState] = useState<CameraState>('starting');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const [typing, setTyping] = useState(false);
  const [code, setCode] = useState('');
  const [found, setFound] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const finish = useCallback((value: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    controlsRef.current?.stop();
    setFound(value);
    try { navigator.vibrate?.(60); } catch { /* not supported */ }
    beep();
    window.setTimeout(() => detectedRef.current(value), 180);
  }, []);

  // Ask for the camera and pick the back one.
  useEffect(() => {
    let alive = true;
    (async () => {
      setState('starting');
      if (!navigator.mediaDevices?.getUserMedia) { setState('none'); setTyping(true); return; }
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        probe.getTracks().forEach((t) => t.stop());
        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!alive) return;
        if (!list.length) { setState('none'); setTyping(true); return; }
        setDevices(list);
        const back = list.find((d) => /back|rear|environment/i.test(d.label) && !/front|face/i.test(d.label));
        setDeviceId((cur) => cur || back?.deviceId || list[list.length - 1].deviceId);
      } catch (e) {
        if (!alive) return;
        const name = (e as { name?: string })?.name ?? '';
        setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'none' : 'failed');
        setTyping(true);
      }
    })();
    return () => { alive = false; };
  }, [attempt]);

  // Read from the chosen camera.
  useEffect(() => {
    if (!deviceId || !videoRef.current) return;
    let alive = true;
    doneRef.current = false;
    const reader = new BrowserMultiFormatReader();
    reader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
      const text = result?.getText();
      if (alive && text) finish(text);
    }).then((controls) => {
      if (!alive) { controls.stop(); return; }
      controlsRef.current = controls;
      setState('live');
      const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined;
      setTorch({ supported: !!caps?.torch, on: false });
    }).catch(() => { if (alive) { setState('failed'); setTyping(true); } });
    return () => { alive = false; controlsRef.current?.stop(); controlsRef.current = null; };
  }, [deviceId, attempt, finish]);

  // Escape closes; the page behind does not scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); } };
    window.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey, true); document.body.style.overflow = overflow; };
  }, []);

  const toggleTorch = async () => {
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch.on } as MediaTrackConstraintSet] });
      setTorch((t) => ({ ...t, on: !t.on }));
    } catch { setTorch({ supported: false, on: false }); }
  };

  const switchCamera = () => {
    if (devices.length < 2) return;
    const i = devices.findIndex((d) => d.deviceId === deviceId);
    setTorch({ supported: false, on: false });
    setDeviceId(devices[(i + 1) % devices.length].deviceId);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = code.trim();
    if (v) finish(v);
  };

  const problem = state === 'denied' || state === 'none' || state === 'failed' ? MESSAGES[state] : null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden bg-slate-950 text-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="relative aspect-[3/4] max-h-[70dvh] w-full bg-black sm:aspect-[4/3]">
          <video ref={videoRef} autoPlay playsInline muted className={cn('h-full w-full object-cover transition-opacity', state === 'live' ? 'opacity-100' : 'opacity-0')} />

          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="min-w-0">
              <p className="text-base font-semibold">{title}</p>
              <p className="mt-0.5 text-[0.8125rem] text-white/70">{hint}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Band karein"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Frame */}
          {state === 'live' && !found && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
              <div className="relative aspect-[5/3] w-4/5 max-w-sm rounded-2xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]">
                {['left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl',
                  'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl'].map((c) => (
                  <span key={c} className={cn('absolute h-8 w-8 border-white', c)} />
                ))}
                <span className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 animate-pulse rounded-full bg-brand-400 shadow-[0_0_16px_rgba(255,255,255,0.6)]" />
              </div>
            </div>
          )}

          {state === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white/70" />
              <p className="text-sm text-white/80">Camera khul raha hai…</p>
              <p className="max-w-xs text-xs text-white/50">Browser poochhe to "Allow" dabayein</p>
            </div>
          )}

          {problem && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                {state === 'denied' ? <AlertCircle className="h-7 w-7 text-rose-300" /> : <CameraOff className="h-7 w-7 text-white/70" />}
              </span>
              <p className="font-semibold">{problem.title}</p>
              <p className="max-w-xs text-sm text-white/70">{problem.body}</p>
              {state !== 'none' && (
                <button type="button" onClick={() => { setDeviceId(''); setAttempt((a) => a + 1); }}
                  className="mt-1 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-white/90">
                  <RefreshCw className="h-4 w-4" /> Dobara koshish
                </button>
              )}
            </div>
          )}

          {found && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-600/70 text-center">
              <CheckCircle2 className="h-14 w-14" />
              <p className="max-w-[80%] truncate font-mono text-lg font-semibold">{found}</p>
            </div>
          )}

          {/* Camera controls */}
          {state === 'live' && !found && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-4">
              {torch.supported && (
                <button type="button" onClick={toggleTorch} aria-pressed={torch.on} aria-label="Torch"
                  className={cn('flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition', torch.on ? 'bg-amber-300 text-slate-900' : 'bg-white/15 hover:bg-white/25')}>
                  <Zap className="h-5 w-5" />
                </button>
              )}
              {devices.length > 1 && (
                <button type="button" onClick={switchCamera} aria-label="Doosra camera"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25">
                  <SwitchCamera className="h-5 w-5" />
                </button>
              )}
              <button type="button" onClick={() => setTyping((t) => !t)} aria-pressed={typing} aria-label="Code likhein"
                className={cn('flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition', typing ? 'bg-white text-slate-900' : 'bg-white/15 hover:bg-white/25')}>
                <Keyboard className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {typing && !found && (
          <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Barcode ya IMEI likhein"
              inputMode="text" autoComplete="off" spellCheck={false} aria-label="Barcode ya IMEI"
              className="h-11 min-w-0 flex-1 rounded-xl bg-white/10 px-3 font-mono text-sm text-white outline-none ring-1 ring-white/15 placeholder:text-white/40 focus:ring-2 focus:ring-brand-400" />
            <button type="submit" disabled={!code.trim()}
              className="h-11 shrink-0 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-40">
              Theek hai
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Short beep without an audio file. */
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
    window.setTimeout(() => void ctx.close(), 300);
  } catch { /* no audio */ }
}
