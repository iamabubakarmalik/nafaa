/**
 * Picks and orders the dashboard's "Aaj ka kaam" tiles: tick to show, drag
 * (or the arrows) to move. Saved for the whole shop.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { Button, Checkbox, IconButton, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { insightsApi } from '../../api/insights.api';
import { BOARD } from '../../lib/orders';
import { SETUP_KEY } from '../../hooks/useCommerceSetup';

/** Tiles the dashboard can show (same keys as the board counts). */
export const HOME_TILE_KEYS = ['NEW', 'PAY_PENDING', 'ON_HOLD', 'NO_STOCK', 'CUSTOMER_QUERY', 'CONFIRMED', 'PACKED', 'PACKED_NOT_SENT', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'STUCK', 'ISSUES', 'RETURNING', 'FOLLOW_UP', 'COD_DUE', 'CLAIM'];
export const tileEntry = (key: string) => BOARD.find((b) => b.key === key);

export function HomeTilesEditor({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [drag, setDrag] = useState<string | null>(null);
  const order = [...value, ...HOME_TILE_KEYS.filter((k) => !value.includes(k))];
  const move = (key: string, to: number) => {
    const shown = value.filter((k) => k !== key);
    shown.splice(Math.max(0, Math.min(to, shown.length)), 0, key);
    onChange(shown);
  };
  return (
    <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200/80">
      {order.map((k) => {
        const e = tileEntry(k);
        if (!e) return null;
        const on = value.includes(k);
        const i = value.indexOf(k);
        const Icon = e.icon;
        return (
          <li key={k} draggable={on} onDragStart={() => setDrag(k)} onDragEnd={() => setDrag(null)}
            onDragOver={(ev) => { if (drag && on) ev.preventDefault(); }}
            onDrop={(ev) => { ev.preventDefault(); if (drag && drag !== k && on) move(drag, i); setDrag(null); }}
            className={cn('flex items-center gap-2 px-3 py-2 text-[0.8125rem]', drag === k && 'opacity-50', !on && 'bg-slate-50')}>
            <GripVertical className={cn('h-4 w-4', on ? 'cursor-grab text-slate-400' : 'text-slate-200')} aria-hidden />
            <Checkbox checked={on} onChange={(ev) => onChange(ev.currentTarget.checked ? [...value, k] : value.filter((x) => x !== k))} aria-label={e.label} />
            <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${e.color}17`, color: e.color }}><Icon className="h-3.5 w-3.5" /></span>
            <span className={cn('flex-1 font-medium', on ? 'text-slate-900' : 'text-slate-500')}>{e.label}<span className="ms-2 text-[0.75rem] font-normal text-slate-500">{e.hint}</span></span>
            {on && <>
              <IconButton size="sm" label={t('Upar')} disabled={i === 0} onClick={() => move(k, i - 1)}><ArrowUp className="h-3.5 w-3.5" /></IconButton>
              <IconButton size="sm" label={t('Neeche')} disabled={i === value.length - 1} onClick={() => move(k, i + 1)}><ArrowDown className="h-3.5 w-3.5" /></IconButton>
            </>}
          </li>
        );
      })}
    </ul>
  );
}

/** The editor in a dialog, saving straight to the shop's setup. */
export function HomeTilesModal({ initial, onClose }: { initial: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [tiles, setTiles] = useState(initial);
  const save = useMutation({
    mutationFn: () => insightsApi.savePrefs({ homeTiles: tiles }),
    onSuccess: (p) => { qc.setQueryData(SETUP_KEY, p); toast.success(t('Dabbe save ho gaye')); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} title={t('Aaj ka kaam — dabbe chunein')} description={t('Tick = dikhe. Kheench kar ya teer se tarteeb badlein.')}
      footer={<Button variant="primary" loading={save.isPending} disabled={!tiles.length} onClick={() => save.mutate()}>{t('Save')}</Button>}>
      <HomeTilesEditor value={tiles} onChange={setTiles} />
    </Modal>
  );
}
