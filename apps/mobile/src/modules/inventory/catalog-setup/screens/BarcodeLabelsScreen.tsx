/**
 * Barcode labels (same as the web page): a print list of products, variants
 * and packs with a label count each (kept on this phone), the shop's label
 * design (roll or A4 sticker sheet, what shows, barcode type, price, text),
 * a live preview of one label, test print, print and PDF share. Items
 * without a barcode get a scanner-safe EAN-13 in one tap. The list and the
 * prices come from the phone (offline); saving the design, new barcodes and
 * printing over the network need internet.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle, Eye, FileDown, LayoutGrid, Minus, Pencil, Plus, Printer, ScanLine, Settings2, Tags, TestTube2, Trash2, Wand2,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { msg, t } from '@/core/i18n';
import { offline, onlineNeededText, type ProductDetail } from '@/core/offline';
import { useReceiptSetup } from '@/core/receipt';
import {
  Badge, Button, Card, Chip, EmptyState, IconButton, Input, ListRow, Row, Screen, Segmented, Select, Sheet, StatTile, Switch, Text, confirm, toast, useTheme,
} from '@/design';
import { Scanner } from '@/core/hardware/scanner';
import { batchesApi, productsApi, unitsApi, variantsApi } from '../../api/products';
import { useCategories } from '../../components/Pickers';
import { ProductPicker, type PickedProduct } from '../../components/ProductPicker';
import { NumberInput } from '../../components/fields';
import { INV, qty, useOnline, useRefreshInventory } from '../../lib/shared';
import {
  A4_SHEETS, LABEL_DEFAULTS, labelPrice, labelsApi, linearSvg, loadQueue, MAX_QTY, packsFor, renderLabels, resolveLine, sameItem, SAMPLE, saveQueue, sheetLayout,
  THERMAL_SIZES, type LabelConfig, type LabelData, type LabelSheet, type QueueLine, type ResolvedLine,
} from '../lib/labels';
import { printHtml, shareHtmlPdf } from '../lib/print';

const SETTINGS_KEY = [INV, 'label-settings'];
let lineSeq = 0;
const newId = () => `l${Date.now().toString(36)}${++lineSeq}`;

/** The shop's label design with a debounced save, so every counter prints the same stickers. */
function useLabelConfig() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: SETTINGS_KEY, queryFn: labelsApi.settings, staleTime: 5 * 60_000 });
  const [config, setConfig] = useState<LabelConfig>(LABEL_DEFAULTS);
  const pending = useRef<Partial<LabelConfig>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (query.data) setConfig({ ...LABEL_DEFAULTS, ...query.data.config, ...pending.current }); }, [query.data]);
  const flush = () => {
    timer.current = null;
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    setSaving(true);
    labelsApi.save(patch).then((saved) => {
      qc.setQueryData(SETTINGS_KEY, (old: typeof query.data) => (old ? { ...old, config: saved } : old));
    }).catch(() => {
      pending.current = { ...patch, ...pending.current };
      toast.error(t('Label ki setting save nahi hui — internet check karein'));
    }).finally(() => setSaving(false));
  };
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); flush(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch: Partial<LabelConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  };
  return { config, set, saving: saving || !!timer.current, missingBarcodes: query.data?.missingBarcodes ?? 0 };
}

