/**
 * The orders board list: column header on wide screens, one BoardRow per
 * order, and the row-level work (status moves, tools, delete / restore)
 * wired to the API.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, onlineOrdersApi, type CourierAccount, type OnlineOrder, type SalesChannel } from '../../api/online-orders.api';
import { orderBoardApi, type CustomStage } from '../../api/order-board.api';
import { orderNo } from '../../lib/orders';
import { BoardRow, ROW_GRID, TEXTED_TAG } from './BoardRow';
import { OrderToolModal, useTeam, type ToolKind } from './OrderTools';
import { useBoardRefresh, useMoveOrder } from './useMoveOrder';
import type { QuickAction } from './useOrderActions';
import { t } from '@core/i18n';

export function OrdersTable({ orders, money, custom, channels, couriers, shopName, selectedId, picked, quickBusyId, onToggle, onToggleAll, onOpen, onQuick }: {
  orders: OnlineOrder[];
  money: (n: number) => string;
  custom: CustomStage[];
  channels: SalesChannel[];
  couriers: CourierAccount[];
  shopName?: string;
  selectedId: string | null;
  picked: Set<string>;
  quickBusyId: string | null;
  onToggle: (id: string) => void;
  onToggleAll: (on: boolean) => void;
  onOpen: (id: string) => void;
  onQuick: (o: OnlineOrder, a: QuickAction) => void;
}) {
  const refresh = useBoardRefresh();
  const move = useMoveOrder(custom);
  const { data: team = [] } = useTeam();
  const [tool, setTool] = useState<{ kind: ToolKind; order: OnlineOrder } | null>(null);
  const names = useMemo(() => new Map(team.map((m) => [m.id, m.fullName])), [team]);
  const sites = useMemo(() => new Map(channels.map((c) => [c.id, c.siteUrl])), [channels]);
  const allPicked = orders.length > 0 && orders.every((o) => picked.has(o.id));

  const act = async (o: OnlineOrder, fn: () => Promise<unknown>, done: string) => {
    try { await fn(); toast.success(`#${orderNo(o)} · ${done}`); } catch (e) { toast.error(apiErrorMessage(e)); } finally { refresh(o.id); }
  };
  const remove = async (o: OnlineOrder) => {
    const yes = await confirmDialog({
      title: t('#{{no}} delete karein?', { no: orderNo(o) }),
      text: o.nafaaSaleId ? t('Bill void ho jayega aur stock wapas aa jayega. "Deleted" me se wapas la sakte hain.') : t('"Deleted" me chala jayega, wahan se wapas la sakte hain.'),
      yes: t('Delete'), danger: true,
    });
    if (yes) await act(o, () => orderBoardApi.remove(o.id), t('delete ho gaya'));
  };
  const permanent = async (o: OnlineOrder) => {
    const yes = await confirmDialog({ title: t('#{{no}} hamesha ke liye mitayein?', { no: orderNo(o) }), text: t('Ye wapas nahi aa sakega.'), yes: t('Hamesha ke liye mitayein'), danger: true });
    if (yes) await act(o, () => orderBoardApi.removePermanent(o.id), t('mita diya'));
  };
  const texted = (o: OnlineOrder) => {
    // Marks that the confirmation message went out; quiet on failure.
    onlineOrdersApi.setTags(o.id, [...(o.metadata?.tags ?? []), TEXTED_TAG]).then(() => refresh(o.id)).catch(() => undefined);
  };

  const head = 'text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500';
  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className={cn('hidden border-b border-slate-100 px-3 py-2 sm:px-4', ROW_GRID)}>
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={allPicked} onChange={(e) => onToggleAll(e.target.checked)} aria-label={t('Sab chunein')} />
        <span className={head}>{t('Order')}</span>
        <span className={head}>{t('Customer')}</span>
        <span className={head}>{t('Cheezein')}</span>
        <span className={head}>{t('Amount')}</span>
        <span className={head}>{t('Confirm')}</span>
        <span className={head}>{t('Tracking')}</span>
        <span />
        <span className={cn(head, 'text-end')}>{t('Status')}</span>
      </div>
      <label className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-[0.8125rem] font-medium text-slate-600 sm:px-4 xl:hidden">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={allPicked} onChange={(e) => onToggleAll(e.target.checked)} />
        {t('Dikhaye gaye sab {{count}} chunein', { count: orders.length })}
      </label>
      <ul className="divide-y divide-slate-100 [&>li:last-child]:rounded-b-3xl">
        {orders.map((o) => (
          <BoardRow key={o.id} order={o} money={money} custom={custom} shopName={shopName} siteUrl={sites.get(o.integrationId)}
            assignee={o.assignedToId ? o.assigneeName ?? names.get(o.assignedToId) ?? t('Team member') : null} couriers={couriers}
            checked={picked.has(o.id)} active={o.id === selectedId} busy={move.busyId === o.id || quickBusyId === o.id}
            onToggle={() => onToggle(o.id)} onOpen={() => onOpen(o.id)} onMove={(to) => move.request(o, to)}
            onTool={(kind) => setTool({ kind, order: o })} onQuick={(a) => onQuick(o, a)} onTexted={() => texted(o)}
            onDelete={() => void remove(o)} onRestore={() => void act(o, () => orderBoardApi.restore(o.id), t('wapas aa gaya'))} onPermanent={() => void permanent(o)} />
        ))}
      </ul>
      {move.ui}
      {tool && <OrderToolModal kind={tool.kind} orders={[tool.order]} onClose={() => setTool(null)} />}
    </section>
  );
}
