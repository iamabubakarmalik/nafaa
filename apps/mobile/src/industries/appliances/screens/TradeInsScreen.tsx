/** Old appliances taken in trade (web TradeInsPage): held, sold, scrapped, returned; record one, edit, scrap, return to the customer, sell on. Needs the server. */

import { Plus, Recycle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, EmptyState, Input, ListRow, ListTemplate, MoneyInput, Row, Sheet, StatTile, StatusPill, Text, confirm, toast, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { MethodChips, OfflineNote, errText, opt, useDeskOnline } from '../../_shared/trade/desk';
import { asPages, tradeInsApi, type ApplianceTradeIn, type TradeInCondition, type TradeInView } from '../api';
import { KEYS, TRADE_IN_CONDITIONS, conditionLabel, dayOnly, refreshAppliances, tradeInStatus } from '../meta';

const VIEWS: Array<{ value: TradeInView; label: string }> = [
  { value: 'HELD', label: t('Dukaan me') }, { value: 'SOLD', label: t('Bech diye') }, { value: 'SCRAPPED', label: t('Kabar') }, { value: 'RETURNED', label: t('Customer ko wapas') }, { value: 'all', label: t('Sab') },
];
const LIMIT = 25;

export function TradeInsScreen() {
  const th = useTheme();
  const manage = usePermission()(P.RETURNS_CREATE);
  const { guard } = useDeskOnline('appliancesDesk');
  const [view, setView] = useState<TradeInView>('HELD');
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<ApplianceTradeIn | 'new' | null>(null);
  const [sell, setSell] = useState<ApplianceTradeIn | null>(null);
  const q = search.trim();
  const list = usePaged([KEYS.tradeIn, 'page', view, q], (page) => tradeInsApi.page({ view, search: q || undefined, page, limit: LIMIT }).then((r) => ({ ...r, page: r.page, pages: Math.max(r.totalPages, 1) })));
  const counts = list.first?.counts;

  const setStatus = async (x: ApplianceTradeIn, status: 'SCRAPPED' | 'RETURNED') => {
    if (!(await confirm({ title: status === 'SCRAPPED' ? t('Kabar me daalein?') : t('Customer ko wapas?'), confirmLabel: t('Haan'), tone: 'danger' }))) return;
    try { await tradeInsApi.setStatus(x.id, status); refreshAppliances([KEYS.tradeIn]); toast.success(t('Halat badal gayi')); } catch (e) { toast.error(errText(e, t('Nahi hua'))); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Recycle} tone="warning" label={t('Dukaan me')} loading={list.loading} value={String(counts?.HELD?.count ?? 0)} hint={formatMoney(counts?.HELD?.value ?? 0)} onPress={() => setView('HELD')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Recycle} tone="success" label={t('Bech diye')} loading={list.loading} value={String(counts?.SOLD?.count ?? 0)} onPress={() => setView('SOLD')} />
      </Row>
      <ChipGroup value={view} onChange={(v) => setView(v as TradeInView)} style={{ marginHorizontal: -th.space(4) }} options={VIEWS} />
      <OfflineNote feature="appliancesDesk" />
    </View>
  );
  return (
    <>
      <ListTemplate<ApplianceTradeIn>
        title={t('Old items')} grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Code, brand ya model…') }}
        summary={header} data={list.items} loading={list.loading} error={list.error} onRetry={list.refetch} refreshing={list.refreshing} onRefresh={list.refetch} onEndReached={list.loadMore} keyExtractor={(x) => x.id}
        renderItem={({ item: x }) => {
          const st = tradeInStatus(x.status);
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <ListRow icon={Recycle} iconTone={st.tone} onPress={manage && x.status === 'HELD' ? () => setEdit(x) : undefined} chevron={manage && x.status === 'HELD'}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{x.description}</Text><StatusPill tone={st.tone}>{st.label}</StatusPill></Row>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone="muted" numberOfLines={1}>{[x.code, x.brand, x.model, conditionLabel(x.condition)].filter(Boolean).join(' · ')}</Text>
                  <Row gap={1} wrap>
                    <Badge>{dayOnly(x.createdAt)}</Badge>
                    {x.customer && <Badge tone="info">{x.customer.name}</Badge>}
                    {x.sale && <Badge>{t('Bill {{saleNumber}}', { saleNumber: x.sale.saleNumber })}</Badge>}
                    {x.resale && <Badge tone="success">{t('Bika {{amount}}', { amount: formatMoney(x.resale.total) })}</Badge>}
                  </Row>
                  {manage && x.status === 'HELD' && (
                    <Row gap={2} style={{ marginTop: 4 }}>
                      <Button size="sm" variant="soft" onPress={() => setSell(x)}>{t('Bech dein')}</Button>
                      <Button size="sm" variant="ghost" onPress={() => void setStatus(x, 'SCRAPPED')}>{t('Kabar')}</Button>
                      <Button size="sm" variant="ghost" onPress={() => void setStatus(x, 'RETURNED')}>{t('Wapas')}</Button>
                    </Row>
                  )}
                </View>}
                trailing={<Text size="sm" weight="bold" ltr>{formatMoney(x.value)}</Text>} />
            </View>
          );
        }}
        empty={<EmptyState icon={Recycle} title={q ? t('Koi nahi mila') : t('Abhi koi purana saman nahi')} message={t('Customer purana AC, fridge ya washing machine de to yahan likhein — qeemat naye bill se kat jati hai.')} />}
        fab={manage ? { icon: Plus, label: t('Purana saman liya'), onPress: () => guard(() => setEdit('new')) } : undefined}
      />
      <TradeInSheet item={edit} onClose={() => setEdit(null)} />
      <SellSheet item={sell} onClose={() => setSell(null)} />
    </>
  );
}

