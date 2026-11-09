/**
 * Dark sticky bar for the selected products: on/off, featured, category,
 * supplier, price percent, packing, labels, export, delete. Delete is safe first: products with sales are only switched off.
 * For demo or test data the owner can then wipe those too, sales included,
 * after typing a confirmation word.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Boxes, Download, Eye, EyeOff, Layers, Percent, Star, StarOff, Tag, Trash2, Truck, X } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { t, Trans } from '@core/i18n';
import { BulkChangeModal, type BulkChange } from './BulkChangeModal';

type Action = 'activate' | 'deactivate' | 'feature' | 'unfeature';

export function BulkBar({ ids, onDone, onClear, onExport, can }: {
  ids: string[];
  can: { edit: boolean; delete: boolean };
  onDone: () => void;
  onClear: () => void;
  onExport: () => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [withSales, setWithSales] = useState<string[]>([]);
  const [word, setWord] = useState('');
  const [change, setChange] = useState<BulkChange | null>(null);

  const run = async (action: Action, done: string) => {
    setBusy(action);
    try { await productsApi.bulkAction(ids, action); toast.success(done); onDone(); }
    catch (e) { toast.error((e as Error).message || t('Nahi hua')); } finally { setBusy(null); }
  };

  // One by one, so products with sales history are switched off instead of
  // being wiped together with their old bills.
  const remove = async () => {
    setBusy('delete');
    const res = await Promise.allSettled(ids.map((id) => productsApi.remove(id, false)));
    const offIds = ids.filter((_, i) => { const r = res[i]; return r.status === 'fulfilled' && r.value?.softDeleted; });
    const gone = res.filter((r) => r.status === 'fulfilled' && !r.value?.softDeleted).length;
    const failed = res.length - offIds.length - gone;
    if (gone) toast.success(t('{{gone}} mita diye', { gone }));
    if (failed) toast.error(t('{{failed}} nahi hue', { failed }));
    setBusy(null); setConfirm(false);
    if (offIds.length) { setWithSales(offIds); setWord(''); } else onDone();
  };

  // Demo or test data: remove the products together with their sales.
  const wipe = async () => {
    setBusy('wipe');
    try {
      const r = await productsApi.bulkAction(withSales, 'delete') as { removedEmptySales?: number };
      toast.success(t('{{count}} cheezein sale samet mita di{{value}}', { count: withSales.length, value: r?.removedEmptySales ? t(' · {{removedEmptySales}} khali bill bhi hate', { removedEmptySales: r.removedEmptySales }) : '' }));
    } catch (e) { toast.error((e as Error).message || t('Nahi hua')); }
    setBusy(null); setWithSales([]); onDone();
  };

  const btn = 'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-white/90 transition hover:bg-white/10 disabled:opacity-50';
  return (
    <>
      <div className="sticky top-[76px] z-30 flex flex-wrap items-center gap-1 rounded-2xl bg-slate-900 p-1.5 ps-4 text-white shadow-xl">
        <span className="me-2 text-[0.875rem] font-semibold">{t('{{count}} chuni', { count: ids.length })}</span>
        {can.edit && (
          <>
            <button type="button" className={btn} disabled={!!busy} onClick={() => void run('activate', t('{{count}} products chalu kar diye', { count: ids.length }))}><Eye className="h-4 w-4" />{t('Chalu')}</button>
            <button type="button" className={btn} disabled={!!busy} onClick={() => void run('deactivate', t('{{count}} products band kar diye', { count: ids.length }))}><EyeOff className="h-4 w-4" />{t('Band')}</button>
            <button type="button" className={btn} disabled={!!busy} onClick={() => void run('feature', t('{{count}} products khaas bana diye', { count: ids.length }))}><Star className="h-4 w-4" />{t('Khaas')}</button>
            <button type="button" className={btn} disabled={!!busy} onClick={() => void run('unfeature', t('{{count}} products aam kar diye', { count: ids.length }))}><StarOff className="h-4 w-4" /><span className="hidden sm:inline">{t('Aam')}</span></button>
            <span className="mx-1 h-5 w-px bg-white/20" />
            <button type="button" className={btn} onClick={() => setChange('category')}><Layers className="h-4 w-4" />{t('Category')}</button>
            <button type="button" className={btn} onClick={() => setChange('supplier')}><Truck className="h-4 w-4" />{t('Supplier')}</button>
            <button type="button" className={btn} onClick={() => setChange('price')}><Percent className="h-4 w-4" />{t('Qeemat %')}</button>
            <button type="button" className={btn} onClick={() => setChange('pack')}><Boxes className="h-4 w-4" />{t('Packing')}</button>
          </>
        )}
        <button type="button" className={btn} onClick={() => navigate('/retail/barcode-labels', { state: { productIds: ids } })}><Tag className="h-4 w-4" />{t('Labels')}</button>
        <button type="button" className={btn} onClick={onExport}><Download className="h-4 w-4" />{t('CSV')}</button>
        {can.delete && <button type="button" className={`${btn} text-rose-300 hover:bg-rose-500/20`} disabled={!!busy} onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" />{t('Mitayein')}</button>}
        <button type="button" onClick={onClear} aria-label={t('Chunna khatam')} className="ms-auto flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>
      {change && <BulkChangeModal kind={change} ids={ids} onClose={() => setChange(null)} onDone={() => { setChange(null); onDone(); }} />}
      {confirm && (
        <Modal open onClose={() => setConfirm(false)} size="sm" title={t('{{count}} cheezein mitayein?', { count: ids.length })}
          description={t('Jin ki kabhi sale nahi hui woh mit jayengi. Jin ki sale ho chuki hai woh sirf band hongi, taake purane bill aur hisaab salamat rahein.')}
          footer={<>
            <Button variant="secondary" onClick={() => setConfirm(false)}>{t('Rehne dein')}</Button>
            <Button variant="danger" loading={busy === 'delete'} onClick={() => void remove()}>{t('Haan, mitayein')}</Button>
          </>}>
          <p className="text-[0.8125rem] text-slate-600">{t('Yeh wapas nahi hoga.')}</p>
        </Modal>
      )}
      {withSales.length > 0 && (
        <Modal open onClose={() => { setWithSales([]); onDone(); }} size="sm" title={t('{{count}} cheezon ki sale ho chuki hai', { count: withSales.length })}
          description={t('Hisaab bachane ke liye inhein mitaya nahi, sirf band kar diya hai. Ab yeh POS par nahi dikhengi.')}
          footer={<>
            <Button variant="secondary" onClick={() => { setWithSales([]); onDone(); }}>{t('Theek hai, band hi rehne dein')}</Button>
            <Button variant="danger" disabled={word.trim().toUpperCase() !== 'MITAO'} loading={busy === 'wipe'} onClick={() => void wipe()}>{t('Sale samet mitayein')}</Button>
          </>}>
          <div className="space-y-3 text-[0.8125rem] text-slate-600">
            <p className="rounded-xl bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">
              <Trans text="Agar yeh {{demo}} ki cheezein thin, to inki sale bhi mita sakte hain. Inke bill ki lines hat jayengi, aur jo bill khali ho jayen woh bhi. Asal dukaan ka data ho to mat mitayein." values={{ demo: <strong>{t('demo ya test')}</strong> }} />
            </p>
            <label className="block">
              {/* i18n-ignore: the confirmation word is typed as is */}
              <span className="font-medium text-slate-700"><Trans text="Pakka karne ke liye {{word}} likhein" values={{ word: <strong>MITAO</strong> }} /></span>
              <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder="MITAO" /* i18n-ignore: the confirmation word is typed as is */ className="mt-1" autoFocus />
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}
