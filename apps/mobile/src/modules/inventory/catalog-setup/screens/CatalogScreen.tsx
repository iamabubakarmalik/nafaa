/**
 * Catalog showroom (same as the web catalog page): the shop's items with
 * pictures and prices, no cost, to show a customer at the counter or share.
 * Search, category chips, price bands, in-stock and featured filters, sort,
 * cards or list. A pick list (kept on this phone) collects what the customer
 * wants and goes out on WhatsApp; the filtered catalog can be shared as text
 * or printed as a photo catalog / PDF. Works offline from the phone's products.
 */

import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ArrowDownWideNarrow, Check, FileDown, LayoutGrid, List as ListIcon, Minus, Plus, Printer, Share2, ShoppingBag, Star, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { whatsappLink } from '@nafaa/core/inventory';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { useReceiptSetup } from '@/core/receipt';
import {
  Amount, Badge, Button, Card, Chip, ChipGroup, EmptyState, IconButton, Input, ListRow, ListTemplate, PressableScale, Row, Segmented, Sheet, Text, TextArea, toast, useTheme,
} from '@/design';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { productsApi } from '../../api/products';
import { ProductThumb } from '../../components/ProductThumb';
import { INV, useOnline } from '../../lib/shared';
import { catalogConfigFor, EMPTY_LIST, loadPickList, savePickList, type CatalogEntry, type PickList } from '../lib/catalog';
import { esc, printHtml, shareHtmlPdf } from '../lib/print';

type Sort = 'featured' | 'name' | 'priceLow' | 'priceHigh';
type Mode = 'grid' | 'list';
const rate = (e: CatalogEntry) => e.priceNote ?? `${formatPKR(e.price)}${e.per ? ` / ${e.per}` : ''}`;

