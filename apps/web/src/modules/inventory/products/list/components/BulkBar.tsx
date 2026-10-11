/** Dark sticky bar for the selected products: on/off, featured, labels, export, delete. */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Eye, EyeOff, Star, StarOff, Tag, Trash2, X } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { productsApi } from '@modules/inventory/products/api/products.api';

type Action = 'activate' | 'deactivate' | 'feature' | 'unfeature';

export function BulkBar({ ids, onDone, onClear, onExport }: {
  ids: string[];
  onDone: () => void;
  onClear: () => void;
  onExport: () => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const run = async (action: Action, done: string) => {
    setBusy(action);
    try { await productsApi.bulkAction(ids, action); toast.success(`${ids.length} ${done}`); onDone(); }
    catch (e) { toast.error((e as Error).message || 'Nahi hua'); } finally { setBusy(null); }
  };

  // One by one, so products with sales history are switched off instead of
  // being wiped together with their old bills.
  const remove = async () => {
    setBusy('delete');
    const res = await Promise.allSettled(ids.map((id) => productsApi.remove(id, false)));
    const off = res.filter((r) => r.status === 'fulfilled' && r.value?.softDeleted).length;
    const gone = res.filter((r) => r.status === 'fulfilled' && !r.value?.softDeleted).length;
    const failed = res.length - off - gone;
    if (gone) toast.success(`${gone} mita diye`);
    if (off) toast.info(`${off} ki purani bikri hai — mitane ki jagah band kar diye, hisaab mehfooz hai`);
    if (failed) toast.error(`${failed} nahi hue`);
    setBusy(null); setConfirm(false); onDone();
  };

  const btn = 'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-white/90 transition hover:bg-white/10 disabled:opacity-50';
  return (
    <>
      <div className="sticky top-[76px] z-30 flex flex-wrap items-center gap-1 rounded-2xl bg-slate-900 p-1.5 pl-4 text-white shadow-xl">
        <span className="mr-2 text-[0.875rem] font-semibold">{ids.length} chuni</span>
        <button type="button" className={btn} disabled={!!busy} onClick={() => void run('activate', 'chalu kar diye')}><Eye className="h-4 w-4" />Chalu</button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => void run('deactivate', 'band kar diye')}><EyeOff className="h-4 w-4" />Band</button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => void run('feature', 'khaas bana diye')}><Star className="h-4 w-4" />Khaas</button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => void run('unfeature', 'aam kar diye')}><StarOff className="h-4 w-4" /><span className="hidden sm:inline">Aam</span></button>
        <button type="button" className={btn} onClick={() => navigate('/retail/barcode-labels', { state: { productIds: ids } })}><Tag className="h-4 w-4" />Labels</button>
        <button type="button" className={btn} onClick={onExport}><Download className="h-4 w-4" />CSV</button>
        <button type="button" className={`${btn} text-rose-300 hover:bg-rose-500/20`} disabled={!!busy} onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" />Mitayein</button>
        <button type="button" onClick={onClear} aria-label="Chunna khatam" className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>
      {confirm && (
        <Modal open onClose={() => setConfirm(false)} size="sm" title={`${ids.length} cheezein mitayein?`}
          description="Jin ki kabhi bikri nahi hui woh mit jayengi. Jin ki bikri ho chuki hai woh sirf band hongi, taake purane bill aur hisaab salamat rahein."
          footer={<>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Rehne dein</Button>
            <Button variant="danger" loading={busy === 'delete'} onClick={() => void remove()}>Haan, mitayein</Button>
          </>}>
          <p className="text-[0.8125rem] text-slate-600">Yeh wapas nahi hoga.</p>
        </Modal>
      )}
    </>
  );
}
