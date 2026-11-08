/**
 * The shop's own statuses (custom stages) for the board, up to 20. Each gets
 * a tile and shows in every Status menu. Owner and manager only.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { apiErrorMessage } from '../../api/online-orders.api';
import { orderBoardApi, type CustomStage } from '../../api/order-board.api';
import { t } from '@core/i18n';

export const STAGES_KEY = ['online-orders', 'stages'] as const;
const COLORS = ['#0891b2', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#64748b'];
const MAX = 20;

const keyOf = (label: string, taken: string[]) => {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'status';
  let k = base;
  for (let i = 2; taken.includes(k); i++) k = `${base}_${i}`;
  return k;
};

export function StagesModal({ stages, onClose }: { stages: CustomStage[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [list, setList] = useState<CustomStage[]>(stages);
  const [label, setLabel] = useState('');
  const save = useMutation({
    mutationFn: () => orderBoardApi.saveStages(list),
    onSuccess: () => { qc.invalidateQueries({ queryKey: STAGES_KEY }); toast.success(t('Apne status save ho gaye')); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const add = () => {
    const v = label.trim();
    if (!v || list.length >= MAX) return;
    setList([...list, { key: keyOf(v, list.map((s) => s.key)), label: v, color: COLORS[list.length % COLORS.length] }]);
    setLabel('');
  };

  return (
    <Modal open onClose={onClose} size="sm" title={t('Apne status')} description={t('Jaise "Call back", "Size badalna hai". Har status ka apna tile banega. Zyada se zyada {{max}}.', { max: MAX })}
      footer={<div className="flex w-full justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button loading={save.isPending} onClick={() => save.mutate()}>{t('Save')}</Button>
      </div>}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder={t('Naye status ka naam (English haroof me)')} maxLength={30} wrapperClassName="flex-1" />
          <Button variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={add} disabled={!label.trim() || list.length >= MAX}>{t('Jorein')}</Button>
        </div>
        {!list.length && <p className="py-2 text-center text-[0.8125rem] text-slate-500">{t('Abhi koi apna status nahi')}</p>}
        <ul className="space-y-1.5">
          {list.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 ring-1 ring-slate-200">
              <span className="flex gap-1">
                {COLORS.map((c) => (
                  <button key={c} type="button" aria-label={c} onClick={() => setList(list.map((x, j) => (j === i ? { ...x, color: c } : x)))}
                    className="h-4 w-4 rounded-full ring-offset-1" style={{ backgroundColor: c, boxShadow: s.color === c ? `0 0 0 2px ${c}55` : undefined }} />
                ))}
              </span>
              <input value={s.label} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} maxLength={30}
                className="h-8 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-[0.875rem] font-medium text-slate-900 outline-none focus:bg-slate-50" />
              <button type="button" onClick={() => setList(list.filter((_, j) => j !== i))} aria-label={t('Hatayein')} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
