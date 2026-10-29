/**
 * Create or edit a price list: name, short code, the rule for items the list
 * does not name (base price plus or minus a percent), default and on/off.
 */

import { useState } from 'react';
import { Button, Input, Modal, Segmented, Switch, Textarea } from '@/design-system/components';
import type { ListBase, PriceList, SavePriceList } from '../../api/distribution.api';

export const BASE_LABEL: Record<ListBase, string> = { PRICE: 'Retail price', WHOLESALE: 'Wholesale price', COST: 'Cost' };

/** "Wholesale price −3%" */
export function ruleText(l: Pick<PriceList, 'basedOn' | 'adjustPct'>) {
  const pct = Number(l.adjustPct) || 0;
  return `${BASE_LABEL[l.basedOn] ?? l.basedOn}${pct ? ` ${pct > 0 ? '+' : '−'}${Math.abs(pct)}%` : ''}`;
}

export function PriceListFormModal({ list, saving, onClose, onSave }: {
  list: PriceList | null; saving: boolean; onClose: () => void; onSave: (body: SavePriceList) => void;
}) {
  const [name, setName] = useState(list?.name ?? '');
  const [code, setCode] = useState(list?.code ?? '');
  const [basedOn, setBasedOn] = useState<ListBase>(list?.basedOn ?? 'WHOLESALE');
  const [pct, setPct] = useState(list ? String(list.adjustPct ?? 0) : '0');
  const [isDefault, setDefault] = useState(list?.isDefault ?? false);
  const [isActive, setActive] = useState(list?.isActive ?? true);
  const [note, setNote] = useState(list?.note ?? '');
  const p = Number(pct);
  const pctBad = !Number.isFinite(p) || p < -90 || p > 500;
  const nameBad = !name.trim();

  const submit = () => {
    if (nameBad || pctBad) return;
    onSave({ name: name.trim(), code: code.trim() || undefined, basedOn, adjustPct: p, isDefault, isActive, note: note.trim() || undefined });
  };

  return (
    <Modal open onClose={onClose} size="md" title={list ? `${list.name} — badlein` : 'Nayi price list'}
      description="List me jo rate likhenge wohi chalega; baqi items par neeche wala rule."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button data-save-action loading={saving} disabled={nameBad || pctBad} onClick={submit}>{list ? 'Save karein' : 'List banayein'}</Button>
      </>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <Input label="Naam" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Retailers" />
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={20} placeholder="RET" className="font-mono" />
        </div>
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-[0.8125rem] font-semibold text-slate-800">Jo item list me nahi, us ka rate</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <Segmented label="Base" value={basedOn} onChange={setBasedOn}
              items={(['PRICE', 'WHOLESALE', 'COST'] as ListBase[]).map((b) => ({ value: b, label: BASE_LABEL[b] }))} />
            <Input size="sm" type="number" label="± %" value={pct} onChange={(e) => setPct(e.target.value)} wrapperClassName="w-28"
              error={pctBad ? '-90 se 500' : undefined} />
          </div>
          <p className="mt-2 text-[0.75rem] text-slate-600">Rule: <b>{ruleText({ basedOn, adjustPct: Number.isFinite(p) ? p : 0 })}</b> — misal: −3 likhein to 3% kam, 5 likhein to 5% zyada.</p>
        </div>
        <Switch checked={isDefault} onChange={(e) => setDefault(e.target.checked)} label="Default list"
          description="Jis customer ki apni list nahi, us par yehi list lagegi (booker app me)." />
        <Switch checked={isActive} onChange={(e) => setActive(e.target.checked)} label="Chalu" description="Band list kisi bill par nahi lagti." />
        <Textarea label="Note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Andar ke liye" />
      </div>
    </Modal>
  );
}
