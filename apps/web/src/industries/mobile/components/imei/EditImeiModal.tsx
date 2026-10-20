/**
 * One phone's record: PTA, shelf status (reserved, damaged, lost — the last
 * two are written off at cost), cost, warranty and notes. A sold phone only
 * takes PTA and notes; it comes back through a Return.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select, Textarea, confirmDialog } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { imeiApi, type ImeiRow, type ImeiStatus, type PtaStatus } from '../../api/imei.api';
import { IMEI_KEY, PTA_LIST, apiError, digits, imeiStatusOf, money, ptaOf } from '../meta';

const SHELF: ImeiStatus[] = ['IN_STOCK', 'RESERVED', 'DAMAGED', 'LOST'];

export function EditImeiModal({ row, canManage, onClose }: { row: ImeiRow; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const sold = row.status === 'SOLD';
  const [f, setF] = useState({
    imei1: row.imei1, imei2: row.imei2 ?? '', pta: row.ptaStatus as PtaStatus, status: row.status, cost: String(row.costPrice ?? ''),
    warranty: String(row.warrantyMonths ?? ''), color: row.color ?? '', notes: row.notes ?? '',
  });
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const writeOff = !sold && f.status !== row.status && (f.status === 'DAMAGED' || f.status === 'LOST');

  const refresh = () => [IMEI_KEY, 'mobile-imei-shelf', 'mobile-product-imeis', 'product', 'products-catalog', 'mobile-pos-catalog', 'imei-stats']
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const save = useMutation({
    mutationFn: () => imeiApi.update(row.id, sold
      ? { ptaStatus: f.pta, notes: f.notes.trim() || undefined, warrantyMonths: Number(f.warranty) || 0 }
      : {
          imei1: f.imei1, imei2: f.imei2 || undefined, ptaStatus: f.pta, status: f.status, costPrice: Number(f.cost) || 0,
          warrantyMonths: Number(f.warranty) || 0, color: f.color.trim() || undefined, notes: f.notes.trim() || undefined,
        }),
    onSuccess: () => { toast.success('Save ho gaya'); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const remove = useMutation({
    mutationFn: () => imeiApi.remove(row.id),
    onSuccess: () => { toast.success('Ghalat IMEI hata diya — stock bhi theek ho gaya'); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hata')),
  });
  const bad = !sold && (!/^\d{15}$/.test(f.imei1) || (f.imei2 && !/^\d{15}$/.test(f.imei2)) || f.imei1 === f.imei2);

  return (
    <Modal open onClose={onClose} size="md" title={`${row.product.name}${row.variant ? ` · ${row.variant.name}` : ''}`} description={`IMEI ${row.imei1} · ${imeiStatusOf(row.status).label}`}
      footer={canManage ? <>
        {!sold && !row.saleItemId && (
          <Button variant="ghost" className="mr-auto text-rose-700" leftIcon={<Trash2 className="h-4 w-4" />} loading={remove.isPending}
            onClick={async () => { if ((await confirmDialog({ title: 'Ye IMEI ghalti se dala tha?', text: 'Hatane se stock bhi 1 kam hoga.', danger: true }))) remove.mutate(); }}>Ghalat entry</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} disabled={!!bad} loading={save.isPending}>Save karein</Button>
      </> : <Button variant="secondary" onClick={onClose}>Band karein</Button>}>
      <fieldset disabled={!canManage} className="space-y-3">
        {!sold && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="IMEI 1" inputMode="numeric" maxLength={15} value={f.imei1} onChange={(e) => set({ imei1: digits(e.target.value) })} className="font-mono" />
            <Input label="IMEI 2" inputMode="numeric" maxLength={15} value={f.imei2} onChange={(e) => set({ imei2: digits(e.target.value) })} className="font-mono" hint="Dual SIM ho to" />
          </div>
        )}
        <Select label="PTA" value={f.pta} onChange={(e) => set({ pta: e.target.value as PtaStatus })} options={PTA_LIST.map((p) => ({ value: p, label: ptaOf(p).label }))} />
        {!sold && (
          <>
            <Select label="Halat" value={f.status} onChange={(e) => set({ status: e.target.value as ImeiStatus })}
              options={[...SHELF, ...(SHELF.includes(row.status) ? [] : [row.status])].map((s) => ({ value: s, label: imeiStatusOf(s).label }))}
              hint="Rakha hua = kisi customer ke liye alag rakha, bikta nahi" />
            {writeOff && (
              <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Stock se nikal jayega aur {formatPKR(Number(f.cost) || 0)} nuqsan me likha jayega (Profit report me).
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Cost" inputMode="decimal" value={f.cost} onChange={(e) => set({ cost: money(e.target.value) })} />
              <Input label="Rang" value={f.color} onChange={(e) => set({ color: e.target.value })} />
            </div>
          </>
        )}
        <Input label="Warranty (mahine)" inputMode="numeric" value={f.warranty} onChange={(e) => set({ warranty: digits(e.target.value) })} hint={sold ? 'Bill ki tareekh se ginti hoti hai' : undefined} />
        <Textarea label="Note" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={500} />
      </fieldset>
    </Modal>
  );
}
