/**
 * Chosen lines split by supplier (and branch): each group becomes its own
 * purchase order, since one order goes to one supplier for one branch.
 */

import { MessageCircle, ShoppingCart, Store } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { waLink } from '@core/lib/whatsapp/templates';
import { openWhatsApp, orderMessage, qty, type OrderGroup } from './meta';

export function OrderModal({ groups, shop, showShop, cost, onOrder, onClose }: {
  groups: OrderGroup[];
  shop: string;
  showShop: boolean;
  cost: (n: number) => string;
  onOrder: (g: OrderGroup) => void;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} size="lg" title="Purchase order banayein" description={`${groups.length} supplier — har ek ka alag order banega`}>
      <ul className="space-y-3">
        {groups.map((g) => {
          const text = orderMessage(g, shop);
          const total = g.rows.reduce((s, r) => s + r.orderValue, 0);
          return (
            <li key={g.key} className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{g.supplier?.name ?? 'Supplier chunna hai'}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-[0.75rem] text-slate-500">
                    <span>{g.rows.length} cheezein · {cost(total)}</span>
                    {showShop && <span className="inline-flex items-center gap-1"><Store className="h-3 w-3" />{g.shopName}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" leftIcon={<MessageCircle className="h-3.5 w-3.5" />} onClick={() => openWhatsApp(waLink(g.supplier?.phone, text), text)}>WhatsApp</Button>
                  <Button size="sm" leftIcon={<ShoppingCart className="h-3.5 w-3.5" />} onClick={() => onOrder(g)}>Order banayein</Button>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-[0.75rem] text-slate-600">{g.rows.map((r) => `${r.name} ${qty(r.suggestQty)} ${r.unit}`).join(' · ')}</p>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[0.75rem] text-slate-500">Order banne ke baad wapas aa kar agle supplier ka banayein. Quantity badalni ho to "Reorder list" tab se.</p>
    </Modal>
  );
}
