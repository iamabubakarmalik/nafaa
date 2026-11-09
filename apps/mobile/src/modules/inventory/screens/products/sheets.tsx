/**
 * Products list sheets: filters and sort, quick rate change, the selection
 * bar with bulk actions (delete keeps products that were sold, with the
 * "MITAO" wipe for demo data like the web), and the guide.
 */

import { router } from 'expo-router';
import { Download, Eye, EyeOff, Star, StarOff, Tag, Trash2, X, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { belowCost, marginPct } from '@nafaa/core/inventory';
import { t, Trans } from '@/core/i18n';
import { enqueuePriceChange, OfflineRuleError } from '@/core/offline';
import { Badge, Button, Card, ChipGroup, IconButton, Input, MoneyInput, PressableScale, Row, Sheet, Text, toast, useTheme, Icon } from '@/design';
import type { Option } from '@/design';
import { productsApi, type BulkAction } from '../../api/products';
import type { CatalogFilters, CatalogItem, CatalogPage, CatalogSort } from '../../api/catalog';
import type { GuideStep, ProductsListConfig } from '../../industry/types';
import { useCostMask, useOnline, useRefreshInventory } from '../../lib/shared';

export const SORTS: Array<Option<CatalogSort>> = [
  { value: 'name', label: 'Naam (A–Z)' }, { value: 'new', label: 'Naye pehle' }, { value: 'old', label: 'Purane pehle' },
  { value: 'bestSelling', label: 'Zyada bikne wale' }, { value: 'slow', label: 'Kam bikne wale' }, { value: 'stockLow', label: 'Kam stock pehle' },
  { value: 'stockHigh', label: 'Zyada stock pehle' }, { value: 'priceHigh', label: 'Mehngay pehle' }, { value: 'priceLow', label: 'Sastay pehle' },
];
const COST_SORTS: Array<Option<CatalogSort>> = [{ value: 'value', label: 'Stock ki qeemat' }, { value: 'margin', label: 'Zyada profit wale' }];
const KIND_DEFAULT: Record<string, string> = { made: 'Khud banaya', bought: 'Khareed kar' };
const FACET_LABEL = { condition: 'Condition', etype: 'Product type', kind: 'Banaya ya khareeda' } as const;

/** Facet categories in tree order (parent, then its children), each with its depth. */
function categoryTree(list: CatalogPage['categories']) {
  const ids = new Set(list.map((c) => c.id));
  const kids = new Map<string | null, CatalogPage['categories']>();
  for (const c of list) {
    const parent = c.parentId && ids.has(c.parentId) ? c.parentId : null;
    kids.set(parent, [...(kids.get(parent) ?? []), c]);
  }
  const out: Array<CatalogPage['categories'][number] & { depth: number }> = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of kids.get(parent) ?? []) {
      if (out.length > list.length) return;
      out.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const th = useTheme();
  return <View style={{ gap: th.space(2) }}><Text size="sm" weight="semibold" tone="muted">{title}</Text>{children}</View>;
}

export function FilterSheet({ open, onClose, data, f, set, sort, setSort, config, costHidden, onClear }: {
  open: boolean; onClose: () => void; data?: CatalogPage; f: Omit<CatalogFilters, 'sort' | 'search'>;
  set: <K extends keyof Omit<CatalogFilters, 'sort' | 'search'>>(k: K, v: Omit<CatalogFilters, 'sort' | 'search'>[K]) => void;
  sort: CatalogSort; setSort: (s: CatalogSort) => void; config: ProductsListConfig; costHidden: boolean; onClear: () => void;
}) {
  const th = useTheme();
  const tr = <V extends string>(o: Array<Option<V>>) => o.map((x) => ({ ...x, label: t(x.label) }));
  const labelOf = (kind: 'condition' | 'etype' | 'kind', v: string) => config.facetLabels?.[kind]?.[v] ?? (kind === 'kind' ? KIND_DEFAULT[v] : undefined) ?? v;
  return (
    <Sheet open={open} onClose={onClose} title={t('Filters')} height={0.85}
      footer={<Row gap={2}><Button variant="secondary" style={{ flex: 1 }} onPress={() => { onClear(); onClose(); }}>{t('Filter hatayein')}</Button><Button style={{ flex: 1 }} onPress={onClose}>{t('Dekhein')}</Button></Row>}>
      <View style={{ gap: th.space(5) }}>
        <Group title={t('Sort')}>
          <ChipGroup wrap value={sort} onChange={setSort} options={tr([...SORTS, ...(costHidden ? [] : COST_SORTS), ...(config.sorts ?? [])])} />
        </Group>
        {(data?.categories.length ?? 0) > 0 && (
          <Group title={t('Category')}>
            <ChipGroup wrap value={f.categoryId ?? 'all'} onChange={(v) => set('categoryId', v === 'all' ? undefined : v)}
              options={[{ value: 'all', label: t('Sab') }, ...categoryTree(data!.categories).map((x) => ({
                value: x.id, label: `${x.depth ? `${'  '.repeat(x.depth)}└ ` : ''}${x.name}`, count: x.count,
              }))]} />
          </Group>
        )}
        {(data?.suppliers?.length ?? 0) > 0 && (
          <Group title={t('Supplier')}>
            <ChipGroup wrap value={f.supplierId ?? 'all'} onChange={(v) => set('supplierId', v === 'all' ? undefined : v)}
              options={[{ value: 'all', label: t('Sab') }, ...data!.suppliers!.map((x) => ({ value: x.id, label: x.id === 'none' ? t('Baghair supplier') : x.name, count: x.count }))]} />
          </Group>
        )}
        <Group title={t('Online')}>
          <ChipGroup wrap value={f.online ?? 'all'} onChange={(v) => set('online', v === 'all' ? undefined : (v as 'listed' | 'unlisted'))}
            options={[{ value: 'all', label: t('Sab') }, { value: 'listed', label: t('Online listed') }, { value: 'unlisted', label: t('Online nahi') }]} />
        </Group>
        {(data?.brands.length ?? 0) > 0 && (
          <Group title={t('Brand')}>
            <ChipGroup wrap value={f.brandId ?? 'all'} onChange={(v) => set('brandId', v === 'all' ? undefined : v)}
              options={[{ value: 'all', label: t('Sab') }, ...data!.brands.map((x) => ({ value: x.id, label: x.name, count: x.count }))]} />
          </Group>
        )}
        <Group title={t('Halat')}>
          <ChipGroup wrap value={f.active} onChange={(v) => set('active', v as CatalogFilters['active'])}
            options={[{ value: 'active', label: t('Chalu') }, { value: 'inactive', label: t('Band') }, { value: 'all', label: t('Sab') }]} />
        </Group>
        {(config.filters ?? []).map((key) => {
          if (key === 'tags') {
            return data?.tags.length ? (
              <Group key={key} title={t('Tag')}>
                <ChipGroup wrap value={f.tagId ?? 'all'} onChange={(v) => set('tagId', v === 'all' ? undefined : v)}
                  options={[{ value: 'all', label: t('Sab') }, ...data.tags.map((g) => ({ value: g.id, label: `#${g.name}`, count: g.count })), { value: 'none', label: t('Baghair tag') }]} />
              </Group>
            ) : null;
          }
          if (key === 'serial') {
            return (data?.facets.serial.tracked ?? 0) > 0 ? (
              <Group key={key} title={t('Serial')}>
                <ChipGroup wrap value={f.serial ?? 'all'} onChange={(v) => set('serial', v === 'all' ? undefined : (v as 'tracked' | 'mismatch'))}
                  options={[{ value: 'all', label: t('Sab') }, { value: 'tracked', label: t('Serial wale ({{tracked}})', { tracked: data!.facets.serial.tracked }) },
                    { value: 'mismatch', label: t('Ginti ghalat ({{mismatch}})', { mismatch: data!.facets.serial.mismatch }) }]} />
              </Group>
            ) : null;
          }
          const facet = key === 'kind' ? data?.facets.kinds : key === 'condition' ? data?.facets.conditions : data?.facets.etypes;
          if (!facet?.length) return null;
          return (
            <Group key={key} title={t(FACET_LABEL[key])}>
              <ChipGroup wrap value={(f[key] as string | undefined) ?? 'all'} onChange={(v) => set(key, (v === 'all' ? undefined : v) as never)}
                options={[{ value: 'all', label: t('Sab') }, ...facet.map((x) => ({ value: x.id, label: t(labelOf(key, x.id)), count: x.count }))]} />
            </Group>
          );
        })}
        <Group title={t('Raw material')}>
          <ChipGroup wrap value={f.kindOf ?? 'all'} onChange={(v) => set('kindOf', v === 'all' ? undefined : (v as 'raw' | 'sale'))}
            options={[{ value: 'all', label: t('Sab') }, { value: 'sale', label: t('Sirf bechne wale') }, { value: 'raw', label: t('Sirf raw material') }]} />
        </Group>
        <Group title={t('Khaas')}>
          <ChipGroup wrap value={f.featured ? 'yes' : 'all'} onChange={(v) => set('featured', v === 'yes' ? true : undefined)}
            options={[{ value: 'all', label: t('Sab') }, { value: 'yes', label: t('Sirf khaas') }]} />
        </Group>
        {!costHidden && (
          <Group title={t('Cost')}>
            <ChipGroup wrap value={f.noCost ? 'none' : 'all'} onChange={(v) => set('noCost', v === 'none' ? true : undefined)}
              options={[{ value: 'all', label: t('Sab') }, { value: 'none', label: t('Cost nahi likhi') }]} />
          </Group>
        )}
      </View>
    </Sheet>
  );
}

/** Quick rate change for one product; goes through the offline engine. */
export function PriceSheet({ item, onClose }: { item: CatalogItem | null; onClose: () => void }) {
  const th = useTheme();
  const { costHidden } = useCostMask();
  const refresh = useRefreshInventory();
  const [p, setP] = useState({ price: 0, costPrice: 0, wholesalePrice: null as number | null, creditPrice: null as number | null });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (item) setP({ price: item.price, costPrice: item.costPrice, wholesalePrice: item.wholesalePrice, creditPrice: item.creditPrice }); }, [item]);
  if (!item) return null;
  const m = marginPct(p.price, p.costPrice);
  const save = async () => {
    if (!(p.price > 0)) { toast.error(t('Bechne ki qeemat likhein')); return; }
    setBusy(true);
    try {
      await enqueuePriceChange(item.id, { price: p.price, wholesalePrice: p.wholesalePrice, creditPrice: p.creditPrice, ...(costHidden ? {} : { costPrice: p.costPrice }) });
      toast.success(t('{{name}}: rate save ho gaya', { name: item.name }));
      void refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof OfflineRuleError ? e.message : t('Save nahi hua'));
    } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!item} onClose={onClose} title={item.name} description={t('Rate badlein')}
      footer={<Button fullWidth loading={busy} onPress={() => void save()}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Retail price')} value={p.price || null} onChangeValue={(v) => setP({ ...p, price: v ?? 0 })} size="lg" autoFocus
          hint={!costHidden && m !== null ? t('Margin {{value}}%', { value: m.toFixed(1) }) : undefined} />
        {!costHidden && <MoneyInput label={t('Cost price (Company price)')} value={p.costPrice || null} onChangeValue={(v) => setP({ ...p, costPrice: v ?? 0 })} />}
        <Row gap={2}>
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Wholesale')} value={p.wholesalePrice} placeholder={String(p.price || '')} onChangeValue={(v) => setP({ ...p, wholesalePrice: v && v > 0 ? v : null })} />
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Credit (udhaar)')} value={p.creditPrice} placeholder={String(p.price || '')} onChangeValue={(v) => setP({ ...p, creditPrice: v && v > 0 ? v : null })} />
        </Row>
        {!costHidden && (belowCost(p.wholesalePrice, p.costPrice) || belowCost(p.creditPrice, p.costPrice) || belowCost(p.price, p.costPrice)) && (
          <Card tone="warning"><Text size="sm">{t('Cost se sasta bik raha hai — ghata hoga')}</Text></Card>
        )}
      </View>
    </Sheet>
  );
}

