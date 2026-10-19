/**
 * /customer-display: the screen the customer sees. It listens to the POS
 * window on this computer (see customerDisplay.ts) and shows the live bill,
 * the payment QR, the change to hand back, and the shop's own messages
 * while waiting. Colours are fixed per display theme (not the app's dark
 * mode) so the screen reads well in a bright shop or a dark room.
 * Double-click for full screen; the mouse pointer hides when not moving.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, QrCode, ShoppingBag, Sparkles } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { getReceiptSetup } from '@core/receipt/setup';
import { DISPLAY_CHANNEL, type DisplayLine, type DisplayMsg } from './customerDisplay';
import { DISPLAY_SETTINGS_KEY, useDisplaySettings, type DisplayTheme } from './displaySettings';

interface Skin {
  page: string;
  muted: string;
  faint: string;
  line: string;
  card: string;
  newest: string;
  aside: string;
  accentText: string;
  /** Soft colour wash behind the screen. */
  glow: string;
  chip: string;
}

const SKINS: Record<DisplayTheme, Skin> = {
  dark: {
    page: 'bg-ink-950 text-ink-white', muted: 'text-ink-white/65', faint: 'text-ink-white/40', line: 'border-ink-white/10',
    card: 'bg-ink-900 ring-1 ring-ink-white/10', newest: 'bg-brand-600/20 ring-1 ring-brand-500/40', aside: 'bg-brand-700 text-ink-white',
    accentText: 'text-brand-400', glow: 'bg-brand-600/25', chip: 'bg-ink-white/10 text-ink-white/80',
  },
  black: {
    page: 'bg-black text-ink-200', muted: 'text-ink-400', faint: 'text-ink-600', line: 'border-ink-800',
    card: 'bg-ink-950 ring-1 ring-ink-800', newest: 'bg-ink-900 ring-1 ring-brand-500/30', aside: 'bg-ink-950 text-ink-100 ring-1 ring-ink-800',
    accentText: 'text-brand-400', glow: 'bg-brand-600/10', chip: 'bg-ink-900 text-ink-400',
  },
  light: {
    page: 'bg-ink-50 text-ink-900', muted: 'text-ink-500', faint: 'text-ink-400', line: 'border-ink-200',
    card: 'bg-ink-white ring-1 ring-ink-200', newest: 'bg-brand-600/10 ring-1 ring-brand-500/40', aside: 'bg-brand-600 text-ink-white',
    accentText: 'text-brand-600', glow: 'bg-brand-500/15', chip: 'bg-ink-white text-ink-600 ring-1 ring-ink-200',
  },
};

const PROMO_EVERY_MS = 6000;
const THANKS_MS = 10_000;
const POINTER_HIDE_MS = 3000;

