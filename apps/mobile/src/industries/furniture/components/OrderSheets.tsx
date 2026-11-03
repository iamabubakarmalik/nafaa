/** Sheets of one custom order (web CustomOrderDetailPage modals): final price, karigar, work done, and cancel. */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, ChipGroup, Input, MoneyInput, Sheet, Text, toast, useTheme } from '@/design';
import { PhotoField, type ImageDraft } from '@/modules/inventory/components/PhotoField';
import { carpentersApi, customOrdersApi, type FurnitureCustomOrder } from '../api';
import { FURNITURE_KEYS, refreshFurniture } from '../meta';

export function ApproveSheet({ o, open, onClose, onDone }: { o: FurnitureCustomOrder; open: boolean; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [price, setPrice] = useState<number | null>(o.quotedPrice);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setPrice(o.quotedPrice); }, [open, o.quotedPrice]);
  const save = async () => {
    if (!((price ?? 0) > 0)) { toast.error(t('Qeemat likhein')); return; }
    setBusy(true);
    try { await customOrdersApi.approve(o.id, price ?? 0); onDone(); } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Qeemat pakki karein')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Pakki karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm">{t('Customer ne qeemat maan li. Is ke baad qeemat nahi badlegi.')}</Text>
        <MoneyInput label={t('Final qeemat (Rs)')} value={price} onChangeValue={setPrice} size="xl" hint={t('Quotation {{quotedPrice}}', { quotedPrice: formatMoney(o.quotedPrice) })} />
      </View>
    </Sheet>
  );
}

export function KarigarSheet({ o, open, onClose, onDone }: { o: FurnitureCustomOrder; open: boolean; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const list = useQuery({ queryKey: [FURNITURE_KEYS.carpenters, 'active'], queryFn: () => carpentersApi.list({ active: true }), staleTime: 60_000, enabled: open });
  const [cid, setCid] = useState(o.carpenterId ?? '');
  const [shop, setShop] = useState(o.workshopLocation ?? '');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setCid(o.carpenterId ?? ''); setShop(o.workshopLocation ?? ''); } }, [open, o.carpenterId, o.workshopLocation]);
  const save = async () => {
    setBusy(true);
    try { await customOrdersApi.assignCarpenter(o.id, cid, shop.trim() || undefined); onDone(); } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  const items = list.data ?? [];
  return (
    <Sheet open={open} onClose={onClose} title={t('Karigar dein')} description={o.productType} footer={<Button fullWidth size="lg" loading={busy} disabled={!cid} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {!list.isLoading && !items.length ? <Text size="sm" tone="warning">{t('Pehle Karigar page par karigar daalein')}</Text> : <Text size="xs" tone="muted">{t('Kam kaam wala jaldi bana dega')}</Text>}
        <ChipGroup wrap value={cid} onChange={setCid} options={items.map((c) => ({ value: c.id, label: `${c.name}${c.activeProjects ? ` — ${t('{{n}} kaam', { n: c.activeProjects })}` : ''}` }))} />
        <Input label={t('Workshop')} value={shop} onChangeText={setShop} hint={t('Marzi hai')} />
      </View>
    </Sheet>
  );
}

export function ProgressSheet({ o, open, onClose, onDone }: { o: FurnitureCustomOrder; open: boolean; onClose: () => void; onDone: (pct: number) => void }) {
  const th = useTheme();
  const [pct, setPct] = useState(Math.min(o.progressPct + 25, 100));
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<ImageDraft[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setPct(Math.min(o.progressPct + 25, 100)); setNote(''); setPhotos([]); } }, [open, o.progressPct]);
  const save = async () => {
    setBusy(true);
    try { await customOrdersApi.updateProgress(o.id, { progressPct: pct, updateNote: note.trim() || undefined, progressPhotos: photos.map((p) => p.url) }); onDone(pct); } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Kaam kitna hua')} description={t('{{productType}} · abhi {{progressPct}}%', { productType: o.productType, progressPct: o.progressPct })}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{pct >= 100 ? t('Tayyar hai') : t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Text size="2xl" weight="bold" ltr>{pct}%</Text>
        <ChipGroup wrap value={String(pct)} onChange={(v) => setPct(Number(v))} options={[0, 10, 25, 50, 75, 90, 100].map((n) => ({ value: String(n), label: `${n}%` }))} />
        <Input label={t('Kya hua')} value={note} onChangeText={setNote} placeholder={t('Dhancha tayyar, polish baqi')} />
        <Text size="sm" weight="medium" tone="secondary">{t('Kaam ki photo — customer ko bhej sakte hain')}</Text>
        <PhotoField value={photos} onChange={setPhotos} max={10} />
      </View>
    </Sheet>
  );
}

export { refreshFurniture };