/** Records or edits an old unit; also used from the counter. */
export function TradeInSheet({ item, customerId, onClose }: { item: ApplianceTradeIn | 'new' | null; customerId?: string | null; onClose: () => void }) {
  const th = useTheme();
  const open = item !== null;
  const cur = item && item !== 'new' ? item : null;
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState<TradeInCondition | ''>('');
  const [value, setValue] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName(cur?.description ?? ''); setBrand(cur?.brand ?? ''); setModel(cur?.model ?? ''); setCondition(cur?.condition ?? ''); setValue(cur ? Number(cur.value) : null); setTouched(false);
  }, [open, cur]);
  const errors = { name: name.trim().length < 2 ? t('Kya liya — maslan: purana AC 1.5 ton') : undefined, value: !((value ?? 0) > 0) ? t('Kitne ka liya — ye bill se katega') : undefined };
  const run = async () => {
    setTouched(true);
    if (errors.name || errors.value) return;
    setBusy(true);
    try {
      const body = { description: name.trim(), brand: opt(brand), model: opt(model), condition: condition || undefined, value: value ?? 0 };
      const x = cur ? await tradeInsApi.update(cur.id, body) : await tradeInsApi.create({ ...body, customerId: customerId ?? undefined });
      refreshAppliances([KEYS.tradeIn]);
      toast.success(cur ? t('Save ho gaya') : t('{{code}} likh liya — checkout par Trade-in me chunein', { code: x.code }));
      onClose();
    } catch (e) { toast.error(errText(e, t('Purana saman nahi likha'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Customer ne purana saman diya')} description={t('Tay ki hui qeemat naye bill se kat jayegi — checkout par Trade-in chunein')}
      footer={<Button fullWidth size="lg" icon={Recycle} loading={busy} onPress={() => void run()}>{t('Likh lein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Kya liya')} value={name} onChangeText={setName} placeholder={t('Purana AC 1.5 ton, fridge, washing machine')} error={touched ? errors.name : undefined} />
        <Input label={t('Brand')} value={brand} onChangeText={setBrand} placeholder={t('Haier, Dawlance, Gree')} />
        <Input label={t('Model')} value={model} onChangeText={setModel} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Halat')}</Text>
        <ChipGroup wrap value={condition} onChange={(v) => setCondition(v as TradeInCondition)} options={TRADE_IN_CONDITIONS.map((c) => ({ value: c.value, label: t(c.label) }))} />
        <MoneyInput label={t('Qeemat')} value={value} onChangeValue={setValue} placeholder="15000" error={touched ? errors.value : undefined} hint={(value ?? 0) > 0 ? t('{{amount}} bill se katega', { amount: formatMoney(value ?? 0) }) : t('Jitna bill se kam karna hai')} />
      </View>
    </Sheet>
  );
}

function SellSheet({ item, onClose }: { item: ApplianceTradeIn | null; onClose: () => void }) {
  const th = useTheme();
  const [price, setPrice] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [buyer, setBuyer] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (item) { setPrice(null); setMethod('CASH'); setBuyer(''); } }, [item]);
  const run = async () => {
    if (!item) return;
    setBusy(true);
    try { const r = await tradeInsApi.sell(item.id, { price: price ?? 0, paymentMethod: method, buyer: opt(buyer) }); refreshAppliances([KEYS.tradeIn], true); toast.success(r.saleNumber ? t('Bik gaya — bill {{n}}', { n: r.saleNumber }) : t('Bik gaya')); onClose(); }
    catch (e) { toast.error(errText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!item} onClose={onClose} title={t('Purana saman bechein')} description={item ? `${item.code} · ${item.description}` : undefined}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} disabled={!((price ?? 0) > 0)} onPress={() => void run()}>{t('Bech dein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Bechne ki qeemat')} value={price} onChangeValue={setPrice} size="xl" />
        <Input label={t('Kis ko')} value={buyer} onChangeText={setBuyer} placeholder={t('Marzi hai')} />
        <MethodChips value={method} onChange={setMethod} />
      </View>
    </Sheet>
  );
}
