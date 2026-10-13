/**
 * Customer display feed. The POS window posts the live bill over a
 * BroadcastChannel and the /customer-display window (a second monitor or a
 * screen turned towards the customer, same computer) listens. No server or
 * internet is involved.
 */

import { useEffect, useRef } from 'react';
import { getReceiptSetup } from '@core/receipt/setup';

export const DISPLAY_CHANNEL = 'nafaa-customer-display';

export interface DisplayLine { name: string; qty: string; total: number }

type DisplayBody =
  | { kind: 'cart'; shopName: string; items: DisplayLine[]; subtotal: number; discount: number; total: number }
  | { kind: 'thanks'; shopName: string; total: number; paid: number; change: number }
  | { kind: 'qr'; shopName: string; amount: number; label: string; merchantName: string; svg: string }
  | { kind: 'idle'; shopName: string }
  | { kind: 'hello' };

/** Every message also carries the shop logo, so the display shows the brand without a login. */
export type DisplayMsg = DisplayBody & { logoUrl?: string | null };

let chan: BroadcastChannel | null = null;
let last: DisplayMsg | null = null;
let lastCart: DisplayMsg | null = null;

const channel = () => {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!chan) {
    chan = new BroadcastChannel(DISPLAY_CHANNEL);
    // A display window just opened: send it the current state.
    chan.onmessage = (e) => { if ((e.data as DisplayMsg)?.kind === 'hello' && last) chan!.postMessage(last); };
  }
  return chan;
};

export function postToDisplay(m: DisplayBody) {
  const msg: DisplayMsg = { ...m, logoUrl: getReceiptSetup().shop.logoUrl ?? null };
  last = msg;
  if (m.kind === 'cart' || m.kind === 'idle') lastCart = msg;
  try { channel()?.postMessage(msg); } catch { /* old browser */ }
}

/** Puts the bill back on screen when payment is closed without a sale (QR was showing). */
export function restoreDisplayCart() {
  if (last?.kind !== 'qr' || !lastCart) return;
  last = lastCart;
  try { channel()?.postMessage(lastCart); } catch { /* old browser */ }
}

export function openCustomerDisplay() {
  const w = window.open('/customer-display', 'nafaa-customer-display', 'width=1024,height=700');
  if (!w) return false;
  channel();
  return true;
}

/** Sample bill for the test button on Settings → Hardware. */
export function sendDisplayTest(shopName: string) {
  postToDisplay({
    kind: 'cart', shopName,
    items: [
      { name: 'Doodh 1 litre', qty: '2 pcs', total: 440 },
      { name: 'Double roti', qty: '1 pcs', total: 180 },
      { name: 'Chai patti 200g', qty: '1 pcs', total: 650 },
    ],
    subtotal: 1270, discount: 70, total: 1200,
  });
}

/** The POS passes its cart here; every change reaches the display after a short pause. */
export function useCustomerDisplayFeed(d: {
  shopName: string;
  items: DisplayLine[];
  subtotal: number; discount: number; total: number;
}) {
  const key = JSON.stringify(d);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => {
      // An emptied cart must not wipe the "thank you" screen straight away.
      if (!d.items.length && last?.kind === 'thanks') return;
      postToDisplay(d.items.length ? { kind: 'cart', ...d } : { kind: 'idle', shopName: d.shopName });
    }, 120);
    return () => clearTimeout(t.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
