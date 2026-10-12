/**
 * The customer's list: what they liked while browsing, with quantities and
 * a total. Sent on WhatsApp to the shop (order or enquiry) or to anyone.
 * Kept on this device so it survives a refresh.
 */

import { Minus, MessageCircle, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { waLink } from '@core/lib/whatsapp/templates';
import type { useCatalogCart } from '../hooks/useCatalogCart';

type Cart = ReturnType<typeof useCatalogCart>;

function listText(cart: Cart, title: string, shop: string) {
  const lines = cart.items.map((i, n) => `${n + 1}. ${i.name}${i.variantName ? ` (${i.variantName})` : ''} — ${i.quantity} × ${formatPKR(i.price)}${i.unit ? ` / ${i.unit}` : ''} = ${formatPKR(i.price * i.quantity)}`);
  return [
    `*${title}* — ${shop}`, '',
    ...lines, '',
    `*Kul: ${formatPKR(cart.subtotal)}*`,
    ...(cart.customerName ? ['', `Naam: ${cart.customerName}`] : []),
    ...(cart.customerPhone ? [`Phone: ${cart.customerPhone}`] : []),
    ...(cart.notes ? [`Note: ${cart.notes}`] : []),
  ].join('\n');
}

export function PickList({ cart, title, shop, shopPhone, onClose }: { cart: Cart; title: string; shop: string; shopPhone?: string | null; onClose: () => void }) {
  const text = listText(cart, title, shop);
  const toShop = waLink(shopPhone, text);
  return (
    <Modal open onClose={onClose} size="md" title={title} description={cart.items.length ? `${cart.items.length} cheezein · ${formatPKR(cart.subtotal)}` : 'Abhi khali hai'}
      footer={cart.items.length ? <>
        <Button variant="ghost" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => { cart.clear(); toast.success('List saaf'); }}>Saaf karein</Button>
        <Button variant="secondary" leftIcon={<Send className="h-4 w-4" />} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')}>Kisi ko bhejein</Button>
        {toShop && <Button leftIcon={<MessageCircle className="h-4 w-4" />} onClick={() => window.open(toShop, '_blank', 'noopener')}>Dukaan ko bhejein</Button>}
      </> : undefined}>
      {cart.items.length === 0 ? (
        <p className="py-8 text-center text-[0.875rem] text-slate-500">Kisi bhi cheez par <b>+</b> dabayein — wo yahan aa jayegi.</p>
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
            {cart.items.map((i) => (
              <li key={i.cartId} className="flex items-center gap-3 px-3 py-2.5">
                {i.image ? <img src={i.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <span className="h-11 w-11 shrink-0 rounded-lg bg-slate-100" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.875rem] font-semibold text-slate-900">{i.name}</p>
                  <p className="truncate text-[0.75rem] text-slate-500">{i.variantName ? `${i.variantName} · ` : ''}{formatPKR(i.price)}{i.unit ? ` / ${i.unit}` : ''}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => cart.setQuantity(i.cartId, i.quantity - 1)} aria-label="Kam" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-8 text-center text-[0.875rem] font-bold tabular-nums">{i.quantity}</span>
                  <button type="button" onClick={() => cart.setQuantity(i.cartId, i.quantity + 1)} aria-label="Zyada" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                <span className="w-20 text-right text-[0.875rem] font-bold tabular-nums text-slate-900">{formatPKR(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
            <span className="text-[0.875rem] font-semibold text-brand-900">Kul</span>
            <span className="text-xl font-bold tabular-nums text-brand-900">{formatPKR(cart.subtotal)}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Aap ka naam (zaroori nahi)" value={cart.customerName} onChange={(e) => cart.setCustomer({ customerName: e.target.value })} />
            <Input placeholder="Phone (zaroori nahi)" inputMode="tel" value={cart.customerPhone} onChange={(e) => cart.setCustomer({ customerPhone: e.target.value })} />
            <Input wrapperClassName="sm:col-span-2" placeholder="Koi baat likhni ho (size, rang, waqt…)" value={cart.notes} onChange={(e) => cart.setCustomer({ notes: e.target.value })} />
          </div>
        </div>
      )}
    </Modal>
  );
}