export function BarcodeLabelsScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ productIds?: string }>();
  const online = useOnline();
  const refreshInv = useRefreshInventory();
  const setup = useReceiptSetup();
  const shopName = setup.data?.shop.name ?? '';
  const categories = useCategories();
  const { config, set, saving, missingBarcodes } = useLabelConfig();
  const [tab, setTab] = useState<'list' | 'design'>('list');
  const [lines, setLines] = useState<QueueLine[]>(loadQueue);
  const [skip, setSkip] = useState(0);
  const [picker, setPicker] = useState(false);
  const [scan, setScan] = useState(false);
  const [codeFor, setCodeFor] = useState<ResolvedLine | null>(null);
  useEffect(() => { saveQueue(lines); }, [lines]);

  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = useQuery({
    queryKey: ['offline', 'products', 'labels', ids],
    queryFn: async () => new Map((await Promise.all(ids.map(async (id) => [id, await offline.products.get(id)] as const))).filter(([, p]) => p) as Array<[string, ProductDetail]>),
    placeholderData: (p) => p,
  });
  const resolved = useMemo(() => lines.map((l) => resolveLine(l, products.data?.get(l.productId), config)), [lines, products.data, config]);
  const labels = useMemo(() => resolved.flatMap((r) => (r.data ? Array<LabelData>(Math.min(MAX_QTY, r.line.qty)).fill(r.data) : [])), [resolved]);
  const missing = resolved.filter((r) => r.data && r.missingCode);
  const layout = sheetLayout(config);
  const pages = layout.roll ? Math.ceil(labels.length / layout.cols) : Math.ceil((labels.length + skip) / layout.perPage);

  const addLine = (base: Omit<QueueLine, 'id' | 'qty'>, stock: number) => setLines((prev) => {
    const same = prev.find((l) => sameItem(l, base));
    if (same) return prev.map((l) => (l === same ? { ...l, qty: Math.min(MAX_QTY, l.qty + 1) } : l));
    const q = config.copies === 'stock' ? Math.min(MAX_QTY, Math.max(1, Math.floor(stock))) : 1;
    return [...prev, { ...base, id: newId(), qty: q }];
  });
  /** Nearest expiry among batches in stock (MM/YYYY), when the design shows expiry and the phone is online. */
  const expiryOf = async (p: ProductDetail, variantId?: string | null) => {
    if (!config.showExpiry || !p.expiryTracked || !online) return null;
    const list = await batchesApi.list(p.id).catch(() => []);
    const d = list.filter((b) => b.expiryDate && b.quantity > 0 && (!variantId || !b.variantId || b.variantId === variantId))
      .map((b) => new Date(b.expiryDate as string)).sort((a, b) => a.getTime() - b.getTime())[0];
    return d ? `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : null;
  };
  const addProduct = async (p: ProductDetail, pick: { variantId?: string | null; unitId?: string | null } = {}) => {
    const rate = pick.unitId ? p.packs.find((u) => u.id === pick.unitId)?.conversionRate || 1 : 1;
    // A product with variants gets a label per variant, unless one was chosen.
    if (p.variants.length && !pick.variantId) {
      for (const v of p.variants) addLine({ productId: p.id, variantId: v.id, unitId: pick.unitId ?? undefined, expiry: await expiryOf(p, v.id) }, (v.stock ?? 0) / rate);
      return;
    }
    const v = pick.variantId ? p.variants.find((x) => x.id === pick.variantId) : undefined;
    addLine({ productId: p.id, variantId: pick.variantId ?? undefined, unitId: pick.unitId ?? undefined, expiry: await expiryOf(p, pick.variantId) }, Number(v ? v.stock : p.stock) / rate);
  };
  const onPick = (x: PickedProduct) => {
    void offline.products.get(x.product.id).then((p) => { if (p) void addProduct(p, { variantId: x.variantId, unitId: x.pack?.isBase ? null : x.pack?.id }); });
  };
  const onScan = async (code: string) => {
    const hit = await offline.products.byBarcode(code.trim());
    if (!hit) { toast.error(t('"{{code}}" se koi cheez nahi mili', { code })); return false; }
    await addProduct(hit.product, { variantId: hit.variantId, unitId: hit.pack && !hit.pack.isBase ? hit.pack.id : null });
    toast.success(t('{{name}}{{value}} list me', { name: hit.product.name, value: hit.pack && !hit.pack.isBase ? ` (${hit.pack.unitLabel || hit.pack.unitName})` : '' }));
    return true;
  };
  const addCategory = async (categoryId: string) => {
    const list = await offline.products.search({ categoryId, limit: 2000 });
    if (!list.length) { toast.info(t('Is category me koi cheez nahi')); return; }
    if (list.length > 150 && !(await confirm({ title: t('{{count}} cheezein list me dalni hain?', { count: list.length }) }))) return;
    for (const row of list) { const p = await offline.products.get(row.id); if (p) await addProduct(p); }
    toast.success(t('{{count}} cheezein list me aa gayin', { count: list.length }));
  };

  // Products sent from the products list ("Labels" on selected products).
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current || !params.productIds) return;
    handled.current = true;
    let idsIn: string[] = [];
    try { idsIn = JSON.parse(params.productIds); } catch { idsIn = params.productIds.split(','); }
    void (async () => {
      let n = 0;
      for (const id of idsIn.filter(Boolean)) { const p = await offline.products.get(id); if (p) { await addProduct(p); n++; } }
      if (n) toast.success(t('{{count}} cheezein label ki list me', { count: n }));
    })();
  }, [params.productIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const setQty = (id: string, q: number) => setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, Math.max(1, q)) } : l)));
  const setAllQty = (q: number | 'stock') => setLines((prev) => prev.map((l) => {
    const r = resolved.find((x) => x.line.id === l.id);
    return { ...l, qty: q === 'stock' ? Math.min(MAX_QTY, Math.max(1, r?.stock ?? 1)) : q };
  }));
  const clear = async () => { if (await confirm({ title: t('Poori list saaf karni hai?'), tone: 'danger', confirmLabel: t('Saaf karein') })) setLines([]); };

  const assign = useMutation({
    mutationFn: async () => {
      const productIds = [...new Set(missing.filter((r) => !r.pack).map((r) => r.line.productId))];
      const unitIds = [...new Set(missing.flatMap((r) => (r.pack ? [r.pack.id] : [])))];
      let made = 0;
      if (productIds.length) { const res = await labelsApi.assign(productIds, true); made += res.products + res.variants; }
      for (const id of unitIds) { await unitsApi.generateBarcode(id); made++; }
      return made;
    },
    onSuccess: (made) => { void refreshInv(); toast.success(made ? t('{{made}} naye barcode ban gaye — scanner par chalenge', { made }) : t('Sab ke barcode pehle se hain')); },
    meta: { silentError: true },
    onError: () => toast.error(t('Barcode nahi bane — internet check karke dobara koshish karein')),
  });
  const saveCode = async (r: ResolvedLine, code: string) => {
    try {
      if (r.pack) await unitsApi.update(r.pack.id, { barcode: code });
      else if (r.line.variantId) {
        const v = r.product?.variants.find((x) => x.id === r.line.variantId);
        await variantsApi.update(r.line.productId, r.line.variantId, { name: v?.name ?? '', price: v?.price ?? 0, barcode: code } as never);
      } else await productsApi.update(r.line.productId, { barcode: code });
      void refreshInv();
      toast.success(t('Barcode save ho gaya'));
      return true;
    } catch {
      toast.error(t('Barcode save nahi hua — shayad ye code kisi aur cheez ka hai'));
      return false;
    }
  };

  const print = (test = false) => {
    const list = test ? [labels[0] ?? SAMPLE] : labels;
    if (!list.length) { toast.error(t('Pehle list me koi cheez dalain')); return; }
    void printHtml(renderLabels(list, config, { shopName, skip }));
  };
  const share = () => {
    if (!labels.length) { toast.error(t('Pehle list me koi cheez dalain')); return; }
    const pt = (n: number) => Math.round((n * 72) / 25.4);
    void shareHtmlPdf(renderLabels(labels, config, { shopName, skip }), { width: pt(layout.pageW), height: pt(layout.pageH) });
  };
  const sheetName = layout.roll ? t('Roll {{w}}×{{h}} mm', { w: layout.w, h: layout.h }) : t('A4 · {{perPage}} label', { perPage: layout.perPage });

  return (
    <Screen title={t('Barcode labels')} subtitle={t('Qeemat aur barcode ke sticker — roll ya A4 sheet par')}
      actions={<IconButton icon={FileDown} label={t('PDF')} onPress={share} disabled={!labels.length} />}
      footer={(
        <Row gap={2}>
          <Button variant="secondary" icon={TestTube2} onPress={() => print(true)}>{t('Test print')}</Button>
          <Button icon={Printer} style={{ flex: 1 }} disabled={!labels.length} onPress={() => print()}>{t('Print {{count}}', { count: labels.length })}</Button>
        </Row>
      )}>
      <View style={{ gap: th.space(4) }}>
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Tags} label={t('Chhapne wale label')} value={<Text size="xl" weight="bold">{labels.length}</Text>} hint={t('{{count}} cheezein', { count: lines.length })} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={LayoutGrid} label={layout.roll ? t('Roll par') : t('A4 sheets')} value={<Text size="xl" weight="bold">{pages}</Text>} hint={sheetName} />
        </Row>
        {missing.length > 0 && (
          <Card tone="warning">
            <Row gap={2}>
              <AlertTriangle size={18} color={th.colors.warning.text} />
              <Text size="sm" style={{ flex: 1 }}>{`${t('List me barcode nahi')}: ${missing.length}${missingBarcodes ? ` · ${t('dukaan me {{missingBarcodes}} cheezein bina barcode', { missingBarcodes })}` : ''}`}</Text>
              <Button size="sm" icon={Wand2} loading={assign.isPending} onPress={() => { if (!online) toast.warning(onlineNeededText('settings')); else assign.mutate(); }}>
                {t('Barcode banayen ({{count}})', { count: missing.length })}
              </Button>
            </Row>
          </Card>
        )}
        <Segmented value={tab} onChange={setTab} options={[{ value: 'list', label: t('Kis cheez ke label'), icon: Tags }, { value: 'design', label: t('Label ka design'), icon: Settings2 }]} />
        <LabelPreview data={labels[0] ?? SAMPLE} config={config} shopName={shopName} sample={!labels.length} />
        {tab === 'list' ? (
          <>
            <Row gap={2}>
              <Button style={{ flex: 1 }} variant="soft" icon={Plus} onPress={() => setPicker(true)}>{t('Cheez daalein')}</Button>
              <IconButton icon={ScanLine} label={t('Camera se scan')} variant="soft" size="lg" onPress={() => setScan(true)} />
            </Row>
            {(categories.data?.length ?? 0) > 0 && (
              <Select label={t('Poori category ek saath dalain…')} value="" onChange={(v) => { if (v) void addCategory(v); }} searchable
                hint={t('Category ki har cheez list me aa jayegi — naya maal aaya ho to kaam ka hai')}
                options={(categories.data ?? []).filter((c) => c.isActive !== false).map((c) => ({ value: c.id, label: c.name }))} />
            )}
            {!lines.length ? (
              <EmptyState icon={Tags} title={t('List khaali hai')} message={t('Upar se cheez search ya scan karein. Products ke safhe se bhi "Label" dabane par cheezein yahan aati hain.')} />
            ) : (
              <>
                <Row gap={1.5} wrap>
                  <Text size="xs" tone="muted">{t('Sab ko:')}</Text>
                  {[1, 2, 5].map((n) => <Chip key={n} label={`${n}`} onPress={() => setAllQty(n)} />)}
                  <Chip label={t('Stock jitne')} onPress={() => setAllQty('stock')} />
                  <Button size="sm" variant="ghost" icon={Trash2} onPress={() => void clear()}>{t('Saaf karein')}</Button>
                </Row>
                {resolved.map((r) => <QueueRow key={r.line.id} r={r} onQty={(q) => setQty(r.line.id, q)} onRemove={() => setLines((p) => p.filter((l) => l.id !== r.line.id))}
                  onUnit={(unitId) => setLines((p) => p.map((l) => (l.id === r.line.id ? { ...l, unitId } : l)))} onCode={() => { if (!online) toast.warning(onlineNeededText('settings')); else setCodeFor(r); }} />)}
              </>
            )}
          </>
        ) : (
          <LabelDesign config={config} set={set} saving={saving} skip={skip} onSkip={setSkip} />
        )}
        <Text size="xs" tone="muted">{t('Print ke dabbe me Scale 100%, Margins None aur Headers/footers band rakhein — warna label khisak jate hain.')}</Text>
      </View>
      <ProductPicker open={picker} onClose={() => setPicker(false)} onPick={onPick} keepOpen variants={false} pickedIds={new Set(ids)} title={t('Label ke liye')} />
      {scan && <Scanner title={t('Label ke liye scan')} continuous onClose={() => setScan(false)} onCode={onScan} />}
      {codeFor && <CodeSheet r={codeFor} onClose={() => setCodeFor(null)} onSave={async (c) => { if (await saveCode(codeFor, c)) setCodeFor(null); }} />}
    </Screen>
  );
}

function QueueRow({ r, onQty, onRemove, onUnit, onCode }: { r: ResolvedLine; onQty: (q: number) => void; onRemove: () => void; onUnit: (id: string | undefined) => void; onCode: () => void }) {
  const th = useTheme();
  if (!r.data || !r.product) {
    return <ListRow icon={AlertTriangle} iconTone="warning" title={t('Ye cheez ab nahi mili (shayad delete ho gayi)')} trailing={<IconButton icon={Trash2} label={t('Hatayein')} onPress={onRemove} />} />;
  }
  const packs = packsFor(r.product, r.line.variantId);
  return (
    <Card>
      <View style={{ gap: th.space(2) }}>
        <Row gap={2}>
          <View style={{ flex: 1 }}>
            <Text weight="semibold" numberOfLines={1}>{r.data.name}{r.data.variant ? ` · ${r.data.variant}` : ''}</Text>
            <Row gap={1.5}>
              <Text size="xs" weight="bold" ltr>{labelPrice(r.data.price)}</Text>
              {r.data.code ? <Text size="xs" tone="muted" ltr>{r.data.code}</Text> : <Badge tone="warning">{t('Barcode nahi — label bina barcode chhapega')}</Badge>}
              <Button size="sm" variant="link" icon={Pencil} onPress={onCode}>{r.data.code ? t('Badlein') : t('Likhein')}</Button>
            </Row>
          </View>
          <IconButton icon={Trash2} label={t('Hatayein')} onPress={onRemove} />
        </Row>
        <Row gap={2} align="end">
          {packs.length > 0 && (
            <View style={{ flex: 1 }}>
              <Select label={t('Unit')} value={r.line.unitId ?? ''} onChange={(v) => onUnit(v || undefined)}
                options={[{ value: '', label: t('{{value}} (khula)', { value: r.product.unit || 'Piece' }) }, ...packs.map((u) => ({ value: u.id, label: `${u.unitLabel || u.unitName} · ${qty(u.conversionRate)} ${r.product?.unit}${u.barcode ? '' : t(' · barcode nahi')}` }))]} />
            </View>
          )}
          <Row gap={1}>
            <IconButton icon={Minus} label={t('Kam')} variant="secondary" onPress={() => onQty(r.line.qty - 1)} />
            <Input containerStyle={{ width: 64 }} value={String(r.line.qty)} keyboardType="number-pad" ltr accessibilityLabel={t('Kitne label')} onChangeText={(v) => onQty(Number(v.replace(/\D/g, '')) || 1)} />
            <IconButton icon={Plus} label={t('Zyada')} variant="secondary" onPress={() => onQty(r.line.qty + 1)} />
          </Row>
        </Row>
        <Button size="sm" variant="ghost" icon={Tags} disabled={r.stock < 1} onPress={() => onQty(r.stock)}>{t('Stock {{stock}}', { stock: r.stock })}</Button>
      </View>
    </Card>
  );
}

function CodeSheet({ r, onClose, onSave }: { r: ResolvedLine; onClose: () => void; onSave: (code: string) => Promise<void> }) {
  const th = useTheme();
  const [code, setCode] = useState(r.data?.code ?? '');
  const [scan, setScan] = useState(false);
  const [saving, setSaving] = useState(false);
  const what = r.pack ? t('{{unit}} ka', { unit: r.pack.unitLabel || r.pack.unitName }) : r.line.variantId ? t('is variant ka') : t('is cheez ka');
  return (
    <Sheet open onClose={onClose} title={t('Barcode likhein')} description={t('{{value}} — {{what}} barcode', { value: r.data?.name ?? '', what })}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button style={{ flex: 1 }} loading={saving} disabled={!code.trim()} onPress={() => { setSaving(true); void onSave(code.trim()).finally(() => setSaving(false)); }}>{t('Save')}</Button>
      </Row>}>
      <View style={{ gap: th.space(2) }}>
        <Input value={code} onChangeText={setCode} ltr keyboardType="number-pad" autoFocus placeholder={t('Dabbe par chhapa barcode scan karein ya likhein')}
          trailing={<IconButton icon={ScanLine} label={t('Scan')} size="sm" variant="soft" onPress={() => setScan(true)} />} />
        <Text size="xs" tone="muted">{t('Company ka barcode pehle se cheez par ho to wohi likhein. Naya chahiye to page ke upar "Barcode banayen" dabayein.')}</Text>
      </View>
      {scan && <Scanner title={t('Barcode scan')} onClose={() => setScan(false)} onCode={(c) => { setCode(c.trim()); }} />}
    </Sheet>
  );
}

/** One label drawn on the phone the way it prints (white sticker, black text). */
function LabelPreview({ data: d, config: c, shopName, sample }: { data: LabelData; config: LabelConfig; shopName: string; sample: boolean }) {
  const th = useTheme();
  const lay = sheetLayout(c);
  const scale = Math.min(260 / lay.w, 160 / lay.h);
  const W = lay.w * scale;
  const H = lay.h * scale;
  const fs = c.fontScale * scale;
  const shop = (c.shopText || shopName).trim();
  const meta = [c.showVariant && d.variant, c.showUnit && d.unit, c.showSku && d.sku].filter(Boolean).join(' · ');
  const bar = d.code ? linearSvg(d.code, c.format === 'EAN13').svg : '';
  const ink = '#000000';
  return (
    <Card title={t('Preview')} description={sample ? t('Namoona label — list me cheez dalein to asal dikhega') : undefined} action={<Eye size={16} color={th.colors.textMuted} />}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: W, height: H, backgroundColor: '#ffffff', borderRadius: 4, borderWidth: c.border ? 1 : 0.5, borderColor: c.border ? ink : th.colors.border, padding: 4, justifyContent: 'center', alignItems: c.align === 'center' ? 'center' : 'flex-start' }}>
          {c.showShop && !!shop && <Text color={ink} numberOfLines={1} style={{ fontSize: 2.4 * fs, fontWeight: '600' }}>{shop.toUpperCase()}</Text>}
          {c.showName && <Text color={ink} numberOfLines={2} style={{ fontSize: 3.2 * fs, fontWeight: '700', textAlign: c.align === 'center' ? 'center' : 'left' }}>{d.name}</Text>}
          {!!meta && <Text color={ink} numberOfLines={1} style={{ fontSize: 2.4 * fs }}>{meta}</Text>}
          {c.showExpiry && !!d.expiry && <Text color={ink} style={{ fontSize: 2.4 * fs }}>{`Exp ${d.expiry}`}</Text>}
          {!!bar && <SvgXml xml={bar} width={Math.min(W - 8, 220)} height={Math.max(10, H * 0.32 * c.barHeight)} />}
          {c.showCode && !!d.code && <Text color={ink} ltr style={{ fontSize: 2.2 * fs, letterSpacing: 1 }}>{d.code}</Text>}
          {c.showPrice && (
            <Row gap={1}>
              {c.showOldPrice && !!d.oldPrice && d.oldPrice > d.price && <Text color={ink} ltr style={{ fontSize: 2.6 * fs, textDecorationLine: 'line-through' }}>{labelPrice(d.oldPrice)}</Text>}
              <Text color={ink} ltr style={{ fontSize: 4 * fs, fontWeight: '800' }}>{labelPrice(d.price)}</Text>
            </Row>
          )}
          {!!c.footerText.trim() && <Text color={ink} numberOfLines={1} style={{ fontSize: 2.4 * fs }}>{c.footerText.trim()}</Text>}
        </View>
        <Text size="2xs" tone="muted" style={{ marginTop: 6 }}>{t('{{w}}×{{h}} mm', { w: lay.w, h: lay.h })}</Text>
      </View>
    </Card>
  );
}

const SHOW: Array<{ k: keyof LabelConfig; label: string; hint: string }> = [
  { k: 'showShop', label: msg('Dukaan ka naam'), hint: msg('Sab se upar chhoti line') },
  { k: 'showName', label: msg('Cheez ka naam'), hint: msg('Lamba naam 2 line tak') },
  { k: 'showVariant', label: msg('Variant (size / rang)'), hint: msg('Jaise "Large · Laal"') },
  { k: 'showUnit', label: msg('Unit (piece / carton)'), hint: msg('Pack ke label par zaroori') },
  { k: 'showSku', label: msg('SKU'), hint: msg('Dukaan ka apna code') },
  { k: 'showCode', label: msg('Barcode ke number'), hint: msg('Scanner na chale to haath se likh sakein') },
  { k: 'showPrice', label: msg('Qeemat'), hint: msg('Rs ke saath, bari likhai me') },
  { k: 'showOldPrice', label: msg('Purani qeemat (kati hui)'), hint: msg('Sirf jab unit ki MRP qeemat se zyada ho') },
  { k: 'showExpiry', label: msg('Expiry'), hint: msg('Sab se qareeb batch ki expiry') },
  { k: 'border', label: msg('Label ke gird lakeer'), hint: msg('Saada kaghaz par kaatne ke liye') },
];

function LabelDesign({ config: c, set, saving, skip, onSkip }: { config: LabelConfig; set: (p: Partial<LabelConfig>) => void; saving: boolean; skip: number; onSkip: (n: number) => void }) {
  const th = useTheme();
  const layout = sheetLayout(c);
  const kind: 'thermal' | 'a4' | 'custom' = c.sheet === 'thermal' ? 'thermal' : c.sheet === 'custom' ? 'custom' : 'a4';
  const chooseKind = (k: typeof kind) => {
    if (k === kind) return;
    if (k === 'thermal') set({ sheet: 'thermal', widthMm: 50, heightMm: 30, cols: 1, gapMm: 2, marginMm: 0 });
    else if (k === 'a4') { const p = A4_SHEETS['a4-40']; set({ sheet: 'a4-40', widthMm: p.w, heightMm: p.h, cols: p.cols, gapMm: p.gapX, marginMm: 0 }); }
    else set({ sheet: 'custom', widthMm: layout.w, heightMm: layout.h, cols: kind === 'thermal' ? 3 : layout.cols, gapMm: 2, marginMm: 8 });
  };
  const num = (label: string, key: keyof LabelConfig, min: number, max: number, hint?: string) => (
    <NumberInput containerStyle={{ flex: 1 }} label={label} hint={hint} value={c[key] as number} onChangeValue={(v) => { if (v != null) set({ [key]: Math.min(max, Math.max(min, v)) } as Partial<LabelConfig>); }} />
  );
  return (
    <View style={{ gap: th.space(4) }}>
      <Text size="xs" tone="muted">{saving ? t('Save ho raha hai') : t('Har counter par yehi design chhapega')}</Text>
      <Card title={t('Kaghaz')}>
        <View style={{ gap: th.space(3) }}>
          <Segmented value={kind} onChange={chooseKind} options={[{ value: 'thermal', label: t('Thermal roll') }, { value: 'a4', label: t('A4 sheet') }, { value: 'custom', label: t('Apna naap') }]} />
          {kind === 'thermal' && (
            <>
              <Row gap={1.5} wrap>{THERMAL_SIZES.map(([w, h]) => <Chip key={`${w}x${h}`} label={`${w}×${h}`} selected={c.widthMm === w && c.heightMm === h} onPress={() => set({ widthMm: w, heightMm: h })} />)}</Row>
              <Text size="xs" tone="muted">{t('Roll ke dabbe par likha naap chunein — ya neeche apna likhein')}</Text>
              <Row gap={2}>{num(t('Chaurai'), 'widthMm', 15, 150)}{num(t('Unchai'), 'heightMm', 10, 150)}</Row>
              <Row gap={2}>{num(t('Ek line me label'), 'cols', 1, 4, t('Roll par saath saath kitne label'))}{c.cols > 1 && num(t('Beech ka faasla'), 'gapMm', 0, 20, t('Do label ke darmiyan'))}</Row>
            </>
          )}
          {kind === 'a4' && (Object.keys(A4_SHEETS) as Array<Exclude<LabelSheet, 'thermal' | 'custom'>>).map((s) => {
            const p = A4_SHEETS[s];
            return (
              <ListRow key={s} dense title={t(p.label)} subtitle={`${t(p.hint)} · ${t('{{w}}×{{h}} mm · {{cols}} column', { w: p.w, h: p.h, cols: p.cols })}`} selected={c.sheet === s}
                onPress={() => set({ sheet: s, widthMm: p.w, heightMm: p.h, cols: p.cols, gapMm: p.gapX, marginMm: 0 })} />
            );
          })}
          {kind === 'custom' && (
            <>
              <Row gap={2}>{num(t('Chaurai'), 'widthMm', 15, 150)}{num(t('Unchai'), 'heightMm', 10, 150)}</Row>
              <Row gap={2}>{num(t('Columns'), 'cols', 1, 8, t('Ek line me kitne'))}{num(t('Faasla'), 'gapMm', 0, 20, t('Label ke beech'))}</Row>
              {num(t('Kinara'), 'marginMm', 0, 30, t('Sheet ke kinare se'))}
            </>
          )}
          {!layout.roll && (
            <NumberInput label={t('Shuru kahan se')} value={skip + 1} integer onChangeValue={(v) => onSkip(Math.min(layout.perPage - 1, Math.max(0, (v ?? 1) - 1)))}
              hint={t('Aadhi istemaal hui sheet? Jis label se shuru karna hai us ka number likhein (upar baein se ginti).')} />
          )}
        </View>
      </Card>
      <Card title={t('Label par kya ho')}>
        {SHOW.map((s) => <Switch key={s.k} label={t(s.label)} description={t(s.hint)} value={!!c[s.k]} onChange={(v) => set({ [s.k]: v } as Partial<LabelConfig>)} />)}
      </Card>
      <Card title={t('Barcode')}>
        <View style={{ gap: th.space(3) }}>
          <Segmented value={c.format} onChange={(v) => set({ format: v })} options={[{ value: 'CODE128', label: t('Code 128') }, { value: 'EAN13', label: t('EAN-13') }, { value: 'QR', label: t('QR') }]} />
          <Text size="xs" tone="muted">
            {c.format === 'CODE128' ? t('Har scanner parhta hai, har code chalta hai — yehi rakhein.')
              : c.format === 'EAN13' ? t('Sirf sahi 13 hindson wale code EAN-13 banenge; baqi khud Code 128 me chhapenge.')
                : t('QR label computer se chhapein — phone se ye Code 128 me chhapta hai.')}
          </Text>
          <Row gap={1.5} wrap>
            <Text size="xs" tone="muted">{t('Barcode ki unchai')}</Text>
            {[0.4, 0.55, 0.7, 0.85, 1].map((v) => <Chip key={v} label={`${Math.round(v * 100)}%`} selected={Math.abs(c.barHeight - v) < 0.01} onPress={() => set({ barHeight: v })} />)}
          </Row>
        </View>
      </Card>
      <Card title={t('Qeemat aur likhai')}>
        <View style={{ gap: th.space(3) }}>
          <Text size="sm" weight="semibold">{t('Kaun si qeemat')}</Text>
          <Segmented value={c.priceSource === 'wholesale' || c.priceSource === 'credit' ? c.priceSource : 'retail'} onChange={(v) => set({ priceSource: v })}
            options={[{ value: 'retail', label: t('Retail') }, { value: 'wholesale', label: t('Wholesale') }, { value: 'credit', label: t('Credit') }]} />
          <Text size="xs" tone="muted">{t('Wholesale ya Credit price na likhi ho to Retail price chhapti hai')}</Text>
          <Text size="sm" weight="semibold">{t('Likhai kis taraf')}</Text>
          <Segmented value={c.align} onChange={(v) => set({ align: v })} options={[{ value: 'center', label: t('Beech me') }, { value: 'left', label: t('Baein') }]} />
          <Row gap={1.5} wrap>
            <Text size="xs" tone="muted">{t('Likhai ka size')}</Text>
            {[0.7, 0.85, 1, 1.15, 1.3, 1.5].map((v) => <Chip key={v} label={`${Math.round(v * 100)}%`} selected={Math.abs(c.fontScale - v) < 0.01} onPress={() => set({ fontScale: v })} />)}
          </Row>
        </View>
      </Card>
      <Card title={t('Apni lines')}>
        <View style={{ gap: th.space(3) }}>
          <Input label={t('Dukaan ki line')} value={c.shopText} maxLength={40} placeholder={t('Khaali = dukaan ka naam')} hint={t('Shop ke naam ki jagah kuch aur, jaise brand')} onChangeText={(v) => set({ shopText: v })} />
          <Input label={t('Neeche ki line')} value={c.footerText} maxLength={40} placeholder={t('Jaise: Exchange 7 din')} hint={t('Har label ke neeche, 40 harf tak')} onChangeText={(v) => set({ footerText: v })} />
        </View>
      </Card>
      <Card title={t('Naye item ke kitne label')}>
        <Segmented value={c.copies} onChange={(v) => set({ copies: v })} options={[{ value: 'one', label: t('Ek label') }, { value: 'stock', label: t('Stock jitne') }]} />
        <Text size="xs" tone="muted" style={{ marginTop: 6 }}>{t('Queue me nayi cheez dalte waqt ginti. "Stock jitne" naye maal par har piece ka label deta hai.')}</Text>
      </Card>
    </View>
  );
}