/** Selection bar over the list with the web's bulk actions. */
export function BulkBar({ ids, can, onDone, onClear, onExport }: {
  ids: string[]; can: { edit: boolean; delete: boolean }; onDone: () => void; onClear: () => void; onExport: () => void;
}) {
  const th = useTheme();
  const online = useOnline();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withSales, setWithSales] = useState<string[]>([]);
  const [word, setWord] = useState('');

  const run = async (action: BulkAction, done: string) => {
    if (!online) { toast.warning(t('Bulk action ke liye internet chahiye')); return; }
    setBusy(action);
    try { await productsApi.bulkAction(ids, action); toast.success(done); onDone(); } catch { toast.error(t('Nahi hua')); } finally { setBusy(null); }
  };
  // One by one, so products with sales history are switched off instead of wiped with their bills.
  const remove = async () => {
    setBusy('delete');
    const res = await Promise.allSettled(ids.map((id) => productsApi.remove(id, false)));
    const offIds = ids.filter((_, i) => { const r = res[i]; return r.status === 'fulfilled' && r.value?.softDeleted; });
    const gone = res.filter((r) => r.status === 'fulfilled' && !r.value?.softDeleted).length;
    const failed = res.length - offIds.length - gone;
    if (gone) toast.success(t('{{gone}} mita diye', { gone }));
    if (failed) toast.error(t('{{failed}} nahi hue', { failed }));
    setBusy(null); setConfirmOpen(false);
    if (offIds.length) { setWithSales(offIds); setWord(''); } else onDone();
  };
  const wipe = async () => {
    setBusy('wipe');
    try {
      const r = await productsApi.bulkAction(withSales, 'delete');
      toast.success(t('{{count}} cheezein sale samet mita di{{value}}', { count: withSales.length, value: r?.removedEmptySales ? t(' · {{removedEmptySales}} khali bill bhi hate', { removedEmptySales: r.removedEmptySales }) : '' }));
    } catch { toast.error(t('Nahi hua')); }
    setBusy(null); setWithSales([]); onDone();
  };

  const Action = ({ icon, label, onPress, danger }: { icon: LucideIcon; label: string; onPress: () => void; danger?: boolean }) => (
    <PressableScale onPress={onPress} disabled={!!busy} haptic="tap" accessibilityLabel={label}
      style={{ alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 4, opacity: busy ? 0.5 : 1 }}>
      <Icon icon={icon} size={20} color={danger ? th.colors.danger.soft : th.colors.textInverse} />
      <Text size="2xs" weight="semibold" color={danger ? th.colors.danger.soft : th.colors.textInverse}>{label}</Text>
    </PressableScale>
  );

  return (
    <>
      <View style={{ position: 'absolute', start: th.space(3), end: th.space(3), bottom: th.space(3), borderRadius: th.radius('2xl'), backgroundColor: th.colors.text,
        paddingVertical: th.space(2), paddingHorizontal: th.space(2), gap: th.space(1), shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, elevation: 12 }}>
        <Row justify="between">
          <Text size="sm" weight="bold" color={th.colors.textInverse} style={{ paddingStart: th.space(2) }}>{t('{{count}} chuni', { count: ids.length })}</Text>
          <IconButton icon={X} label={t('Chunna khatam')} variant="inverse" size="sm" onPress={onClear} />
        </Row>
        <Row justify="around" wrap>
          {can.edit && <Action icon={Eye} label={t('Chalu')} onPress={() => void run('activate', t('{{count}} products chalu kar diye', { count: ids.length }))} />}
          {can.edit && <Action icon={EyeOff} label={t('Band')} onPress={() => void run('deactivate', t('{{count}} products band kar diye', { count: ids.length }))} />}
          {can.edit && <Action icon={Star} label={t('Khaas')} onPress={() => void run('feature', t('{{count}} products khaas bana diye', { count: ids.length }))} />}
          {can.edit && <Action icon={StarOff} label={t('Aam')} onPress={() => void run('unfeature', t('{{count}} products aam kar diye', { count: ids.length }))} />}
          <Action icon={Tag} label={t('Labels')} onPress={() => router.push({ pathname: '/barcode-labels', params: { productIds: JSON.stringify(ids) } } as never)} />
          <Action icon={Download} label={t('CSV')} onPress={onExport} />
          {can.delete && <Action icon={Trash2} label={t('Mitayein')} danger onPress={() => (online ? setConfirmOpen(true) : toast.warning(t('Bulk action ke liye internet chahiye')))} />}
        </Row>
      </View>
      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('{{count}} cheezein mitayein?', { count: ids.length })}
        description={t('Jin ki kabhi sale nahi hui woh mit jayengi. Jin ki sale ho chuki hai woh sirf band hongi, taake purane bill aur hisaab salamat rahein.')}
        footer={<Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => setConfirmOpen(false)}>{t('Rehne dein')}</Button>
          <Button variant="danger" style={{ flex: 1 }} loading={busy === 'delete'} onPress={() => void remove()}>{t('Haan, mitayein')}</Button>
        </Row>}>
        <Text size="sm" tone="muted">{t('Yeh wapas nahi hoga.')}</Text>
      </Sheet>
      <Sheet open={withSales.length > 0} onClose={() => { setWithSales([]); onDone(); }} title={t('{{count}} cheezon ki sale ho chuki hai', { count: withSales.length })}
        description={t('Hisaab bachane ke liye inhein mitaya nahi, sirf band kar diya hai. Ab yeh POS par nahi dikhengi.')}
        footer={<View style={{ gap: th.space(2) }}>
          <Button variant="secondary" fullWidth onPress={() => { setWithSales([]); onDone(); }}>{t('Theek hai, band hi rehne dein')}</Button>
          <Button variant="danger" fullWidth disabled={word.trim().toUpperCase() !== 'MITAO'} loading={busy === 'wipe'} onPress={() => void wipe()}>{t('Sale samet mitayein')}</Button>
        </View>}>
        <View style={{ gap: th.space(3) }}>
          <Card tone="warning">
            <Text size="sm"><Trans text="Agar yeh {{demo}} ki cheezein thin, to inki sale bhi mita sakte hain. Inke bill ki lines hat jayengi, aur jo bill khali ho jayen woh bhi. Asal dukaan ka data ho to mat mitayein." values={{ demo: <Text size="sm" weight="bold">{t('demo ya test')}</Text> }} /></Text>
          </Card>
          {/* i18n-ignore: the confirmation word is typed as is */}
          <Input label={<Trans text="Pakka karne ke liye {{word}} likhein" values={{ word: 'MITAO' }} />} value={word} onChangeText={setWord} placeholder="MITAO" autoCapitalize="characters" ltr />
        </View>
      </Sheet>
    </>
  );
}

