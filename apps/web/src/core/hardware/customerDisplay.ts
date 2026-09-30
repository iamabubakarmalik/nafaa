import { useEffect, useRef } from 'react';

/* ═════════════════════════════════════════════════════════════
   CUSTOMER DISPLAY — doosri screen (ya customer ki taraf mora hua
   monitor / tablet) par live bill. Same computer ki doosri window
   BroadcastChannel se sunti hai — internet / server ki zaroorat nahi.
   ═════════════════════════════════════════════════════════════ */

export const DISPLAY_CHANNEL = 'nafaa-customer-display';

export type DisplayMsg =
  | { kind: 'cart'; shopName: string; items: Array<{ name: string; qty: string; total: number }>; subtotal: number; discount: number; total: number }
  | { kind: 'thanks'; shopName: string; total: number; paid: number; change: number }
  | { kind: 'qr'; shopName: string; amount: number; label: string; merchantName: string; svg: string }
  | { kind: 'idle'; shopName: string }
  | { kind: 'hello' };

let chan: BroadcastChannel | null = null;
let last: DisplayMsg | null = null;
const channel = () => {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!chan) {
    chan = new BroadcastChannel(DISPLAY_CHANNEL);
    // Nayi display window khuli — usay abhi wala haal bhej do
    chan.onmessage = (e) => { if ((e.data as DisplayMsg)?.kind === 'hello' && last) chan!.postMessage(last); };
  }
  return chan;
};

export function postToDisplay(m: DisplayMsg) {
  last = m;
  try { channel()?.postMessage(m); } catch { /* purana browser */ }
}

export function openCustomerDisplay() {
  const w = window.open('/customer-display', 'nafaa-customer-display', 'width=1024,height=700');
  if (!w) return false;
  channel();
  return true;
}

/** POS page apna cart yahan deta hai — har tabdeeli display par (thora ruk kar) */
export function useCustomerDisplayFeed(d: {
  shopName: string;
  items: Array<{ name: string; qty: string; total: number }>;
  subtotal: number; discount: number; total: number;
}) {
  const key = JSON.stringify(d);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => {
      // "Shukriya" wali screen ko khali cart foran na mitaye
      if (!d.items.length && last?.kind === 'thanks') return;
      postToDisplay(d.items.length ? { kind: 'cart', ...d } : { kind: 'idle', shopName: d.shopName });
    }, 120);
    return () => clearTimeout(t.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
