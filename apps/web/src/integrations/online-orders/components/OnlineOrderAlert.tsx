import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BellRing, CheckCircle2, Eye, Settings2, ShoppingBag, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { inQuietHours, isMutedHere, playTone, useAlertPrefs } from '@modules/notifications/alertPrefs';
import type { OnlineOrderRing } from '@modules/notifications/api/notifications.api';
import { apiErrorMessage, onlineOrdersApi, type LiveOrders } from '../api/online-orders.api';
import { useLiveOnlineOrders, LIVE_ORDERS_KEY } from '../hooks/useLiveOnlineOrders';
import { rs, sourceOf, timeAgo } from '../lib/labels';
import { cn } from '@core/lib/cn';
import { t as tr } from '@core/i18n';

const SEEN_KEY = 'nafaa-online-orders-seen-v1';
/** "Repeat" rings every 2 minutes, at most 5 times in all, until the card is closed. */
const REPEAT_EVERY_MS = 120_000;
const REPEAT_MAX = 5;
const NEXT_RING: Record<OnlineOrderRing, OnlineOrderRing> = { once: 'repeat', repeat: 'off', off: 'once' };

type LiveOrder = LiveOrders['latest'][number];

const loadSeen = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
};
const saveSeen = (s: Set<string>) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-300)));
  } catch { /* storage unavailable: keep working */ }
};

/**
 * New online order alert, shown anywhere in the app. It follows the person's
 * own choices (Settings > Notifications): in-app on/off, the corner card,
 * the ring (once / repeat until seen / off), the chosen tone, quiet hours and
 * this browser's mute. Orders already waiting when the app opens never ring
 * and never pop up as cards; a single small bar says how many are waiting.
 */
