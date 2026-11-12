/**
 * Checkout and payments for the website: how customers pay (COD and the
 * gateways already connected on the Payments page), advance on risky COD
 * orders, which fields the checkout asks for, login, minimum order and the
 * WhatsApp confirm step after a COD order.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, CreditCard, GraduationCap, MessageCircle, Save, ShieldAlert, ShoppingCart, UserRound } from 'lucide-react';
import { Badge, Button, Card, Input, PageShell, Select, Skeleton, Switch, Textarea, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type CheckoutSettings } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { SK } from '../lib/hooks';
import { rs } from '../lib/format';

export default function CheckoutPage() {
  return (
    <PageShell>
      <StoreGate title={t('Checkout aur payment')}>{(ctx) => <Checkout ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

type Req = 'hidden' | 'optional' | 'required';
const REQ = [{ value: 'hidden', label: t('Na poochein') }, { value: 'optional', label: t('Poochein (zaroori nahi)') }, { value: 'required', label: t('Zaroori') }];
const LOGO: Record<string, BrandName> = { JAZZCASH: 'jazzcash', EASYPAISA: 'easypaisa', SAFEPAY: 'safepay' };

function Checkout({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const qc = useQueryClient();
  const guide = usePageGuide();
  const q = useQuery({ queryKey: SK.checkout(id), queryFn: () => storesApi.checkout(id) });
  const pay = useQuery({ queryKey: SK.payments(id), queryFn: () => storesApi.payments(id) });
  const [d, setD] = useState<CheckoutSettings | null>(null);
  useEffect(() => { if (q.data) setD(q.data); }, [q.data]);
  const dirty = !!d && JSON.stringify(d) !== JSON.stringify(q.data);
  const save = useMutation({
    mutationFn: () => storesApi.saveCheckout(id, d!),
    onSuccess: (r) => { qc.setQueryData(SK.checkout(id), r); setD(r); toast.success(t('Save ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const set = (patch: Partial<CheckoutSettings>) => setD((x) => (x ? { ...x, ...patch } : x));
  const methods = d ? [d.payments.cod, d.payments.JAZZCASH, d.payments.EASYPAISA, d.payments.SAFEPAY].filter(Boolean).length : 0;

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Checkout aur payment')} loading={q.isLoading}
        meta={t('Customer order kaise kare aur paisay kaise de. Order seedha Online orders board par aata hai.')}
        actions={<>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>
        </>}
        stats={[
          { label: t('Payment tareeqe'), value: String(methods) },
          { label: t('COD'), value: d?.payments.cod ? t('Chalu') : t('Band') },
          { label: t('Advance'), value: d?.advance.mode === 'off' ? t('Band') : `${d?.advance.percent ?? 0}%` },
          { label: t('Login'), value: d?.loginMode === 'required' ? t('Zaroori') : d?.loginMode === 'optional' ? t('Marzi') : t('Bina login') },
        ]} />

      {!d ? <Skeleton className="h-96 rounded-2xl" /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card title={t('Payment ke tareeqe')} actions={<Link to={pay.data?.setupLink ?? '/online-store/payments'} className="text-[0.8125rem] font-semibold text-brand-700">{t('Naya jorein')}</Link>}>
            <div className="space-y-2">
              <Row icon={<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-50 text-success-700"><Banknote className="h-5 w-5" /></span>}
                title={t('Cash on Delivery (COD)')} text={t('Customer delivery par paisay de')}
                right={<Switch checked={d.payments.cod} onChange={(e) => set({ payments: { ...d.payments, cod: e.target.checked } })} aria-label="COD" />} />
              {(pay.data?.gateways ?? []).map((g) => {
                const key = g.code as 'SAFEPAY' | 'JAZZCASH' | 'EASYPAISA';
                return (
                  <Row key={g.code} icon={LOGO[g.code] ? <BrandLogo name={LOGO[g.code]} size="lg" /> : <CreditCard className="h-5 w-5" />}
                    title={<span className="flex items-center gap-2">{g.name}{g.env === 'sandbox' && <Badge size="xs" variant="warning">{t('Test')}</Badge>}</span>}
                    text={g.connected ? (g.methods.join(', ') || t('Jora hua hai')) : t('Abhi jora nahi')}
                    right={g.connected
                      ? <Switch checked={!!d.payments[key]} onChange={(e) => set({ payments: { ...d.payments, [key]: e.target.checked } })} aria-label={g.name} />
                      : <Link to={pay.data?.setupLink ?? '/online-store/payments'} className="text-[0.8125rem] font-semibold text-brand-700">{t('Jorein')}</Link>} />
                );
              })}
            </div>
          </Card>

          <Card title={t('COD ke qaide')}>
            <div className="space-y-4">
              <Select label={t('Advance kab maangein')} value={d.advance.mode} onChange={(e) => set({ advance: { ...d.advance, mode: e.target.value as CheckoutSettings['advance']['mode'] } })}
                options={[
                  { value: 'off', label: t('Kabhi nahi') },
                  { value: 'shop_rule', label: t('Sirf risky customer par (Online orders ka qaida)') },
                  { value: 'always_cod', label: t('Har COD order par') },
                ]} />
              {d.advance.mode !== 'off' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input type="number" label={t('Kitna advance (%)')} min={1} max={100} value={d.advance.percent} onChange={(e) => set({ advance: { ...d.advance, percent: Number(e.target.value) || 0 } })} />
                  <Input type="number" label={t('Itne se bare order par (Rs)')} min={0} value={d.advance.minOrder ?? ''} onChange={(e) => set({ advance: { ...d.advance, minOrder: e.target.value === '' ? null : Number(e.target.value) } })} />
                </div>
              )}
              <Input type="number" label={t('COD ki had (Rs)')} hint={t('Is se bara order sirf online payment se')} min={0} value={d.maxCodOrder ?? ''}
                onChange={(e) => set({ maxCodOrder: e.target.value === '' ? null : Number(e.target.value) })} />
              <Switch label={t('COD order ke baad "WhatsApp par confirm karein" button')} description={t('Customer khud confirm message bhejta hai, fake orders kam hote hain')}
                checked={d.codConfirmWhatsApp} onChange={(e) => set({ codConfirmWhatsApp: e.target.checked })} />
              {d.codConfirmWhatsApp && <Input label={t('WhatsApp number')} value={d.whatsappNumber ?? ''} placeholder="03001234567" onChange={(e) => set({ whatsappNumber: e.target.value || null })} />}
            </div>
          </Card>

          <Card title={t('Customer se kya poochein')}>
            <div className="space-y-3">
              <Select label={t('Email')} value={d.fields.email} options={REQ} onChange={(e) => set({ fields: { ...d.fields, email: e.target.value as Req } })} />
              <Select label={t('Suba (province)')} value={d.fields.province} options={REQ} onChange={(e) => set({ fields: { ...d.fields, province: e.target.value as Req } })} />
              <Select label={t('Postal code')} value={d.fields.postalCode} options={REQ} onChange={(e) => set({ fields: { ...d.fields, postalCode: e.target.value as Req } })} />
              <Select label={t('Qareeb ki nishani (landmark)')} value={d.fields.landmark} options={REQ.slice(0, 2)} onChange={(e) => set({ fields: { ...d.fields, landmark: e.target.value as 'hidden' | 'optional' } })} />
              <Switch label={t('Order note ka dabba')} checked={d.notes} onChange={(e) => set({ notes: e.target.checked })} />
              <Switch label={t('"Nayi sale ki khabar dein" ka nishan')} checked={d.marketingOptIn} onChange={(e) => set({ marketingOptIn: e.target.checked })} />
              <p className="text-[0.75rem] text-slate-500">{t('Naam, phone, address aur shehar hamesha poochte hain.')}</p>
            </div>
          </Card>

          <Card title={t('Order aur login')}>
            <div className="space-y-4">
              <Select label={t('Customer login')} value={d.loginMode} onChange={(e) => set({ loginMode: e.target.value as CheckoutSettings['loginMode'] })}
                options={[{ value: 'guest', label: t('Bina login order (behtar)') }, { value: 'optional', label: t('Login marzi se') }, { value: 'required', label: t('Login zaroori') }]} />
              <Input type="number" label={t('Kam se kam order (Rs)')} min={0} value={d.minOrder ?? ''} onChange={(e) => set({ minOrder: e.target.value === '' ? null : Number(e.target.value) })}
                hint={d.minOrder ? t('{{a}} se kam ka order nahi hoga', { a: rs(d.minOrder) }) : undefined} />
              <label className="block">
                <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">{t('Order ke baad shukriya ka message')}</span>
                <Textarea rows={3} value={d.thankYouMessage ?? ''} maxLength={500} onChange={(e) => set({ thankYouMessage: e.target.value || null })} placeholder={t('Shukriya! Hum jald aap se rabta karenge.')} />
              </label>
            </div>
          </Card>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Checkout — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Cart'), hint: t('Customer products chunta hai'), icon: ShoppingCart, color: '#2563eb' },
            { label: t('Checkout'), hint: t('Naam, phone, address'), icon: UserRound, color: '#7c3aed' },
            { label: t('Payment'), hint: t('COD ya online'), icon: CreditCard, color: '#ea580c' },
            { label: t('WhatsApp confirm'), hint: t('Order board par'), icon: MessageCircle, color: '#16a34a' },
          ]}
          steps={[
            { icon: CreditCard, color: '#ea580c', title: t('Online payment'), text: t('JazzCash, Easypaisa ya card pehle Payments page par jorein. Phir yahan chalu karein.') },
            { icon: ShieldAlert, color: '#dc2626', title: t('Risky COD'), text: t('Jo customer pehle parcel wapas kar chuka ho, us se advance maangein. Baqi COD par.') },
          ]} />
      )}
    </>
  );
}

function Row({ icon, title, text, right }: { icon: React.ReactNode; title: React.ReactNode; text: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-slate-200/80">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[0.875rem] font-semibold text-slate-900">{title}</p>
        <p className="truncate text-[0.75rem] text-slate-500">{text}</p>
      </div>
      {right}
    </div>
  );
}
