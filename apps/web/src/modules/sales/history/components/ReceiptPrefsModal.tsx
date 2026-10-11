/** Receipt settings for this computer: paper width, short or full bill, auto-print, logo. */

import { useState } from 'react';
import { Modal, Segmented, Switch } from '@/design-system/components';
import { getReceiptPrefs, saveReceiptPrefs, type ReceiptPrefs } from '../receiptPrefs';

export function ReceiptPrefsModal({ onClose }: { onClose: () => void }) {
  const [p, setP] = useState<ReceiptPrefs>(getReceiptPrefs);
  const set = (patch: Partial<ReceiptPrefs>) => { const next = { ...p, ...patch }; setP(next); saveReceiptPrefs(next); };
  return (
    <Modal open onClose={onClose} size="sm" title="Receipt settings" description="Bill kholne aur print karne par yahi chalti hain">
      <div className="divide-y divide-slate-100">
        <div className="flex items-center justify-between gap-4 pb-3">
          <span className="text-sm font-medium text-slate-800">Kaghaz</span>
          <Segmented label="Kaghaz" value={p.paperWidth} onChange={(v) => set({ paperWidth: v })} items={[{ value: '80', label: '80mm' }, { value: '58', label: '58mm' }]} />
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-sm font-medium text-slate-800">Bill</span>
          <Segmented label="Bill" value={p.mode} onChange={(v) => set({ mode: v })} items={[{ value: 'short', label: 'Chhota' }, { value: 'full', label: 'Poora' }]} />
        </div>
        <div className="py-3"><Switch label="Receipt kholte hi print" checked={p.autoPrint} onChange={(e) => set({ autoPrint: e.target.checked })} /></div>
        <div className="pt-3"><Switch label="Logo dikhayein" checked={p.showLogo} onChange={(e) => set({ showLogo: e.target.checked })} /></div>
      </div>
    </Modal>
  );
}
