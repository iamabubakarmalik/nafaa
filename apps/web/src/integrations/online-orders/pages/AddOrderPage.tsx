/**
 * Add order page (/online-orders/new): write an order by hand, fill it from
 * a pasted WhatsApp message, or bring many in from Excel. ?replacementOf=<id>
 * links the new order to the one it replaces and copies the customer.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardPaste, FileSpreadsheet, GraduationCap, Inbox, MessageCircle, PenLine, Save, ShoppingBag, Store } from 'lucide-react';
import { PageHero, PageShell, Tabs, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { onlineOrdersApi } from '../api/online-orders.api';
import { ExcelTab } from '../components/orders/AddOrder/ExcelTab';
import { ManualOrderForm, emptyDraft, type ManualDraft, type ReplacementInfo } from '../components/orders/AddOrder/ManualOrderForm';
import { PasteTab, draftFromParsed } from '../components/orders/AddOrder/PasteTab';
import { useSalesChannels } from '../hooks/useSalesChannels';
import { orderNo } from '../lib/orders';
import { t } from '@core/i18n';

type Tab = 'form' | 'paste' | 'excel';

export default function AddOrderPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const replacementOf = params.get('replacementOf');
  const [tab, setTab] = useState<Tab>('form');
  const [draft, setDraft] = useState<ManualDraft>(emptyDraft);
  const { data: channels = [] } = useSalesChannels();
  const shopify = channels.filter((c) => c.type === 'SHOPIFY');

  const origQ = useQuery({ queryKey: ['online-order', replacementOf], queryFn: () => onlineOrdersApi.detail(replacementOf!), enabled: !!replacementOf });
  const orig = origQ.data;
  const replacement: ReplacementInfo | null = orig ? { id: orig.id, number: orderNo(orig), customerName: orig.customerName } : null;
  useEffect(() => {
    if (!orig) return;
    setDraft((d) => ({
      ...d,
      customer: { name: orig.customerName ?? '', phone: orig.customerPhone ?? '', address: orig.customerAddress ?? '', city: orig.customerCity ?? '' },
      notes: d.notes || t('Order #{{no}} ka replacement', { no: orderNo(orig) }),
    }));
  }, [orig]);

  const created = (id: string, number: string, accepted: boolean) => {
    toast.success(t('Order #{{no}} ban gaya', { no: number }));
    navigate(`/online-orders?board=${accepted ? 'CONFIRMED' : 'NEW'}&order=${id}`);
  };

  return (
    <PageShell>
      <PageHero
        back="/online-orders"
        title={replacement ? t('Replacement order') : t('Naya order')}
        chip={<><ShoppingBag />{replacement ? t('#{{no}} ke badle', { no: replacement.number }) : t('WhatsApp, Instagram, phone')}</>}
        meta={t('Haath se likhein, message paste karein ya Excel se laayein — order board par aa jata hai')}
        actions={<button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
      />

      <div className="rounded-3xl bg-white px-4 pt-2 shadow-sm ring-1 ring-slate-200/80 sm:px-5">
        <Tabs value={tab} onChange={setTab} label={t('Order kaise likhein')}
          items={[
            { value: 'form', label: <span className="inline-flex items-center gap-1.5"><PenLine className="h-4 w-4" />{t('Form')}</span> },
            { value: 'paste', label: <span className="inline-flex items-center gap-1.5"><ClipboardPaste className="h-4 w-4" />{t('Paste')}</span> },
            ...(!replacement ? [{ value: 'excel' as Tab, label: <span className="inline-flex items-center gap-1.5"><FileSpreadsheet className="h-4 w-4" />{t('Excel')}</span> }] : []),
          ]} />
      </div>

      {tab === 'paste' && <PasteTab onParsed={(p) => { setDraft((d) => draftFromParsed(d, p)); setTab('form'); }} />}
      {tab === 'excel' && <ExcelTab onDone={() => navigate('/online-orders?board=NEW')} />}
      {tab === 'form' && <ManualOrderForm draft={draft} onChange={setDraft} shopify={shopify} replacement={replacement} money={money} onCreated={created} />}

      {guide.isOpen && (
        <PageGuide title={t('Naya order — aasaan tareeqa')} onClose={guide.close}
          flowTitle={t('Message se order tak')}
          flow={[
            { label: t('Message'), hint: t('WhatsApp / Instagram'), icon: MessageCircle, color: '#16a34a' },
            { label: t('Paste'), hint: t('Form khud bharta hai'), icon: ClipboardPaste, color: '#0891b2' },
            { label: t('Check + save'), hint: t('Cheezein, paisa'), icon: Save, color: '#7c3aed' },
            { label: t('Board'), hint: t('New ya Confirmed'), icon: Inbox, color: '#d97706' },
          ]}
          steps={[
            { icon: PenLine, color: '#7c3aed', title: t('Form'), text: t('Order kahan se aaya chunein, customer aur cheezein likhein. Har cheez Nafaa product se juri honi chahiye taake stock sahi rahe.') },
            { icon: ClipboardPaste, color: '#0891b2', title: t('Paste'), text: t('Customer ka poora message paste karein — naam, phone, address, shehar aur cheezein khud bhar jati hain.') },
            { icon: FileSpreadsheet, color: '#16a34a', title: t('Excel'), text: t('Bohat se orders ek saath: Excel ya CSV file chunein, dekh lein, phir banayein. Sample file se shuru karein.') },
            { icon: Store, color: '#ea580c', title: t('Shopify par bhi'), text: t('"Nafaa + store" chunein to order aap ke Shopify store me bhi ban jata hai.') },
          ]}
          tips={[t('COD me advance mila ho to likh dein — courier sirf baqi paisa lega.'), t('"Accept bhi kar dein" se bill aur stock foran.'), t('Replacement order purane order ke "⋯" menu se banayein.')]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