export function GuideSheet({ open, onClose, extra }: { open: boolean; onClose: () => void; extra?: GuideStep[] }) {
  const th = useTheme();
  const steps: Array<{ title: string; text: string }> = [
    { title: 'Maal daalein', text: '"Naya" se ek cheez, ya Excel se sab ek saath. Barcode scan karein — nahi mila to wahin se nayi ban jati hai.' },
    { title: 'Search', text: 'Naam, SKU, barcode ya model likhein. Category, brand aur halat ke filter upar hain — ginti saath likhi hai.' },
    { title: 'Kam aur khatam', text: 'Upar ki pattiyan dabayein: Kam, Khatam, Nahi bik raha. Peela dabba batata hai kya mangwana hai.' },
    { title: 'Stock badlein', text: 'Card par stock ka number ya "+ Stock" dabayein. Daalein, nikaalein ya ginti — wajah ke saath record banta hai.' },
    { title: 'Ek saath kaam', text: 'Cards chunein, phir neeche kaali patti se chalu/band, khaas, labels, CSV ya mitana.' },
    { title: 'Analytics', text: 'Kitna paisa stock mein laga, kya zyada bikta, kya pada hai, kya jaldi khatam hoga.' },
    ...(extra ?? []),
  ];
  return (
    <Sheet open={open} onClose={onClose} title={t('Maal — aasaan tareeqa')} description={t('{{count}} cheezein, bas itna yaad rakhein', { count: steps.length })}>
      <View style={{ gap: th.space(2) }}>
        {steps.map((s, i) => (
          <Card key={s.title}>
            <Row gap={3} align="start">
              <Badge tone="brand" solid>{String(i + 1)}</Badge>
              <View style={{ flex: 1, gap: 2 }}>
                <Text size="sm" weight="bold">{t(s.title)}</Text>
                <Text size="sm" tone="muted">{t(s.text)}</Text>
              </View>
            </Row>
          </Card>
        ))}
        <Text size="xs" tone="muted">{t('Row ko baayen/daayen kheenchein: Stock, Rate, Badlein, Hatayein. Dabaye rakhein to chunna shuru.')}</Text>
      </View>
    </Sheet>
  );
}
