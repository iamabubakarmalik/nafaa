/**
 * Dispatch scan (/online-orders/dispatch-scan): scan each parcel's CN or
 * order number as it goes to the rider. A packed order becomes DISPATCHED;
 * mistakes (not packed, cancelled, already sent, delivered, returned) are
 * shown big and red with a sound, so the parcel is pulled back.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertOctagon, CheckCircle2, ClipboardList, GraduationCap, PackageCheck, ScanLine, Send, Truck } from 'lucide-react';
import { Button, Card, EmptyState, PageHero, PageShell, heroButton, heroIconButton } from '@/design-system/components';
import { useBoardCounts } from '../hooks/useBoardCounts';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { apiErrorMessage } from '../api/online-orders.api';
import { dispatchApi, type ScanCode, type ScanResult } from '../api/dispatch.api';
import { beep } from '../lib/pack';
import { courierBrand, rs } from '../lib/labels';
import { useBoardRefresh } from '../components/orders/useMoveOrder';
import { t } from '@core/i18n';

const SCAN_TEXT: Record<ScanCode, string> = {
  NOT_ACCEPTED: t('Order abhi accept nahi hua — pehle accept karein'),
  NOT_PACKED: t('Order pack nahi hua — pehle packing scan karein'),
  ALREADY_SENT: t('Ye parcel pehle hi bheja ja chuka'),
  DELIVERED: t('Ye order deliver ho chuka'),
  RETURNED: t('Ye order wapas aa chuka (RTO)'),
  CANCELLED: t('Ye order cancel hai — parcel mat bhejein'),
  DELETED: t('Ye order delete hai — parcel mat bhejein'),
};
const scanText = (r: ScanResult) => (r.code ? SCAN_TEXT[r.code] : r.message) ?? '';

interface Line { at: number; ok: boolean; number: string; text: string; courierCode: string | null; cn: string | null }

export default function DispatchScanPage() {
  const guide = usePageGuide();
  const board = useBoardCounts();
  const refresh = useBoardRefresh();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [last, setLast] = useState<ScanResult | null>(null);
  const [lastCode, setLastCode] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const focus = () => window.setTimeout(() => inputRef.current?.focus(), 0);
  const sent = lines.filter((l) => l.ok).length;
  const mistakes = lines.filter((l) => !l.ok).length;

  const scan = useMutation({
    mutationFn: ({ code, force }: { code: string; force?: boolean }) => dispatchApi.scan(code, force),
    onSuccess: (r) => {
      setLast(r); setValue(''); beep(r.ok);
      setLines((ls) => [{
        at: Date.now(), ok: r.ok, number: r.order.number, courierCode: r.order.courierCode, cn: r.order.trackingNumber,
        text: r.ok ? (r.noCn ? t('DISPATCHED · CN nahi likha') : 'DISPATCHED') : scanText(r),
      }, ...ls].slice(0, 200));
      if (r.ok) refresh(r.order.id);
      focus();
    },
    onError: (e) => {
      beep(false); setValue('');
      setLast({ ok: false, code: null, message: apiErrorMessage(e), order: { id: '', number: lastCode, customerName: '', customerCity: null, trackingNumber: null, courierCode: null, courierLabel: null, cod: 0, orderStatus: '' } });
      setLines((ls) => [{ at: Date.now(), ok: false, number: lastCode, text: apiErrorMessage(e), courierCode: null, cn: null }, ...ls].slice(0, 200));
      focus();
    },
  });
  const submit = (code: string) => { if (!code.trim()) return; setLastCode(code.trim()); scan.mutate({ code: code.trim() }); };

  return (
    <PageShell>
      <PageHero title={t('Dispatch scan')} chip={<><Send />{t('Rider ko parcel dete waqt')}</>}
        meta={t('Har parcel ka CN ya order # scan karein — order DISPATCHED ho jayega, ghalti foran dikhegi')}
        stats={[
          { label: t('Pack hain, gaye nahi'), value: String(board.count('PACKED', 'PACKED_NOT_SENT')), hint: t('rider ko dene hain') },
          { label: t('Is session me bheje'), value: String(sent) },
          { label: t('Ghaltiyan'), value: String(mistakes), hint: t('is session me') },
        ]}
        actions={<>
          <Link to="/online-orders/dispatch" className={heroButton}><Truck className="h-4 w-4" /> {t('Dispatch')}</Link>
          <Link to="/online-orders/pack" className={heroButton}><PackageCheck className="h-4 w-4" /> <span className="hidden sm:inline">{t('Packing')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <Card title={t('Parcel scan karein')} description={t('Scanner se CN ya order # — ya likh kar Enter')}>
        <form onSubmit={(e) => { e.preventDefault(); submit(value); }} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <ScanLine className="pointer-events-none absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input ref={inputRef} autoFocus value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false} aria-label={t('CN ya order number')}
              placeholder={t('Parcel ka CN ya order # scan karein…')}
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white ps-11 pe-3 font-mono text-lg text-slate-900 outline-none focus:border-brand-500" />
          </div>
          <Button type="submit" size="lg" className="h-14" loading={scan.isPending} disabled={!value.trim()}>{t('Scan')}</Button>
        </form>

        {last && !last.ok && (
          <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-rose-600 px-4 py-5 text-white">
            <AlertOctagon className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black">{last.order.number ? `#${last.order.number}` : ''} {t('— parcel mat bhejein')}</div>
              <div className="text-[0.9375rem] font-semibold">{scanText(last)}</div>
            </div>
            {last.code === 'NOT_PACKED' && (
              <Button variant="secondary" size="sm" loading={scan.isPending} onClick={() => { setLastCode(last.order.number); scan.mutate({ code: last.order.number, force: true }); }}>{t('Phir bhi bhejein')}</Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => { setLast(null); focus(); }}>{t('Theek hai')}</Button>
          </div>
        )}
        {last?.ok && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-success-600 px-4 py-4 text-white">
            <CheckCircle2 className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black">#{last.order.number} · DISPATCHED</div>
              <div className="text-[0.875rem]">{last.order.customerName}{last.order.customerCity ? ` · ${last.order.customerCity}` : ''} · COD {rs(last.order.cod)}{last.order.trackingNumber ? ` · ${last.order.trackingNumber}` : ''}</div>
              {last.noCn && <div className="text-[0.8125rem] font-semibold text-amber-100">{t('Is order par CN nahi — customer ko tracking nahi milegi')}</div>}
            </div>
            {last.order.courierCode && <BrandLogo name={courierBrand(last.order.courierCode)} size={36} />}
          </div>
        )}
      </Card>

      <Card flush title={t('Is session me ({{sent}} bheje · {{mistakes}} ghalti)', { sent, mistakes })}
        actions={<Link to="/online-orders/dispatch" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><ClipboardList className="h-4 w-4" />{t('Loadsheet')}</Link>}>
        {lines.length ? (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {lines.map((l) => (
              <li key={l.at} className={`flex items-center gap-3 px-4 py-2 text-[0.8125rem] sm:px-5 ${l.ok ? '' : 'bg-rose-50'}`}>
                {l.ok ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : <AlertOctagon className="h-4 w-4 text-rose-600" />}
                {l.courierCode && <BrandLogo name={courierBrand(l.courierCode)} size={16} />}
                <span className="font-semibold text-slate-900">#{l.number}</span>
                {l.cn && <span className="font-mono text-slate-500">{l.cn}</span>}
                <span className={`min-w-0 flex-1 truncate ${l.ok ? 'text-slate-600' : 'font-semibold text-rose-700'}`}>{l.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Send className="h-6 w-6" />} title={t('Abhi koi parcel scan nahi hua')} description={t('Rider ko dete waqt har parcel scan karein — yahan list banti jayegi.')} className="py-8" />
        )}
      </Card>
      </div>
      {guide.isOpen && (
        <PageGuide title={t('Dispatch scan')} onClose={guide.close}
          flow={[
            { label: t('Pack'), hint: 'PACKED', icon: PackageCheck, color: '#7c3aed' },
            { label: t('Scan'), hint: t('CN ya order #'), icon: ScanLine, color: '#0891b2' },
            { label: t('Rider'), hint: 'DISPATCHED', icon: Truck, color: '#16a34a' },
          ]}
          steps={[
            { icon: ScanLine, color: '#0891b2', title: t('Scan'), text: t('Barcode scanner se label ka CN scan karein, ya order number likh kar Enter.') },
            { icon: AlertOctagon, color: '#dc2626', title: t('Laal = ruk jayein'), text: t('Cancel, pehle bheja hua, ya pack na hua order laal dikhta hai aur awaz aati hai — woh parcel alag kar dein.') },
          ]}
          tips={[t('Pack na hua order "Phir bhi bhejein" se bhej sakte hain.')]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
