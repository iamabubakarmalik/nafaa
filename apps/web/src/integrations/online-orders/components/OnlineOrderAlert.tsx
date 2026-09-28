import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BellRing, CheckCircle2, Eye, Loader2, ShoppingBag, Volume2, VolumeX, X } from 'lucide-react';
import { useNotificationSound } from '@core/hooks/useNotificationSound';
import { apiErrorMessage, onlineOrdersApi, type LiveOrders } from '../api/online-orders.api';
import { useLiveOnlineOrders, LIVE_ORDERS_KEY } from '../hooks/useLiveOnlineOrders';
import { rs, sourceOf, timeAgo } from '../lib/labels';
import { cn } from '@core/lib/cn';

const SEEN_KEY = 'nafaa-online-orders-seen-v1';
const RING_KEY = 'nafaa-online-orders-ring';
const RING_EVERY_MS = 25_000;

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
  } catch { /* storage band ho to bhi chalta rahe */ }
};
const ringEnabled = () => {
  try {
    return localStorage.getItem(RING_KEY) !== '0';
  } catch {
    return true;
  }
};

/**
 * Naya online order — app me kahin bhi hon, pata chal jaye:
 *  • neeche kone me bara card (Accept / Dekho)
 *  • ghanti — jab tak koi dekh na le, har 25 sec baad dobara (band bhi kar sakte hain)
 *  • browser/desktop notification (app minimize ho tab bhi)
 */