function photoCatalogHtml(entries: CatalogEntry[], o: { title: string; subtitle: string; shop: string; phone?: string | null }) {
  const cards = entries.map((e) => `<div class="c">${e.image ? `<img src="${esc(e.image)}"/>` : '<div class="ph"></div>'}<div class="n">${esc(e.name)}</div>
    <div class="p">${esc(rate(e))}</div>${e.category ? `<div class="m">${esc(e.category.name)}</div>` : ''}</div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
  body{font-family:-apple-system,Roboto,sans-serif;margin:20px;color:#0f172a}h1{margin:0;font-size:22px}.s{color:#64748b;margin:4px 0 14px;font-size:12px}
  .g{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.c{border:1px solid #e2e8f0;border-radius:12px;padding:8px;break-inside:avoid}
  .c img,.ph{width:100%;height:120px;object-fit:cover;border-radius:8px;background:#f1f5f9}.n{font-weight:600;font-size:12px;margin-top:6px}
  .p{font-weight:800;font-size:13px;margin-top:2px}.m{color:#64748b;font-size:10px}.f{margin-top:16px;color:#64748b;font-size:11px}
  </style></head><body><h1>${esc(o.shop)} — ${esc(o.title)}</h1><div class="s">${esc(o.subtitle)}</div><div class="g">${cards}</div>
  <div class="f">Rate badal sakte hain — taza rate dukaan se poochein.${o.phone ? ` Rabta: ${esc(o.phone)}` : ''}</div></body></html>`;
}

export function CatalogScreen() {
  const th = useTheme();
  const online = useOnline();
  const { id: industryId } = useIndustry();
  const config = catalogConfigFor(industryId);
  const setup = useReceiptSetup();
  const shop = setup.data?.shop.name ?? '';
  const shopPhone = (setup.data?.shop as { whatsapp?: string | null; phone?: string | null } | undefined)?.whatsapp || setup.data?.shop.phone;
  const q = useQuery({ queryKey: ['offline', 'catalog', industryId], queryFn: config.load, staleTime: 60_000 });
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [band, setBand] = useState('all');
  const [inStock, setInStock] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [sort, setSort] = useState<Sort>('featured');
  const [mode, setMode] = useState<Mode>('grid');
  const [open, setOpen] = useState<CatalogEntry | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [pick, setPick] = useState<PickList>(loadPickList);
  useEffect(() => { savePickList(pick); }, [pick]);

  const all = useMemo(() => q.data ?? [], [q.data]);
  const categories = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    for (const e of all) if (e.category) m.set(e.category.id, { id: e.category.id, name: e.category.name, count: (m.get(e.category.id)?.count ?? 0) + 1 });
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [all]);
  const items = useMemo(() => {
    const s = search.trim().toLowerCase();
    const [lo, hi] = band === 'all' ? [0, Infinity] : band.split('-').map(Number);
    const out = all.filter((e) => (!cat || e.category?.id === cat) && (!s || `${e.name} ${e.keywords ?? ''} ${e.brand ?? ''} ${e.category?.name ?? ''}`.toLowerCase().includes(s))
      && e.price >= lo && e.price < (hi || Infinity) && (!inStock || e.inStock !== false) && (!featured || e.featured));
    const by: Record<Sort, (a: CatalogEntry, b: CatalogEntry) => number> = {
      featured: (a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name), priceLow: (a, b) => a.price - b.price, priceHigh: (a, b) => b.price - a.price,
    };
    return [...out].sort(by[sort]);
  }, [all, search, cat, band, inStock, featured, sort]);
  const pairs = useMemo(() => (mode === 'grid' ? Array.from({ length: Math.ceil(items.length / 2) }, (_, i) => items.slice(i * 2, i * 2 + 2)) : items.map((e) => [e])), [items, mode]);

  const listLabel = t(config.listLabel ?? 'Pasand list');
  const add = (e: CatalogEntry) => {
    setPick((p) => {
      const same = p.items.find((i) => i.productId === (e.productId ?? e.id));
      if (same) return { ...p, items: p.items.map((i) => (i === same ? { ...i, quantity: i.quantity + 1 } : i)) };
      return { ...p, items: [...p.items, { id: `${Date.now()}${e.id}`, productId: e.productId ?? e.id, name: e.name, price: e.price, unit: e.per ?? '', quantity: 1, image: e.image }] };
    });
    toast.success(`${e.name} — ${listLabel}`, { action: { label: t('Dekhein'), onPress: () => setListOpen(true) } });
  };
  const picked = (e: CatalogEntry) => pick.items.some((i) => i.productId === (e.productId ?? e.id));
  const filterLine = [cat && categories.find((c) => c.id === cat)?.name, search.trim() && `"${search.trim()}"`].filter(Boolean).join(' · ');
  const shareWhatsApp = () => {
    const rows = items.slice(0, 40).map((e) => `• ${e.name} — ${rate(e)}`);
    const text = [`*${shop}* — ${t(config.title)}`, filterLine, '', ...rows, ...(items.length > 40 ? [`…aur ${items.length - 40} ${t(config.noun)}`] : []), ...(shopPhone ? ['', `Rabta: ${shopPhone}`] : [])].join('\n');
    void Linking.openURL(whatsappLink(null, text));
  };
  const catalogHtml = () => photoCatalogHtml(items, { title: t(config.title), subtitle: `${filterLine ? `${filterLine} · ` : ''}${items.length} ${t(config.noun)}`, shop, phone: shopPhone });

  const header = (
    <View style={{ gap: th.space(3) }}>
      {categories.length > 0 && (
        <ChipGroup options={[{ value: '', label: t('Sab'), count: all.length }, ...categories.map((c) => ({ value: c.id, label: c.name, count: c.count }))]} value={cat} onChange={setCat} style={{ marginHorizontal: -th.space(4) }} />
      )}
      <Row gap={1.5} wrap>
        {config.stock !== false && <Chip label={t('Stock mein')} selected={inStock} onPress={() => setInStock((v) => !v)} />}
        <Chip icon={Star} label={t('Khaas')} selected={featured} onPress={() => setFeatured((v) => !v)} />
        {(config.priceBands ?? []).map(([lo, hi]) => {
          const v = `${lo}-${hi === Infinity ? 0 : hi}`;
          return <Chip key={v} label={hi === Infinity ? `${formatPKR(lo).replace('.00', '')}+` : `${lo ? formatPKR(lo).replace('.00', '') : 'Rs 0'} – ${formatPKR(hi).replace('.00', '')}`} selected={band === v} onPress={() => setBand(band === v ? 'all' : v)} />;
        })}
      </Row>
      <Row gap={2}>
        <Text size="sm" tone="muted" style={{ flex: 1 }}>{`${items.length} ${t(config.noun)}`}</Text>
        <Segmented size="sm" value={mode} onChange={setMode} options={[{ value: 'grid', label: '', icon: LayoutGrid }, { value: 'list', label: '', icon: ListIcon }]} />
      </Row>
      {pick.items.length > 0 && (
        <Card tone="brand" onPress={() => setListOpen(true)}>
          <Row gap={2}>
            <ShoppingBag size={18} color={th.colors.brand.text} />
            <Text weight="semibold" style={{ flex: 1 }}>{`${listLabel} · ${pick.items.reduce((s, i) => s + i.quantity, 0)}`}</Text>
            <Amount value={pick.items.reduce((s, i) => s + i.price * i.quantity, 0)} weight="bold" />
          </Row>
        </Card>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t(config.title)}
        subtitle={shop}
        actions={<Row gap={1}>
          <IconButton icon={ArrowDownWideNarrow} label={t('Sort')} onPress={() => setSortOpen(true)} />
          <IconButton icon={Share2} label={t('WhatsApp')} onPress={shareWhatsApp} disabled={!items.length} />
          <IconButton icon={Printer} label={t('Print')} onPress={() => void printHtml(catalogHtml())} disabled={!items.length} />
        </Row>}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, SKU ya barcode…') }}
        summary={header}
        grouped={mode === 'list'}
        data={pairs}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        refreshing={q.isRefetching}
        onRefresh={q.refetch}
        keyExtractor={(row) => row.map((e) => e.id).join('|')}
        renderItem={({ item: row }) => (mode === 'list' ? (
          <ListRow leading={<ProductThumb name={row[0].name} category={row[0].category?.name} url={row[0].image} size={44} />} title={row[0].name}
            subtitle={[row[0].category?.name, row[0].inStock === false ? t('Khatam') : row[0].stockNote].filter(Boolean).join(' · ') || undefined}
            trailing={<Row gap={2}><Text weight="bold" ltr>{rate(row[0])}</Text><IconButton icon={picked(row[0]) ? Check : Plus} label={listLabel} variant="soft" size="sm" onPress={() => add(row[0])} /></Row>}
            onPress={() => setOpen(row[0])} />
        ) : (
          <Row gap={2} align="stretch" style={{ paddingHorizontal: th.space(4), marginBottom: th.space(2) }}>
            {row.map((e) => (
              <PressableScale key={e.id} onPress={() => setOpen(e)} style={{ flex: 1, backgroundColor: th.colors.surface, borderRadius: th.radius('xl'), borderWidth: 1, borderColor: th.colors.border, overflow: 'hidden' }}>
                <View>
                  {e.image ? <Image source={{ uri: e.image }} style={{ width: '100%', aspectRatio: 1.2 }} contentFit="cover" />
                    : <View style={{ alignItems: 'center', justifyContent: 'center', aspectRatio: 1.2, backgroundColor: th.colors.surfaceMuted }}><ProductThumb name={e.name} category={e.category?.name} size={64} /></View>}
                  {e.featured && <View style={{ position: 'absolute', top: 6, start: 6 }}><Badge tone="warning" icon={Star}>{t('Khaas')}</Badge></View>}
                  {e.inStock === false && config.stock !== false && <View style={{ position: 'absolute', bottom: 0, start: 0, end: 0, backgroundColor: th.colors.danger.solid, paddingVertical: 2 }}><Text size="2xs" weight="bold" align="center" color={th.colors.danger.onSolid}>{t('Stock khatam')}</Text></View>}
                </View>
                <View style={{ padding: th.space(2.5), gap: 4, flex: 1 }}>
                  <Text size="sm" weight="semibold" numberOfLines={2}>{e.name}</Text>
                  <Row justify="between" align="end" style={{ marginTop: 'auto' }}>
                    <View style={{ flex: 1 }}>
                      {e.oldPrice && e.oldPrice > e.price ? <Text size="2xs" tone="muted" ltr style={{ textDecorationLine: 'line-through' }}>{formatPKR(e.oldPrice)}</Text> : null}
                      <Text weight="bold" ltr>{e.priceNote ?? formatPKR(e.price).replace('.00', '')}</Text>
                    </View>
                    <IconButton icon={picked(e) ? Check : Plus} label={listLabel} variant={picked(e) ? 'primary' : 'soft'} size="sm" onPress={() => add(e)} />
                  </Row>
                </View>
              </PressableScale>
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </Row>
        ))}
        empty={<EmptyState icon={ShoppingBag} title={all.length ? t('Is filter me kuch nahi') : t('Abhi koi maal nahi')} />}
      />

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title={t('Sort')}>
        {([['featured', t('Khaas pehle')], ['name', t('Naam (A–Z)')], ['priceLow', t('Sastay pehle')], ['priceHigh', t('Mehngay pehle')]] as Array<[Sort, string]>).map(([v, label]) => (
          <ListRow key={v} dense title={label} selected={sort === v} trailing={sort === v ? <Check size={18} color={th.colors.brand.solid} /> : undefined} onPress={() => { setSort(v); setSortOpen(false); }} />
        ))}
      </Sheet>
      {open && <EntrySheet e={open} online={online} onClose={() => setOpen(null)} onAdd={() => add(open)} listLabel={listLabel} />}
      {listOpen && <PickListSheet list={pick} setList={setPick} shop={shop} listLabel={listLabel} onClose={() => setListOpen(false)}
        onPdf={() => void shareHtmlPdf(catalogHtml())} />}
    </>
  );
}

function EntrySheet({ e, online, onClose, onAdd, listLabel }: { e: CatalogEntry; online: boolean; onClose: () => void; onAdd: () => void; listLabel: string }) {
  const th = useTheme();
  const detail = useQuery({ queryKey: [INV, 'catalog-entry', e.productId], queryFn: () => productsApi.getOne(e.productId!), enabled: !!e.productId && online, staleTime: 60_000 });
  const images = (detail.data?.images ?? []).map((i) => i.url);
  const pics = images.length ? images : e.image ? [e.image] : [];
  return (
    <Sheet open onClose={onClose} title={e.name} description={[e.category?.name, e.brand].filter(Boolean).join(' · ') || undefined}
      footer={<Button fullWidth icon={Plus} onPress={() => { onAdd(); onClose(); }}>{listLabel}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {pics.length > 0 && (
          <Row gap={2} style={{ flexWrap: 'nowrap' }}>
            {pics.slice(0, 3).map((u) => <Image key={u} source={{ uri: u }} style={{ flex: 1, aspectRatio: 1, borderRadius: th.radius('lg') }} contentFit="cover" />)}
          </Row>
        )}
        <Text size="2xl" weight="bold" ltr>{rate(e)}</Text>
        {e.stockNote && <Text size="sm" tone="warning">{e.stockNote}</Text>}
        {e.inStock === false && <Badge tone="danger">{t('Stock khatam')}</Badge>}
        {!!(detail.data?.description || e.description) && <Text size="sm">{detail.data?.description || e.description}</Text>}
        {(detail.data?.variants?.length ?? 0) > 0 && (
          <Card title={t('Variants')} flush>
            {detail.data!.variants!.filter((v) => v.isActive).map((v) => <ListRow key={v.id} dense title={v.name} trailing={<Text weight="semibold" ltr>{formatPKR(v.price)}</Text>} />)}
          </Card>
        )}
        {(e.specs ?? []).map(([k, v]) => <Row key={k} justify="between"><Text size="sm" tone="muted">{k}</Text><Text size="sm">{v}</Text></Row>)}
      </View>
    </Sheet>
  );
}

function PickListSheet({ list, setList, shop, listLabel, onClose, onPdf }: { list: PickList; setList: (fn: (l: PickList) => PickList) => void; shop: string; listLabel: string; onClose: () => void; onPdf: () => void }) {
  const th = useTheme();
  const total = list.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const setQty = (id: string, q: number) => setList((l) => ({ ...l, items: q <= 0 ? l.items.filter((i) => i.id !== id) : l.items.map((i) => (i.id === id ? { ...i, quantity: q } : i)) }));
  const send = () => {
    const rows = list.items.map((i, n) => `${n + 1}. ${i.name} × ${i.quantity}${i.unit ? ` ${i.unit}` : ''} — ${formatPKR(i.price * i.quantity)}`);
    const text = [`*${shop}*`, '', ...rows, '', `Kul: ${formatPKR(total)}`, ...(list.customerName ? [`Naam: ${list.customerName}`] : []), ...(list.notes ? [list.notes] : [])].join('\n');
    void Linking.openURL(whatsappLink(list.customerPhone, text));
  };
  return (
    <Sheet open onClose={onClose} title={listLabel}
      footer={<Row gap={2}>
        <Button variant="secondary" icon={FileDown} onPress={onPdf}>{t('PDF')}</Button>
        <Button style={{ flex: 1 }} icon={Share2} disabled={!list.items.length} onPress={send}>{t('WhatsApp par bhejein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        {!list.items.length ? <Text tone="muted">{t('List khaali hai')}</Text> : list.items.map((i) => (
          <Row key={i.id} gap={2}>
            <ProductThumb name={i.name} url={i.image} size={36} />
            <View style={{ flex: 1 }}><Text size="sm" weight="semibold" numberOfLines={1}>{i.name}</Text><Text size="xs" tone="muted" ltr>{formatPKR(i.price * i.quantity)}</Text></View>
            <IconButton icon={Minus} label={t('Kam')} size="sm" variant="secondary" onPress={() => setQty(i.id, i.quantity - 1)} />
            <Text weight="bold" ltr>{String(i.quantity)}</Text>
            <IconButton icon={Plus} label={t('Zyada')} size="sm" variant="secondary" onPress={() => setQty(i.id, i.quantity + 1)} />
          </Row>
        ))}
        <Row justify="between"><Text weight="semibold">{t('Kul')}</Text><Amount value={total} weight="bold" /></Row>
        <Input label={t('Customer ka naam')} value={list.customerName} onChangeText={(v) => setList((l) => ({ ...l, customerName: v }))} />
        <Input label={t('Customer ka phone')} value={list.customerPhone} ltr keyboardType="phone-pad" onChangeText={(v) => setList((l) => ({ ...l, customerPhone: v }))} hint={t('Khaali chhorein to WhatsApp par chat chunein')} />
        <TextArea label={t('Note')} value={list.notes} onChangeText={(v) => setList((l) => ({ ...l, notes: v }))} />
        {list.items.length > 0 && <Button variant="ghost" icon={Trash2} onPress={() => setList(() => EMPTY_LIST)}>{t('Saaf karein')}</Button>}
      </View>
    </Sheet>
  );
}
