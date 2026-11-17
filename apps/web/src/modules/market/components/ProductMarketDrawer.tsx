/**
 * One product's Market listing: public name, description, photos, Market
 * price (blank = POS price), compare-at price, Market category and whether
 * it is listed. Stock is read from the POS and only shown here.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Package, Save } from 'lucide-react';
import { Alert, Badge, Button, Drawer, Input, Select, Skeleton, Switch, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { t } from '@core/i18n';
import { errorText, marketApi, type MarketGateConfig } from '../api/market.api';
import { pickLabel } from '../hooks/useMarket';
import { ImageList } from './ImageFields';

interface Form {
  publicName: string;
  publicDescription: string;
  price: string;
  compareAtPrice: string;
  marketplaceCategory: string;
  publicImages: string[];
  isAvailable: boolean;
}

export function ProductMarketDrawer({ productId, onClose, canEdit, gate }: {
  productId: string | null; onClose: () => void; canEdit: boolean; gate?: MarketGateConfig;
}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['market', 'product', productId], queryFn: () => marketApi.products.get(productId!), enabled: !!productId });
  const p = q.data;
  const [f, setF] = useState<Form | null>(null);

  useEffect(() => {
    if (!p) { setF(null); return; }
    const custom = Number(p.publicPrice) > 0 && Number(p.publicPrice) !== Number(p.productPrice);
    setF({
      publicName: p.publicName ?? p.productName,
      publicDescription: p.publicDescription ?? '',
      price: custom ? String(p.publicPrice) : '',
      compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
      marketplaceCategory: p.marketplaceCategory ?? '',
      publicImages: p.publicImages ?? [],
      isAvailable: p.isAvailable !== false,
    });
  }, [p]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => (x ? { ...x, [k]: v } : x));

  const save = useMutation({
    mutationFn: async (listAfter?: boolean) => {
      if (!p || !f) return;
      await marketApi.products.update(p.productId, {
        publicName: f.publicName.trim() || p.productName,
        publicDescription: f.publicDescription,
        // Blank = follow the POS price (stored as 0).
        publicPrice: f.price.trim() === '' ? 0 : Number(f.price),
        compareAtPrice: f.compareAtPrice.trim() === '' ? null : Number(f.compareAtPrice),
        marketplaceCategory: f.marketplaceCategory,
        publicImages: f.publicImages,
        isAvailable: f.isAvailable,
      });
      if (listAfter === true) await marketApi.products.publish(p.productId);
      if (listAfter === false) await marketApi.products.unpublish(p.productId);
    },
    onSuccess: (_d, listAfter) => {
      toast.success(listAfter === true ? t('Product online ho gaya') : listAfter === false ? t('Product online se hata diya') : t('Save ho gaya'));
      qc.invalidateQueries({ queryKey: ['market'] });
      onClose();
    },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });

  const priceError = f && f.price.trim() !== '' && !(Number(f.price) > 0) ? t('Qeemat 0 se zyada') : undefined;
  const compareError = f && f.compareAtPrice.trim() !== '' && p && Number(f.compareAtPrice) <= (f.price.trim() === '' ? p.productPrice : Number(f.price))
    ? t('Purani qeemat asal qeemat se zyada honi chahiye') : undefined;
  const invalid = !!priceError || !!compareError;

  const categories = gate?.filters ?? [];

  return (
    <Drawer open={!!productId} onClose={onClose} size="lg" icon={<Package className="h-5 w-5" />}
      title={p?.productName ?? t('Product')}
      description={p ? t('POS qeemat {{price}} · stock {{stock}}', { price: formatPKR(p.productPrice), stock: p.productStock }) : undefined}
      footer={canEdit && p && f ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {p.isListedOnMarketplace
            ? <Button variant="ghost" onClick={() => save.mutate(false)} disabled={save.isPending || invalid}>{t('Save aur online se hatayein')}</Button>
            : <Button variant="secondary" onClick={() => save.mutate(true)} disabled={save.isPending || invalid}>{t('Save aur online karein')}</Button>}
          <Button onClick={() => save.mutate(undefined)} loading={save.isPending} disabled={invalid} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>
        </div>
      ) : undefined}>
      {!f || !p ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-24" /><Skeleton className="h-20" /></div> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {p.isListedOnMarketplace ? <Badge variant="success" dot>{t('Online')}</Badge> : <Badge variant="default">{t('Online nahi')}</Badge>}
            {p.productStock <= 0 && <Badge variant="danger">{t('Stock khatam')}</Badge>}
          </div>

          <Input label={t('Market par naam')} value={f.publicName} disabled={!canEdit} onChange={(e) => set('publicName', e.target.value)} hint={t('Khali chhorein to POS wala naam')} />
          <Textarea label={t('Tafseel')} rows={4} value={f.publicDescription} disabled={!canEdit} onChange={(e) => set('publicDescription', e.target.value)} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('Market qeemat')} inputMode="decimal" placeholder={String(p.productPrice)} value={f.price} error={priceError} disabled={!canEdit}
              onChange={(e) => set('price', e.target.value)} hint={t('Khali = POS qeemat ({{price}})', { price: formatPKR(p.productPrice) })} />
            <Input label={t('Purani qeemat (kati hui)')} inputMode="decimal" value={f.compareAtPrice} error={compareError} disabled={!canEdit}
              onChange={(e) => set('compareAtPrice', e.target.value)} hint={t('Sale dikhane ke liye, warna khali')} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {categories.length ? (
              <Select label={t('Market category')} value={f.marketplaceCategory} disabled={!canEdit} onChange={(e) => set('marketplaceCategory', e.target.value)}
                options={[{ value: '', label: t('Chunein') }, ...categories.map((c) => ({ value: c.id, label: pickLabel(c.label) })),
                  ...(f.marketplaceCategory && !categories.some((c) => c.id === f.marketplaceCategory) ? [{ value: f.marketplaceCategory, label: f.marketplaceCategory }] : [])]} />
            ) : (
              <Input label={t('Market category')} value={f.marketplaceCategory} disabled={!canEdit} onChange={(e) => set('marketplaceCategory', e.target.value)} />
            )}
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[0.75rem] text-slate-500">{t('Stock (POS se)')}</p>
              <p className="text-lg font-bold tabular-nums text-slate-900">{p.productStock}{p.productUnit ? <span className="ms-1 text-sm font-normal text-slate-500">{p.productUnit}</span> : null}</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{t('Tasveerein')}</p>
            <ImageList values={f.publicImages} onChange={(v) => set('publicImages', v)} max={8} disabled={!canEdit} />
            {p.usingPosImages && <p className="mt-1.5 text-[0.75rem] text-slate-500">{t('Abhi POS wali tasveerein dikh rahi hain.')}</p>}
          </div>

          <Switch checked={!f.isAvailable} disabled={!canEdit} onChange={(e) => set('isAvailable', !e.target.checked)}
            label={t('Online band rakhein')} description={t('Stock hone ke bawajood Market par "Abhi nahi milta" dikhe')} />

          <Alert tone="info">{t('Stock hamesha POS se aata hai. POS me bechne ya maal aane par Market khud update hota hai.')}</Alert>
        </div>
      )}
    </Drawer>
  );
}