export function OnlineOrderAlert() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { playUrgent } = useNotificationSound();
  const { data } = useLiveOnlineOrders();

  const seenRef = useRef<Set<string>>(loadSeen());
  const firstRunRef = useRef(true);
  const [queue, setQueue] = useState<LiveOrder[]>([]);
  const [ring, setRing] = useState(ringEnabled);

  // ─── Naye order pehchano ─────────────────────────────────
  useEffect(() => {
    if (!data) return;
    const fresh = data.latest.filter((o) => !seenRef.current.has(o.id));
    fresh.forEach((o) => seenRef.current.add(o.id));
    if (fresh.length) saveSeen(seenRef.current);

    // Pehli dafa app khuli — purane pending orders ki ghanti nahi,
    // lekin card dikhao taake pata chale kuch intezar me hai
    if (firstRunRef.current) {
      firstRunRef.current = false;
      if (data.pendingCount > 0 && fresh.length) setQueue(fresh.slice(0, 3));
      return;
    }
    if (!fresh.length) return;

    setQueue((q) => [...fresh, ...q.filter((x) => !fresh.some((f) => f.id === x.id))].slice(0, 4));
    playUrgent();

    if ('Notification' in window && Notification.permission === 'granted') {
      fresh.slice(0, 2).forEach((o) => {
        try {
          const n = new Notification(`🛍️ Naya order #${o.externalOrderNumber ?? o.externalOrderId}`, {
            body: `${o.customerName} · ${rs(o.total)} · ${o.itemCount} item`,
            icon: '/favicon.ico',
            tag: `online-order-${o.id}`,
            requireInteraction: true,
          });
          n.onclick = () => {
            window.focus();
            navigate(`/online-orders?order=${o.id}`);
            n.close();
          };
        } catch { /* kuch browsers constructor nahi dete */ }
      });
    }
  }, [data, navigate, playUrgent]);

  // Jo order kahin aur se accept/cancel ho gaya, uska card hata do
  useEffect(() => {
    if (!data) return;
    const pendingIds = new Set(data.latest.map((o) => o.id));
    setQueue((q) => (data.pendingCount === 0 ? [] : q.filter((o) => pendingIds.has(o.id))));
  }, [data]);

  // ─── Ghanti jab tak koi na dekhe ─────────────────────────
  useEffect(() => {
    if (!ring || queue.length === 0) return;
    const t = setInterval(() => playUrgent(), RING_EVERY_MS);
    return () => clearInterval(t);
  }, [ring, queue.length, playUrgent]);

  const accept = useMutation({
    mutationFn: (id: string) => onlineOrdersApi.accept(id),
    onSuccess: (res, id) => {
      setQueue((q) => q.filter((o) => o.id !== id));
      qc.invalidateQueries({ queryKey: LIVE_ORDERS_KEY });
      qc.invalidateQueries({ queryKey: ['online-orders'] });
      toast.success(`Bill ban gaya — ${res.sale.saleNumber}`, {
        description: 'Stock kam ho gaya',
        action: { label: 'Receipt', onClick: () => navigate(`/sales/${res.sale.id}/receipt?auto=1`) },
      });
      if (res.autoPrint) navigate(`/sales/${res.sale.id}/receipt?auto=1`);
    },
    onError: (err: any, id) => {
      // Product match nahi hua ya stock kam hai — safhe par le jao jahan hal ho sake
      toast.error(apiErrorMessage(err, 'Accept nahi hua'));
      navigate(`/online-orders?order=${id}`);
      setQueue((q) => q.filter((o) => o.id !== id));
    },
  });

  const dismiss = (id: string) => setQueue((q) => q.filter((o) => o.id !== id));
  const toggleRing = () => {
    const next = !ring;
    setRing(next);
    try { localStorage.setItem(RING_KEY, next ? '1' : '0'); } catch { /* ignore */ }
  };

  // Online Orders safhe par khud sab dikhta hai — wahan popup ki zaroorat nahi
  if (queue.length === 0 || location.pathname.startsWith('/online-orders')) return null;
  const extra = Math.max((data?.pendingCount ?? 0) - queue.length, 0);

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[min(380px,calc(100vw-2rem))] space-y-2 print:hidden">
      {queue.map((o, idx) => {
        const src = sourceOf({ platform: o.metadata?.platform, integration: o.integration });
        const busy = accept.isPending && accept.variables === o.id;
        return (
          <div
            key={o.id}
            className={cn(
              'rounded-2xl border-2 border-emerald-400 bg-white shadow-2xl dark:bg-neutral-900 dark:border-emerald-500/60 overflow-hidden',
              idx === 0 && 'animate-[pulse_1.2s_ease-in-out_2]',
            )}
          >
            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white">
              <BellRing className="h-4 w-4 animate-bounce" />
              <div className="flex-1 text-sm font-black">Naya online order!</div>
              <span className="text-[11px] font-bold opacity-90">{src.emoji} {src.label}</span>
              <button onClick={() => dismiss(o.id)} className="rounded-md p-1 hover:bg-white/20" aria-label="Band karein">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    #{o.externalOrderNumber ?? o.externalOrderId} · {timeAgo(o.receivedAt)}
                    {o.metadata?.test && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-700">TEST</span>}
                  </div>
                  <div className="truncate text-base font-black text-slate-900 dark:text-white">{o.customerName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {o.itemCount} item{o.customerCity ? ` · ${o.customerCity}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">{rs(o.total)}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => accept.mutate(o.id)}
                  disabled={busy}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Accept + Bill
                </button>
                <button
                  onClick={() => { dismiss(o.id); navigate(`/online-orders?order=${o.id}`); }}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-100 dark:hover:bg-neutral-800"
                >
                  <Eye className="h-4 w-4" /> Dekho
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between rounded-xl bg-slate-900/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
        <button onClick={() => { setQueue([]); navigate('/online-orders'); }} className="flex items-center gap-1 hover:underline">
          <ShoppingBag className="h-3.5 w-3.5" />
          {extra > 0 ? `+${extra} aur naye orders` : 'Sab online orders'}
        </button>
        <button onClick={toggleRing} className="flex items-center gap-1 opacity-90 hover:opacity-100" title="Baar baar ghanti">
          {ring ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          {ring ? 'Ghanti on' : 'Ghanti off'}
        </button>
      </div>
    </div>
  );
}
