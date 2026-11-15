/**
 * Create or edit a Market offer: a coupon code or a Sale for the whole shop,
 * with percent, fixed or free-delivery Discount, limits and dates.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Segmented, Textarea } from '@/design-system/components';
import { Field, NumberInput } from '@modules/organization/settings/components/SettingsBlocks';
import { t } from '@core/i18n';
import { errorText, marketApi, type MarketOffer, type OfferInput, type PromoDiscountType } from '../api/market.api';
import { num } from '../hooks/useMarket';

const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export function OfferModal({ offer, open, onClose, shopId }: { offer: MarketOffer | null; open: boolean; onClose: () => void; shopId?: string }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<'COUPON' | 'FLASH_SALE'>('COUPON');
  const [f, setF] = useState({
    title: '', description: '', couponCode: '', discountType: 'PERCENT' as PromoDiscountType, discountValue: 10,
    maxDiscount: 0, minOrderAmount: 0, usageLimit: 0, startsAt: '', endsAt: '',
  });
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTried(false);
    const now = new Date();
    setKind(offer?.type === 'FLASH_SALE' ? 'FLASH_SALE' : 'COUPON');
    setF({
      title: offer?.title ?? '', description: offer?.description ?? '', couponCode: offer?.couponCode ?? '',
      discountType: offer?.discountType ?? 'PERCENT', discountValue: offer ? num(offer.discountValue) : 10,
      maxDiscount: num(offer?.maxDiscount), minOrderAmount: num(offer?.minOrderAmount), usageLimit: offer?.usageLimit ?? 0,
      startsAt: toLocal(offer ? new Date(offer.startsAt) : now),
      endsAt: toLocal(offer ? new Date(offer.endsAt) : new Date(now.getTime() + 7 * 86_400_000)),
    });
  }, [open, offer]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const errors = {
    title: !f.title.trim() ? t('Naam likhein') : undefined,
    couponCode: kind === 'COUPON' && !/^[A-Za-z0-9_-]{3,20}$/.test(f.couponCode.trim()) ? t('3 se 20 harf, sirf angrezi harf aur number') : undefined,
    discountValue: f.discountType !== 'FREE_SHIPPING' && !(f.discountValue > 0) ? t('Discount 0 se zyada') : f.discountType === 'PERCENT' && f.discountValue > 90 ? t('90% se zyada nahi') : undefined,
    endsAt: f.startsAt && f.endsAt && new Date(f.endsAt) <= new Date(f.startsAt) ? t('Khatam hone ka waqt shuru se baad ho') : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);

  const save = useMutation({
    mutationFn: () => {
      const body: OfferInput = {
        type: kind, scope: 'SHOP', title: f.title.trim(), description: f.description.trim() || undefined,
        couponCode: kind === 'COUPON' ? f.couponCode.trim().toUpperCase() : undefined,
        discountType: f.discountType, discountValue: f.discountType === 'FREE_SHIPPING' ? 0 : f.discountValue,
        maxDiscount: f.maxDiscount || undefined, minOrderAmount: f.minOrderAmount || undefined, usageLimit: f.usageLimit || undefined,
        startsAt: new Date(f.startsAt).toISOString(), endsAt: new Date(f.endsAt).toISOString(),
        isFlashSale: kind === 'FLASH_SALE',
      };
      return offer ? marketApi.offers.update(offer.id, body) : marketApi.offers.create({ ...body, status: 'ACTIVE', shopId });
    },
    onSuccess: () => {
      toast.success(offer ? t('Offer update ho gaya') : t('Offer chalu ho gaya'));
      qc.invalidateQueries({ queryKey: ['market', 'offers'] });
      onClose();
    },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });
  const submit = () => { setTried(true); if (!invalid) save.mutate(); };
  const err = (k: keyof typeof errors) => (tried ? errors[k] : undefined);

  return (
    <Modal open={open} onClose={onClose} size="lg" title={offer ? t('Offer badlein') : t('Naya offer')}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>{t('Wapas')}</Button><Button onClick={submit} loading={save.isPending}>{t('Save')}</Button></div>}>
      <div className="space-y-3">
        <Segmented value={kind} onChange={setKind} label={t('Offer ki qisam')}
          items={[{ value: 'COUPON', label: t('Coupon code') }, { value: 'FLASH_SALE', label: t('Sale (sab ke liye)') }]} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Offer ka naam')} placeholder={t('Masalan: Eid Sale')} value={f.title} error={err('title')} onChange={(e) => set('title', e.target.value)} autoFocus />
          {kind === 'COUPON' && <Input label={t('Coupon code')} placeholder="EID20" value={f.couponCode} error={err('couponCode')} onChange={(e) => set('couponCode', e.target.value.toUpperCase())} className="dir-ltr uppercase" />}
        </div>
        <Textarea label={t('Note (customer ko dikhega)')} rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} />
        <Segmented value={f.discountType} onChange={(v) => set('discountType', v)} label={t('Discount')}
          items={[{ value: 'PERCENT', label: t('% Discount') }, { value: 'FIXED', label: t('Rs Discount') }, { value: 'FREE_SHIPPING', label: t('Free delivery') }]} />
        <div className="grid gap-3 sm:grid-cols-2">
          {f.discountType !== 'FREE_SHIPPING' && (
            <Field label={t('Discount')} error={err('discountValue')}>
              <NumberInput value={f.discountValue} onChange={(v) => set('discountValue', v)} min={0} step={f.discountType === 'PERCENT' ? 5 : 50} {...(f.discountType === 'PERCENT' ? { suffix: '%' } : { prefix: 'Rs' })} />
            </Field>
          )}
          {f.discountType === 'PERCENT' && (
            <Field label={t('Zyada se zyada Discount')} hint={t('0 = koi had nahi')}><NumberInput value={f.maxDiscount} onChange={(v) => set('maxDiscount', v)} min={0} step={50} prefix="Rs" /></Field>
          )}
          <Field label={t('Kam se kam order')} hint={t('0 = koi had nahi')}><NumberInput value={f.minOrderAmount} onChange={(v) => set('minOrderAmount', v)} min={0} step={100} prefix="Rs" /></Field>
          <Field label={t('Kitni baar istemal')} hint={t('0 = koi had nahi')}><NumberInput value={f.usageLimit} onChange={(v) => set('usageLimit', v)} min={0} step={10} /></Field>
          <Input type="datetime-local" label={t('Shuru')} value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
          <Input type="datetime-local" label={t('Khatam')} value={f.endsAt} error={err('endsAt')} onChange={(e) => set('endsAt', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