export default function CustomerDisplayPage() {
  const s = useDisplaySettings();
  const skin = SKINS[s.theme] ?? SKINS.dark;
  const saved = useMemo(() => getReceiptSetup().shop, []);
  const [m, setM] = useState<DisplayMsg | null>(null);
  const [brand, setBrand] = useState<{ name: string; logoUrl?: string | null }>({ name: saved.name === 'Dukaan' ? '' : saved.name, logoUrl: saved.logoUrl });
  const pointer = usePointerHide();
  const now = useClock(s.showClock);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    document.title = 'Customer display — Nafaa';
    const t = window.setTimeout(() => setHint(false), 8000);
    if (typeof BroadcastChannel === 'undefined') return () => window.clearTimeout(t);
    const c = new BroadcastChannel(DISPLAY_CHANNEL);
    c.onmessage = (e) => {
      const msg = e.data as DisplayMsg;
      if (msg.kind === 'hello') return;
      if (msg.kind === 'qr' && !useDisplaySettings.getState().showQr) return;
      setM(msg);
      setBrand((b) => ({ name: msg.shopName || b.name, logoUrl: msg.logoUrl !== undefined ? msg.logoUrl : b.logoUrl }));
    };
    c.postMessage({ kind: 'hello' } satisfies DisplayMsg);
    return () => { window.clearTimeout(t); c.close(); };
  }, []);

  // Settings changed in the cashier window: apply them here at once.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === DISPLAY_SETTINGS_KEY) void useDisplaySettings.persist.rehydrate(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useWakeLock();

  // "Thank you" stays for a while, then the waiting screen returns.
  useEffect(() => {
    if (m?.kind !== 'thanks') return;
    const t = window.setTimeout(() => setM({ kind: 'idle', shopName: m.shopName }), THANKS_MS);
    return () => window.clearTimeout(t);
  }, [m]);

  const fullScreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className={cn('relative flex h-screen select-none flex-col overflow-hidden antialiased', skin.page, !pointer && 'cursor-none')} onDoubleClick={fullScreen}>
      <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <span className={cn('absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full blur-3xl', skin.glow)} />
        <span className={cn('absolute -bottom-48 right-1/4 h-[28rem] w-[28rem] rounded-full blur-3xl', skin.glow)} />
      </span>
      <header className={cn('relative flex shrink-0 items-center justify-between gap-6 border-b px-6 py-4 sm:px-10', skin.line)}>
        <div className="flex min-w-0 items-center gap-4">
          {s.showLogo && brand.logoUrl && (
            <img src={brand.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-ink-white object-contain p-1 sm:h-14 sm:w-14" />
          )}
          <div className="truncate text-[clamp(1.375rem,2.6vw,2.25rem)] font-extrabold tracking-tight">{brand.name || 'Nafaa POS'}</div>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          {hint && <span className={cn('hidden rounded-full px-3 py-1 text-sm font-semibold md:inline', skin.chip)}>Double-click = full screen</span>}
          {now && <span className={cn('text-[clamp(1.25rem,2.2vw,2rem)] font-bold tabular-nums', skin.muted)}>{now}</span>}
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col">
        {m?.kind === 'cart' ? <CartView m={m} skin={skin} />
          : m?.kind === 'qr' ? <QrView m={m} skin={skin} />
          : m?.kind === 'thanks' ? <ThanksView m={m} skin={skin} />
          : <IdleView skin={skin} welcome={s.welcome} promos={s.promos} name={brand.name} logoUrl={s.showLogo ? brand.logoUrl : null} />}
      </main>

      <footer className={cn('relative flex shrink-0 items-center gap-6 border-t px-6 py-3 sm:px-10', skin.line)}>
        <div className="min-w-0 flex-1">{m?.kind === 'cart' && s.promos.length > 0 && <PromoLine promos={s.promos} skin={skin} />}</div>
        <span className={cn('shrink-0 text-sm font-semibold', skin.faint)}>Nafaa POS</span>
      </footer>
    </div>
  );
}

/* ── Screens ── */

