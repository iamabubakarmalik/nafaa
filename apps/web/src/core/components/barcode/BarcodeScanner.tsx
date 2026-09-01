import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  Camera, X, Loader2, AlertCircle, RefreshCw, Keyboard,
  CheckCircle2, ZapOff, Zap, ScanLine, RotateCcw, Info,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA BARCODE SCANNER — FULL BEST v2
   ─────────────────────────────────────────────────────────────
   🔐 Early camera permission request (page load pe permission)
   💡 Torch/flashlight toggle (agar support ho)
   🔄 Camera switch (front/back) with rotation icon
   ⌨️  Manual entry fallback (keyboard button)
   🎯 Scan animation + haptic-like feedback
   🌙 Dark mode perfect
   📱 Mobile-first — full screen on small devices
   ✨ Success beep + green flash on detect
   🔁 Auto-retry on failure + clear error states
   ═════════════════════════════════════════════════════════════ */

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
}

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export default function BarcodeScanner({
  onDetected,
  onClose,
  title = 'Barcode Scanner',
  hint = 'Camera ke samne barcode/IMEI rakhein',
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef(true);

  const [permission, setPermission] = useState<PermissionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  /* ─── EARLY PERMISSION REQUEST ────────────────────────
     On mount: turant permission maango — user ko clear feedback
     do agar deny kare to kya karna hai
     ─────────────────────────────────────────────────── */
  const requestPermissionAndInit = useCallback(async () => {
    setPermission('requesting');
    setError(null);

    try {
      // Step 1: Check if getUserMedia is even available
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermission('unavailable');
        setError('Aap ka browser camera support nahi karta. Manual entry use karein.');
        return;
      }

      // Step 2: Request permission with rear camera preference
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // rear camera prefer
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // Step 3: Permission granted — stash the stream and enumerate devices
      streamRef.current = stream;
      setPermission('granted');

      // Immediately release this initial stream — ZXing will create its own
      stream.getTracks().forEach((t) => t.stop());

      // Now enumerate devices (labels will be visible since permission granted)
      const allDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      setDevices(allDevices);

      if (allDevices.length === 0) {
        setError('Koi camera nahi mila');
        return;
      }

      // Prefer rear/back camera on mobile
      const rearCam = allDevices.find(
        (d) =>
          /back|rear|environment/i.test(d.label) &&
          !/front|face/i.test(d.label),
      );
      setDeviceId(rearCam?.deviceId || allDevices[0].deviceId);
    } catch (err: any) {
      console.warn('Camera permission error:', err);
      const name = err?.name || '';
      const msg = err?.message || '';

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPermission('denied');
        setError('Camera permission block hai. Browser settings me allow karein.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setPermission('unavailable');
        setError('Koi camera nahi mila — USB scanner ya manual entry use karein.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setPermission('denied');
        setError('Camera koi aur app use kar raha hai. Band karke dobara try karein.');
      } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        setPermission('unavailable');
        setError('Camera sirf HTTPS pe kaam karta hai. Localhost ya HTTPS use karein.');
      } else {
        setPermission('denied');
        setError(msg || 'Camera on karne me masla hua');
      }
    }
  }, []);

  // Run on mount
  useEffect(() => {
    requestPermissionAndInit();
    return () => {
      activeRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        // @ts-ignore
        readerRef.current?.reset?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── START ZXING SCANNER once permission + device ready ── */
  useEffect(() => {
    if (permission !== 'granted' || !deviceId || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    activeRef.current = true;

    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result, err, controls) => {
        if (!activeRef.current) return;

        if (result) {
          const code = result.getText();
          if (!code) return;

          // Success feedback
          setScanSuccess(true);
          setScanCount((c) => c + 1);

          // Haptic vibration (mobile)
          try { navigator.vibrate?.(80); } catch {}

          // Success beep
          try { playBeep(); } catch {}

          activeRef.current = false;
          controls?.stop?.();

          // Delay slight so user sees green flash
          setTimeout(() => {
            onDetected(code);
          }, 150);
        }

        if (err && err.name !== 'NotFoundException') {
          // NotFoundException = normal "no barcode in frame yet" — ignore
          // Log real errors only
          // console.debug('Scan err:', err.name);
        }
      })
      .then(() => {
        // Check for torch/flashlight support after stream is live
        const stream = (videoRef.current?.srcObject as MediaStream | null);
        if (stream) {
          streamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          const caps: any = track?.getCapabilities?.();
          setTorchSupported(!!caps?.torch);
        }
      })
      .catch((e) => {
        console.warn('Scanner init:', e);
        setError(e?.message || 'Scanner start nahi hua');
      });

    return () => {
      activeRef.current = false;
      try {
        // @ts-ignore
        reader.reset?.();
      } catch {}
    };
  }, [permission, deviceId, onDetected]);

  /* ─── TORCH TOGGLE ─────────────────────────────────── */
  const toggleTorch = async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const newState = !torchOn;
      await track.applyConstraints({
        // @ts-ignore — torch is a valid but experimental constraint
        advanced: [{ torch: newState }],
      });
      setTorchOn(newState);
    } catch (e: any) {
      toast.error('Torch on nahi hua — device support nahi karta');
    }
  };

  /* ─── SWITCH CAMERA ────────────────────────────────── */
  const switchCamera = () => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === deviceId);
    const next = devices[(idx + 1) % devices.length];
    activeRef.current = false;
    setTorchOn(false);
    setDeviceId(next.deviceId);
  };

  /* ─── MANUAL ENTRY SUBMIT ──────────────────────────── */
  const submitManual = () => {
    const trimmed = manualCode.trim();
    if (!trimmed) {
      toast.error('Code khali hai');
      return;
    }
    onDetected(trimmed);
  };

  /* ─── KEYBOARD ─────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && showManualEntry && manualCode.trim()) submitManual();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showManualEntry, manualCode]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh]">
        {/* ═══ HEADER ═══ */}
        <div className="px-4 sm:px-6 py-3.5 border-b-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-brand-50 to-white dark:from-brand-500/15 dark:to-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-md shadow-brand-500/40 shrink-0">
              <ScanLine className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                {title}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">
                {permission === 'granted' ? hint : 'Permission ka intezar...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition shrink-0"
          >
            <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* ═══ CAMERA / STATES ═══ */}
        <div className="relative bg-slate-950 flex-1 min-h-[320px] sm:min-h-[400px]">
          {/* ─── REQUESTING PERMISSION ─── */}
          {permission === 'requesting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-brand-500/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-brand-300 animate-spin" />
              </div>
              <div>
                <h4 className="text-white font-extrabold text-lg">
                  📷 Camera permission maangi ja rahi hai
                </h4>
                <p className="text-slate-300 text-sm font-semibold mt-2 max-w-sm">
                  Browser me <strong className="text-white">"Allow"</strong> pe click karein taake barcode / IMEI scan ho sake
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 text-xs font-bold text-amber-200">
                  <Info className="h-3.5 w-3.5" />
                  Permission ek dafa deni hai — dobara nahi maangi jayegi
                </div>
              </div>
            </div>
          )}

          {/* ─── PERMISSION DENIED ─── */}
          {permission === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-rose-300" />
              </div>
              <div className="max-w-md">
                <h4 className="text-white font-extrabold text-lg">Camera Access Denied 🚫</h4>
                <p className="text-slate-300 text-sm font-semibold mt-2">{error}</p>
                <div className="mt-4 rounded-xl bg-slate-800/60 border border-slate-700 p-3 text-left text-xs text-slate-300 space-y-1.5">
                  <div className="font-extrabold text-white text-xs uppercase tracking-wider">📝 Kaise theek karein:</div>
                  <div>1. Browser URL bar me 🔒 icon click karein</div>
                  <div>2. "Camera" ko <strong className="text-emerald-400">Allow</strong> karein</div>
                  <div>3. Page refresh karein aur dobara try karein</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <button
                  onClick={requestPermissionAndInit}
                  className="h-11 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-extrabold inline-flex items-center gap-2 shadow-lg shadow-brand-500/40 transition"
                >
                  <RefreshCw className="h-4 w-4" /> Dobara Try Karein
                </button>
                <button
                  onClick={() => setShowManualEntry(true)}
                  className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-extrabold inline-flex items-center gap-2 transition"
                >
                  <Keyboard className="h-4 w-4" /> Manual Likho
                </button>
              </div>
            </div>
          )}

          {/* ─── UNAVAILABLE ─── */}
          {permission === 'unavailable' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-500/20 flex items-center justify-center">
                <ZapOff className="h-8 w-8 text-slate-300" />
              </div>
              <div>
                <h4 className="text-white font-extrabold text-lg">Camera Available Nahi</h4>
                <p className="text-slate-300 text-sm font-semibold mt-2 max-w-md">{error}</p>
              </div>
              <button
                onClick={() => setShowManualEntry(true)}
                className="h-11 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-extrabold inline-flex items-center gap-2 shadow-lg transition"
              >
                <Keyboard className="h-4 w-4" /> Manual Entry Karein
              </button>
            </div>
          )}

          {/* ─── LIVE CAMERA VIEW ─── */}
          {permission === 'granted' && !error && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full min-h-[320px] sm:min-h-[400px] object-cover"
              />

              {/* Scan overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-4/5 max-w-md aspect-[4/2.5]">
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />

                  {/* Scanning line animation */}
                  <div className="absolute inset-x-4 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_20px_rgba(56,189,248,0.8)] animate-pulse" />
                </div>
              </div>

              {/* Success flash overlay */}
              {scanSuccess && (
                <div className="absolute inset-0 bg-emerald-500/40 pointer-events-none flex items-center justify-center animate-in fade-in zoom-in duration-200">
                  <div className="h-24 w-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/60">
                    <CheckCircle2 className="h-12 w-12 text-white" />
                  </div>
                </div>
              )}

              {/* Bottom hint bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/70 to-transparent p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1.5 text-[11px] font-bold text-white">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Scanning... {scanCount > 0 && `(${scanCount} detected)`}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {torchSupported && (
                      <button
                        onClick={toggleTorch}
                        title="Torch / Flashlight"
                        className={`h-10 w-10 rounded-xl flex items-center justify-center backdrop-blur border transition ${
                          torchOn
                            ? 'bg-amber-400 border-amber-300 text-slate-900 shadow-lg shadow-amber-400/50'
                            : 'bg-white/15 border-white/25 text-white hover:bg-white/25'
                        }`}
                      >
                        <Zap className="h-4 w-4" />
                      </button>
                    )}
                    {devices.length > 1 && (
                      <button
                        onClick={switchCamera}
                        title="Camera switch"
                        className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white flex items-center justify-center backdrop-blur transition"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowManualEntry(true)}
                      title="Manual entry"
                      className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition"
                    >
                      <Keyboard className="h-4 w-4" />
                      <span className="hidden sm:inline">Manual</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ═══ MANUAL ENTRY FALLBACK ═══ */}
        {showManualEntry && (
          <div className="p-4 sm:p-5 bg-gradient-to-br from-brand-50 to-white dark:from-brand-500/10 dark:to-slate-900/60 border-t-2 border-brand-200 dark:border-brand-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Keyboard className="h-4 w-4 text-brand-700 dark:text-brand-400" />
              <div className="font-extrabold text-brand-900 dark:text-brand-200 text-sm">
                Manual Barcode / IMEI Entry
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Yahan likhein ya paste karein..."
                className="h-11 flex-1 rounded-xl border-2 border-brand-300 dark:border-brand-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition"
              />
              <button
                onClick={submitManual}
                disabled={!manualCode.trim()}
                className="h-11 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-md transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                OK
              </button>
            </div>
            <p className="text-[10px] text-brand-700 dark:text-brand-400 font-bold mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Enter dabao ya OK click karein
            </p>
          </div>
        )}

        {/* ═══ FOOTER (device selector + close) ═══ */}
        {permission === 'granted' && devices.length > 1 && !isMobile && (
          <div className="px-4 sm:px-6 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="h-9 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="px-4 sm:px-6 py-3 border-t-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hidden sm:inline-flex items-center gap-1">
            <Kbd>Esc</Kbd> band karein • <Kbd>Enter</Kbd> submit
          </div>
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-mono font-bold text-[9px]">
      {children}
    </kbd>
  );
}

/**
 * Success beep — short 880Hz sine wave, plays without audio file dependency
 */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
    setTimeout(() => ctx.close?.(), 300);
  } catch {
    /* silent fail on unsupported browsers */
  }
}