export function OnlineOrderAlert() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { data } = useLiveOnlineOrders();
  const { prefs, save } = useAlertPrefs();

  const seenRef = useRef<Set<string>>(loadSeen());
  const firstRunRef = useRef(true);
  const [queue, setQueue] = useState<LiveOrder[]>([]);
  const [waiting, setWaiting] = useState(0);
  const ringsRef = useRef(0);

  const event = prefs?.events.find((e) => e.event === 'onlineOrder');
  const enabled = !prefs || (!!event && event.inApp);
  const popup = prefs?.onlineOrderPopup ?? true;
  const ring: OnlineOrderRing = prefs?.onlineOrderRing ?? 'once';
  const prefsRef = useRef({ enabled, popup, ring, prefs });
  prefsRef.current = { enabled, popup, ring, prefs };

  const sound = () => {
    const p = prefsRef.current;
    if (!p.enabled || p.ring === 'off' || isMutedHere()) return;
    if (p.prefs && inQuietHours(p.prefs)) return;
    playTone(p.prefs?.sound ?? 'chime');
  };

  // ─── Spot new orders ─────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    const fresh = data.latest.filter((o) => !seenRef.current.has(o.id));
    fresh.forEach((o) => seenRef.current.add(o.id));
    if (fresh.length) saveSeen(seenRef.current);

    // App just opened: orders already waiting get no ring and no cards, only the small bar.
    if (firstRunRef.current) {
      firstRunRef.current = false;
      setWaiting(data.pendingCount);
      return;
    }
    if (!fresh.length) return;
    const p = prefsRef.current;
    if (!p.enabled) return;

    if (p.popup) setQueue((q) => [...fresh, ...q.filter((x) => !fresh.some((f) => f.id === x.id))].slice(0, 3));
    ringsRef.current = 1;
    sound();

    if (!document.hasFocus() && 'Notification' in window && Notification.permission === 'granted') {
      fresh.slice(0, 2).forEach((o) => {
        try {
          const n = new Notification(tr('🛍️ Naya order #{{value}}', { value: o.externalOrderNumber ?? o.externalOrderId }), {
            body: tr('{{customerName}} · {{total}} · {{count}} item', { customerName: o.customerName, total: rs(o.total), count: o.itemCount }),
            icon: '/favicon.ico',
            tag: `online-order-${o.id}`,
            silent: true,
          });
          n.onclick = () => {
            window.focus();
            navigate(`/online-orders?order=${o.id}`);
            n.close();
          };
        } catch { /* some browsers have no Notification constructor */ }
      });
    }
  }, [data, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cards for orders accepted or cancelled elsewhere go away.
  useEffect(() => {
    if (!data) return;
    const pendingIds = new Set(data.latest.map((o) => o.id));
    setQueue((q) => (data.pendingCount === 0 ? [] : q.filter((o) => pendingIds.has(o.id))));
    setWaiting((w) => Math.min(w, data.pendingCount));
  }, [data]);

  // ─── "Repeat until seen": every 2 minutes, at most 5 rings ───
  useEffect(() => {
    if (ring !== 'repeat' || queue.length === 0 || !enabled) return;
    const t = setInterval(() => {
      if (ringsRef.current >= REPEAT_MAX) { clearInterval(t); return; }
      ringsRef.current += 1;
      sound();
    }, REPEAT_EVERY_MS);
    return () => clearInterval(t);
  }, [ring, queue.length, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Turning the alert or the card off clears what is on screen.
  useEffect(() => { if (!enabled || !popup) { setQueue([]); setWaiting(0); } }, [enabled, popup]);

  const accept = useMutation({
    mutationFn: (id: string) => onlineOrdersApi.accept(id),
    onSuccess: (res, id) => {
      setQueue((q) => q.filter((o) => o.id !== id));
      qc.invalidateQueries({ queryKey: LIVE_ORDERS_KEY });
      qc.invalidateQueries({ queryKey: ['online-orders'] });
      toast.success(tr('Bill ban gaya — {{saleNumber}}', { saleNumber: res.sale.saleNumber }), {
        description: tr('Stock kam ho gaya'),
        action: { label: tr('Receipt'), onClick: () => navigate(`/sales/${res.sale.id}/receipt?auto=1`) },
      });
      if (res.autoPrint) navigate(`/sales/${res.sale.id}/receipt?auto=1`);
    },
    onError: (err: any, id) => {
      // Product match nahi hua ya stock kam hai — safhe par le jao jahan hal ho sake
      toast.error(apiErrorMessage(err, tr('Accept nahi hua')));
      navigate(`/online-orders?order=${id}`);
      setQueue((q) => q.filter((o) => o.id !== id));
    },
  });

  const dismiss = (id: string) => setQueue((q) => q.filter((o) => o.id !== id));
  const nextRing = () => save({ onlineOrderRing: NEXT_RING[ring] });
  const ringLabel = ring === 'repeat' ? tr('Ghanti: jab tak na dekhein') : ring === 'off' ? tr('Ghanti band') : tr('Ghanti: ek dafa');

  // The Online orders page shows everything itself; no pop-up there.
  if (!enabled || !popup || location.pathname.startsWith('/online-orders')) return null;

  // Only orders that were already waiting: one small bar, no cards, no ring.
  if (queue.length === 0) {
    if (waiting <= 0) return null;
    return (
      <div className="fixed bottom-4 end-4 z-[70] flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-[0.75rem] font-semibold text-white shadow-lg print:hidden">
        <button type="button" onClick={() => { setWaiting(0); navigate('/online-orders'); }} className="flex items-center gap-1.5 hover:underline">
          <ShoppingBag className="h-3.5 w-3.5" />
          {tr('{{count}} online order intezar me', { count: waiting })}
        </button>
        <button type="button" onClick={() => setWaiting(0)} className="rounded-md p-0.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label={tr('Band karein')}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }
  const extra = Math.max((data?.pendingCount ?? 0) - queue.length, 0);

  return (
    <div className="fixed bottom-4 end-4 z-[70] w-[min(380px,calc(100vw-2rem))] space-y-2 print:hidden">
      {queue.map((o, idx) => {
        const src = sourceOf({ platform: o.metadata?.platform, integration: o.integration });
        const busy = accept.isPending && accept.variables === o.id;
        return (
          <div
            key={o.id}
            className={cn(
              'overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200',
              idx === 0 && 'ring-2 ring-brand-200',
            )}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><BellRing className="h-4 w-4" /></span>
              <div className="flex-1 text-sm font-semibold text-slate-900">{tr('Naya online order')}</div>
              <span className="inline-flex min-w-0 items-center gap-1.5 text-[0.75rem] font-medium text-slate-500">
                <BrandLogo name={src.brand} size={20} /><span className="max-w-[7rem] truncate">{o.integration?.displayName ?? src.label}</span>
              </span>
              <button type="button" onClick={() => dismiss(o.id)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={tr('Band karein')}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-500">
                    <span className="font-mono">#{o.externalOrderNumber ?? o.externalOrderId}</span> · {timeAgo(o.receivedAt)}
                    {o.metadata?.test && <span className="ms-1 rounded bg-amber-100 px-1 font-semibold text-amber-800">{tr('TEST')}</span>}
                  </div>
                  <div className="truncate text-base font-semibold text-slate-900">{o.customerName}</div>
                  <div className="text-xs text-slate-500">
                    {tr('{{itemCount}} item{{value}}', { itemCount: o.itemCount, value: o.customerCity ? ` · ${o.customerCity}` : '' })}
                  </div>
                </div>
                <div className="text-end text-lg font-bold tabular-nums text-slate-900">{rs(o.total)}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="success" loading={busy} onClick={() => accept.mutate(o.id)} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                  {tr('Accept + bill')}
                </Button>
                <Button variant="secondary" onClick={() => { dismiss(o.id); navigate(`/online-orders?order=${o.id}`); }} leftIcon={<Eye className="h-4 w-4" />}>
                  {tr('Dekhein')}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-1.5 text-[0.6875rem] font-semibold text-white shadow-lg">
        <button onClick={() => { setQueue([]); navigate('/online-orders'); }} className="flex items-center gap-1 hover:underline">
          <ShoppingBag className="h-3.5 w-3.5" />
          {extra > 0 ? tr('+{{extra}} aur naye orders', { extra }) : tr('Sab online orders')}
        </button>
        <span className="flex items-center gap-2">
          <button type="button" onClick={nextRing} className="flex items-center gap-1 opacity-90 hover:opacity-100" title={tr('Badalne ke liye dabayein')}>
            {ring === 'off' ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {ringLabel}
          </button>
          <button type="button" onClick={() => navigate('/notifications?prefs=1')} className="rounded-md p-0.5 opacity-80 hover:bg-white/10 hover:opacity-100" title={tr('Notification settings')} aria-label={tr('Notification settings')}>
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    </div>
  );
}