function CartView({ m, skin }: { m: Extract<DisplayMsg, { kind: 'cart' }>; skin: Skin }) {
  const lines: DisplayLine[] = [...m.items].reverse();
  const pieces = m.items.length;
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,34%)]">
      <section className="flex min-h-0 flex-col px-6 py-4 sm:px-10">
        <div className={cn('flex shrink-0 items-center justify-between pb-2 text-sm font-bold uppercase tracking-widest', skin.faint)}>
          <span>Cheez</span><span>Amount</span>
        </div>
        {lines.length === 0 ? (
          <div className={cn('flex flex-1 flex-col items-center justify-center gap-3 text-center', skin.muted)}>
            <ShoppingBag className={cn('h-16 w-16', skin.accentText)} />
            <p className="text-[clamp(1.25rem,2.3vw,2rem)] font-bold">Bill shuru ho raha hai…</p>
          </div>
        ) : (
          <ul className="min-h-0 flex-1 space-y-2 overflow-hidden">
            {lines.map((it, i) => (
              <li key={`${pieces - i}-${it.name}`}
                className={cn('flex items-center justify-between gap-5 rounded-2xl px-4 py-3', i === 0 ? cn(skin.newest, 'animate-fade-in') : '')}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold tabular-nums', i === 0 ? 'bg-brand-600 text-ink-white' : skin.chip)}>{pieces - i}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[clamp(1.25rem,2.3vw,2.125rem)] font-bold leading-tight">{it.name}</span>
                  <span className={cn('block text-[clamp(0.95rem,1.4vw,1.25rem)] font-semibold', skin.muted)}>× {it.qty}</span>
                </span>
                <span className="shrink-0 text-[clamp(1.25rem,2.3vw,2.125rem)] font-extrabold tabular-nums">{formatPKR(it.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className={cn('relative flex flex-col justify-end gap-3 overflow-hidden p-6 sm:p-10', skin.aside)}>
        <span className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ink-white/10 blur-3xl" aria-hidden />
        <Row label="Cheezein" value={String(pieces)} />
        {m.discount > 0 && <>
          <Row label="Kul" value={formatPKR(m.subtotal)} />
          <div className="flex items-center justify-between rounded-2xl bg-ink-white/15 px-4 py-2.5 text-[clamp(1.125rem,1.8vw,1.625rem)] font-extrabold">
            <span>Aap ki bachat</span><span className="tabular-nums">{formatPKR(m.discount)}</span>
          </div>
        </>}
        <div className="mt-3 border-t border-ink-white/20 pt-5 text-[clamp(1rem,1.4vw,1.25rem)] font-bold uppercase tracking-[0.2em] opacity-80">Dene hain</div>
        <div className="text-[clamp(3rem,6.5vw,6.5rem)] font-black leading-none tabular-nums">{formatPKR(m.total)}</div>
      </aside>
    </div>
  );
}

function QrView({ m, skin }: { m: Extract<DisplayMsg, { kind: 'qr' }>; skin: Skin }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 lg:flex-row lg:gap-16">
      <div className="rounded-[2rem] bg-ink-white p-5 shadow-2xl [&_svg]:h-full [&_svg]:w-full" style={{ width: 'clamp(15rem, 42vh, 30rem)', height: 'clamp(15rem, 42vh, 30rem)' }}
        dangerouslySetInnerHTML={{ __html: m.svg }} />
      <div className="max-w-xl text-center lg:text-left">
        <div className={cn('inline-flex items-center gap-2 text-[clamp(1.125rem,1.8vw,1.625rem)] font-bold', skin.accentText)}>
          <QrCode className="h-7 w-7" /> {m.label} se pay karein
        </div>
        <div className="mt-2 text-[clamp(3rem,7vw,6.5rem)] font-black leading-none tabular-nums">{formatPKR(m.amount)}</div>
        {m.merchantName && <div className={cn('mt-3 text-[clamp(1.125rem,1.8vw,1.625rem)] font-semibold', skin.muted)}>{m.merchantName}</div>}
        <ol className={cn('mt-6 space-y-2 text-[clamp(1rem,1.5vw,1.375rem)] font-semibold', skin.muted)}>
          <li>1. Bank, JazzCash ya Easypaisa app kholein</li>
          <li>2. QR scan karein — amount khud aa jayegi</li>
          <li>3. Pay karke screen cashier ko dikhayein</li>
        </ol>
      </div>
    </div>
  );
}

function ThanksView({ m, skin }: { m: Extract<DisplayMsg, { kind: 'thanks' }>; skin: Skin }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/25 [animation-iteration-count:2]" aria-hidden />
        <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-brand-600 text-ink-white shadow-2xl"><CheckCircle2 className="h-16 w-16" /></span>
      </span>
      <div className="text-[clamp(3rem,7vw,6rem)] font-black leading-none">Shukriya!</div>
      <div className={cn('text-[clamp(1.25rem,2.4vw,2.25rem)] font-bold tabular-nums', skin.muted)}>
        Bill {formatPKR(m.total)} · Diye {formatPKR(m.paid)}
      </div>
      {m.change > 0 && (
        <div className="rounded-[2rem] bg-gradient-to-br from-brand-500 to-brand-700 px-12 py-6 text-ink-white shadow-2xl">
          <div className="text-[clamp(1rem,1.5vw,1.375rem)] font-bold uppercase tracking-[0.2em] opacity-80">Aap ke paise wapas</div>
          <div className="text-[clamp(3rem,7vw,6.5rem)] font-black leading-none tabular-nums">{formatPKR(m.change)}</div>
        </div>
      )}
      <div className={cn('text-[clamp(1.125rem,1.8vw,1.625rem)] font-semibold', skin.faint)}>Phir tashreef laiye</div>
    </div>
  );
}

function IdleView({ skin, welcome, promos, name, logoUrl }: { skin: Skin; welcome: string; promos: string[]; name: string; logoUrl?: string | null }) {
  const at = useRotation(promos.length);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
      {logoUrl
        ? <img src={logoUrl} alt="" className="h-32 w-32 rounded-[2rem] bg-ink-white object-contain p-3 shadow-xl" />
        : <span className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-brand-500 to-brand-700 text-ink-white shadow-2xl"><ShoppingBag className="h-14 w-14" /></span>}
      <div>
        <div className="text-[clamp(2.5rem,6vw,5.5rem)] font-black leading-tight">{welcome || 'Khush-amdeed'}</div>
        {name && <div className={cn('mt-2 text-[clamp(1.25rem,2.4vw,2.25rem)] font-semibold', skin.muted)}>{name}</div>}
      </div>
      {promos.length > 0 && (
        <div className={cn('w-full max-w-4xl rounded-[2rem] px-8 py-6', skin.card)}>
          <p key={at} className="flex animate-fade-in items-center justify-center gap-3 text-[clamp(1.375rem,2.8vw,2.5rem)] font-bold">
            <Sparkles className={cn('h-8 w-8 shrink-0', skin.accentText)} /> {promos[at]}
          </p>
          {promos.length > 1 && <Dots count={promos.length} at={at} skin={skin} />}
        </div>
      )}
    </div>
  );
}

/* ── Pieces ── */

function PromoLine({ promos, skin }: { promos: string[]; skin: Skin }) {
  const at = useRotation(promos.length);
  return (
    <p key={at} className={cn('flex animate-fade-in items-center gap-2 truncate text-[clamp(1rem,1.6vw,1.5rem)] font-semibold', skin.muted)}>
      <Sparkles className={cn('h-5 w-5 shrink-0', skin.accentText)} /> {promos[at]}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[clamp(1.125rem,1.8vw,1.625rem)] font-bold">
      <span className="opacity-80">{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );
}

/** Index of the message on screen; moves on every few seconds. */
function useRotation(count: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (count < 2) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % count), PROMO_EVERY_MS);
    return () => window.clearInterval(t);
  }, [count]);
  return count ? i % count : 0;
}

