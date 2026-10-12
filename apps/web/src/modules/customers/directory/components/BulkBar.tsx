/** Dark sticky bar for selected customers: VIP, copy numbers, CSV, delete (customers with history are only switched off). */

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Crown, Download, Trash2, X } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import type { DirectoryCustomer } from '../api';

export function BulkBar({ selected, onDone, onClear, onExport, can }: {
  selected: DirectoryCustomer[];
  onDone: () => void;
  onClear: () => void;
  onExport: () => void;
  can: { edit: boolean; delete: boolean };
}) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const vip = async (on: boolean) => {
    const targets = selected.filter((c) => c.isVip !== on);
    if (!targets.length) return toast.info(on ? 'Sab pehle se VIP hain' : 'Koi VIP nahi');
    setBusy(true);
    const res = await Promise.allSettled(targets.map((c) => customersApi.toggleVip(c.id)));
    const bad = res.filter((r) => r.status === 'rejected').length;
    toast.success(`${targets.length - bad} ${on ? 'VIP bana diye' : 'aam kar diye'}`);
    if (bad) toast.error(`${bad} nahi hue`);
    setBusy(false); onDone();
  };
  const copy = async () => {
    const nums = selected.map((c) => c.phone).filter(Boolean).join('\n');
    if (!nums) return toast.error('Kisi ka phone nahi');
    await navigator.clipboard.writeText(nums);
    toast.success(`${nums.split('\n').length} number copy ho gaye`);
  };
  const remove = async () => {
    setBusy(true);
    const res = await Promise.allSettled(selected.map((c) => customersApi.remove(c.id)));
    const kept = res.filter((r) => r.status === 'fulfilled' && (r.value as { softDeleted?: boolean }).softDeleted).length;
    const gone = res.filter((r) => r.status === 'fulfilled').length - kept;
    if (gone) toast.success(`${gone} mita diye`);
    if (kept) toast.info(`${kept} ki bikri ya khata hai — mitane ki jagah band kar diye`);
    const bad = res.length - gone - kept;
    if (bad) toast.error(`${bad} nahi hue`);
    setBusy(false); setConfirm(false); onDone();
  };

  const btn = 'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-white/90 transition hover:bg-white/10 disabled:opacity-50';
  return (
    <>
      <div className="sticky top-[76px] z-30 flex flex-wrap items-center gap-1 rounded-2xl bg-slate-900 p-1.5 pl-4 text-white shadow-xl">
        <span className="mr-2 text-[0.875rem] font-semibold">{selected.length} chune</span>
        {can.edit && <button type="button" className={btn} disabled={busy} onClick={() => void vip(true)}><Crown className="h-4 w-4" />VIP</button>}
        {can.edit && <button type="button" className={btn} disabled={busy} onClick={() => void vip(false)}>VIP hatayein</button>}
        <button type="button" className={btn} onClick={() => void copy()}><Copy className="h-4 w-4" />Number</button>
        <button type="button" className={btn} onClick={onExport}><Download className="h-4 w-4" />CSV</button>
        {can.delete && <button type="button" className={`${btn} text-rose-300 hover:bg-rose-500/20`} disabled={busy} onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" />Mitayein</button>}
        <button type="button" onClick={onClear} aria-label="Chunna khatam" className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>
      {confirm && (
        <Modal open onClose={() => setConfirm(false)} size="sm" title={`${selected.length} customer mitayein?`}
          description="Jin ki kabhi bikri ya khata nahi hua woh mit jayenge. Baqi sirf band honge, taake purane bill aur khata salamat rahein."
          footer={<>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Rehne dein</Button>
            <Button variant="danger" loading={busy} onClick={() => void remove()}>Haan</Button>
          </>}>
          <p className="text-[0.8125rem] text-slate-600">Mitaye hue wapas nahi aate.</p>
        </Modal>
      )}
    </>
  );
}