function Dots({ count, at, skin }: { count: number; at: number; skin: Skin }) {
  return (
    <div className="mt-4 flex justify-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cn('h-1.5 rounded-full transition-all', i === at ? 'w-6 bg-brand-500' : cn('w-1.5 bg-current', skin.faint))} />
      ))}
    </div>
  );
}

/** Current time, refreshed every 20 seconds; null when the clock is off. */
function useClock(on: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(t);
  }, [on]);
  return on ? now.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) : null;
}

/** True while the mouse moved recently; the pointer hides otherwise. */
function usePointerHide() {
  const [moving, setMoving] = useState(true);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const wake = () => {
      setMoving(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMoving(false), POINTER_HIDE_MS);
    };
    wake();
    window.addEventListener('mousemove', wake);
    return () => { window.removeEventListener('mousemove', wake); window.clearTimeout(timer.current); };
  }, []);
  return moving;
}

/** Keeps the screen from sleeping where the browser allows it. */
function useWakeLock() {
  useEffect(() => {
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Lock> } };
    if (!nav.wakeLock) return;
    let lock: Lock | null = null;
    const take = () => { if (document.visibilityState === 'visible') nav.wakeLock!.request('screen').then((l) => { lock = l; }).catch(() => undefined); };
    take();
    document.addEventListener('visibilitychange', take);
    return () => { document.removeEventListener('visibilitychange', take); void lock?.release().catch(() => undefined); };
  }, []);
}
