/**
 * Mobile products through the shared products list, editor and detail (web
 * MobileProductWizardPage / Products / Detail): phone or accessory, model and
 * warranty, storage / RAM / colour variants, and for a phone the IMEIs of the
 * units on hand (scan, paste or type) with PTA status. A phone's stock comes
 * only from its IMEIs; an accessory keeps a plain count.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, ClipboardPaste, Hash, Plus, ScanLine, ShieldCheck, Smartphone, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { imeiLineProblem, parseImeiPaste, shelfMismatch } from '@nafaa/core/industries/mobile';
import { formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Badge, Button, Card, ChipGroup, IconButton, Input, ListRow, Row, Select, Text, TextArea, useTheme } from '@/design';
import { productsApi, variantsApi } from '@/modules/inventory/api/products';
import { Tiles } from '@/modules/inventory/components/fields';
import { registerDeviceSource } from '@/modules/inventory/industry/devices';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { EditorDraft } from '@/modules/inventory/screens/editor/types';
import { CameraScan } from '@/modules/pos/components/CameraScan';
import { imeiApi, usedPhonesApi, type ImeiRow, type PtaStatus } from './api';
import { ImeiInput } from './components/kit';
import { ageText, imeiStatusOf, metaText, ptaOf, PTA_HINT, PTA_LIST } from './meta';
import './pos';

interface ImeiLine { imei1: string; imei2: string; variant: string; pta: PtaStatus }
interface MobileExtra { phone: boolean; model: string; warrantyMonths: number; pta: PtaStatus; imeis: ImeiLine[]; onShelf: number }

const initial: MobileExtra = { phone: true, model: '', warrantyMonths: 12, pta: 'APPROVED', imeis: [], onShelf: 0 };
const WARRANTY = [0, 1, 3, 6, 12, 24];
const MODEL_PREFIX = /^Model:\s*/i;
const digitsOnly = (v: string) => v.replace(/\D/g, '');

function Identity({ ctx }: { ctx: StepContext<MobileExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  return (
    <View style={{ gap: th.space(3) }}>
      <Text size="sm" weight="semibold" tone="secondary">{t('Ye kya hai')}</Text>
      <Tiles value={x.phone ? 'phone' : 'acc'} onChange={(v) => ctx.setExtra({ phone: v === 'phone' })} columns={2}
        options={[{ value: 'phone', label: t('Phone / tablet') }, { value: 'acc', label: t('Accessory') }]} />
      <Text size="xs" tone="muted">{x.phone ? t('Har piece ka IMEI — stock IMEI se') : t('Charger, cover, handsfree — sirf ginti')}</Text>
      <Input label={t('Model number')} value={x.model} onChangeText={(model) => ctx.setExtra({ model })} placeholder={t('Jaise: SM-A155F, A2846')} hint={t('Marzi hai — search aur warranty claim me kaam aata hai')} ltr />
      {x.phone && (
        <>
          <Text size="sm" weight="semibold" tone="secondary">{t('Dukaan ki warranty (naye IMEI par lagegi)')}</Text>
          <ChipGroup wrap value={String(x.warrantyMonths)} onChange={(v) => ctx.setExtra({ warrantyMonths: Number(v) })}
            options={WARRANTY.map((m) => ({ value: String(m), label: m === 0 ? t('Koi nahi') : m < 12 ? t('{{m}} mahine', { m }) : t('{{value}} saal', { value: m / 12 }) }))} />
        </>
      )}
    </View>
  );
}

function Imeis({ ctx }: { ctx: StepContext<MobileExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  const variants = ctx.draft.core.variants.filter((v) => v.isActive).map((v) => v.name.trim()).filter(Boolean);
  const [scan, setScan] = useState(false);
  const [paste, setPaste] = useState('');
  const [one, setOne] = useState('');
  const known = useMemo(() => new Set(x.imeis.flatMap((l) => [l.imei1, l.imei2].filter(Boolean))), [x.imeis]);
  const blank = (imei1 = '', imei2 = ''): ImeiLine => ({ imei1, imei2, variant: variants.length === 1 ? variants[0] : '', pta: x.pta });
  const update = (i: number, patch: Partial<ImeiLine>) => ctx.setExtra({ imeis: x.imeis.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const rows = parseImeiPaste(paste);
  const fresh = rows.filter((p) => !known.has(p[0]));
  const stockTyped = ctx.draft.core.stock > 0 || ctx.draft.core.variants.some((v) => !v.id && v.stock > 0);
  if (!x.phone) return null;
  return (
    <View style={{ gap: th.space(3) }}>
      <Text size="base" weight="bold">{t('IMEI')}</Text>
      <Text size="xs" tone="muted">{t('Har phone ka apna IMEI — isi se stock, bill, warranty aur chori ka record chalta hai')}</Text>
      {ctx.isEdit && <Text size="sm" tone="secondary">{t('Abhi shelf par {{count}} phone hain. Yahan sirf naye IMEI daalein — purane IMEI page par hain.', { count: x.onShelf })}</Text>}
      {stockTyped && <Card tone="warning"><Text size="sm"><AlertTriangle size={14} color={th.colors.warning.text} /> {t('Phone ka stock IMEI se banta hai — upar wala stock 0 rakhein, IMEI yahan daalein.')}</Text></Card>}
      <Text size="sm" weight="medium" tone="secondary">{t('PTA (naye IMEI par)')}</Text>
      <ChipGroup wrap value={x.pta} onChange={(pta) => ctx.setExtra({ pta })} options={PTA_LIST.map((p) => ({ value: p, label: t(ptaOf(p).label) }))} />
      <Text size="xs" tone="muted">{t(PTA_HINT[x.pta])}</Text>
      <ImeiInput label={t('IMEI 1')} value={one} onValue={setOne} onScanned={(c) => { if (c.length === 15 && !known.has(c)) ctx.setExtra({ imeis: [...x.imeis, blank(c)] }); }} />
      <Row gap={2}>
        <Button style={{ flex: 1 }} variant="soft" icon={Plus} disabled={one.length !== 15 || known.has(one)} onPress={() => { ctx.setExtra({ imeis: [...x.imeis, blank(one)] }); setOne(''); }}>{t('Jorein')}</Button>
        <Button style={{ flex: 1 }} variant="secondary" icon={ScanLine} onPress={() => setScan(true)}>{t('Dabba scan karein')}</Button>
      </Row>
      <Card title={t('Excel ya WhatsApp se paste (har line: IMEI 1, IMEI 2)')}>
        <TextArea value={paste} onChangeText={setPaste} placeholder={'356789012345678, 356789012345686\n356789012345694'} ltr />
        {rows.length > 0 && <Button icon={ClipboardPaste} variant="soft" onPress={() => { ctx.setExtra({ imeis: [...x.imeis, ...fresh.map((p) => blank(p[0], p[1] ?? ''))] }); setPaste(''); }}>{t('{{count}} naye jorein', { count: fresh.length })}{rows.length > fresh.length ? ` · ${t('{{value}} pehle se hain', { value: rows.length - fresh.length })}` : ''}</Button>}
      </Card>
      {x.imeis.length > 0 && (
        <Card flush title={t('{{count}} naye IMEI', { count: x.imeis.length })}>
          {x.imeis.map((l, i) => (
            <View key={`${l.imei1}-${i}`} style={{ padding: th.space(3), gap: th.space(2), borderBottomWidth: i < x.imeis.length - 1 ? 0.5 : 0, borderColor: th.colors.border }}>
              <Row gap={2}>
                <Input containerStyle={{ flex: 1 }} value={l.imei1} onChangeText={(v) => update(i, { imei1: digitsOnly(v).slice(0, 15) })} keyboardType="number-pad" ltr maxLength={15} placeholder={t('IMEI 1')} />
                <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => ctx.setExtra({ imeis: x.imeis.filter((_, j) => j !== i) })} />
              </Row>
              <Input value={l.imei2} onChangeText={(v) => update(i, { imei2: digitsOnly(v).slice(0, 15) })} keyboardType="number-pad" ltr maxLength={15} placeholder={t('Dual SIM')} />
              <Row gap={2}>
                {variants.length > 0 && <View style={{ flex: 1 }}><Select value={l.variant} onChange={(v) => update(i, { variant: v })} placeholder={t('Variant')} options={variants.map((v) => ({ value: v, label: v }))} /></View>}
                <View style={{ flex: 1 }}><Select value={l.pta} onChange={(v) => update(i, { pta: v })} options={PTA_LIST.map((p) => ({ value: p, label: t(ptaOf(p).label) }))} /></View>
              </Row>
            </View>
          ))}
        </Card>
      )}
      {ctx.errors.imeis ? <Text size="sm" tone="danger">{ctx.errors.imeis}</Text> : null}
      {scan && <CameraScan title={t('Dabba scan karein')} continuous onClose={() => setScan(false)} onCode={(c) => { const d = digitsOnly(c); if (d.length !== 15 || known.has(d)) return false; ctx.setExtra({ imeis: [...(ctx.draft.extra.imeis), blank(d)] }); return true; }} footer={<Text size="sm" tone="inverse">{t('{{count}} IMEI', { count: x.imeis.length })}</Text>} />}
    </View>
  );
}

function imeiError(d: EditorDraft<MobileExtra>): string | null {
  const x = d.extra;
  if (!x.phone) return null;
  if (d.core.stock > 0 || d.core.variants.some((v) => !v.id && v.stock > 0)) return t('Phone ka stock IMEI se banta hai — stock 0 rakhein aur IMEI daalein');
  const variants = d.core.variants.filter((v) => v.isActive).map((v) => v.name.trim()).filter(Boolean);
  const p = imeiLineProblem(x.imeis, variants);
  if (!p) return null;
  switch (p.code) {
    case 'imei1': return t('Line {{value}}: IMEI 1 me 15 number hon', { value: p.line });
    case 'imei2': return t('Line {{value}}: IMEI 2 me 15 number hon', { value: p.line });
    case 'same': return t('Line {{value}}: IMEI 1 aur 2 ek jaise nahi ho sakte', { value: p.line });
    case 'variant': return t('Line {{value}}: variant chunein', { value: p.line });
    default: return t('IMEI {{dup}} do dafa likha hai', { dup: p.imei });
  }
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Adad (pcs)') }, { value: 'set', label: msg('Set') }, { value: 'pair', label: msg('Joda') }, { value: 'box', label: msg('Dabba') }],
  skuPrefix: 'MOB',
  variants: { presets: [{ group: msg('Storage'), values: ['64GB', '128GB', '256GB', '512GB', '1TB'] }, { group: msg('RAM'), values: ['4GB', '6GB', '8GB', '12GB'] }, { group: msg('Rang'), values: ['Black', 'White', 'Blue', 'Green', 'Gold', 'Titanium'] }] },
  markups: [3, 5, 8, 10, 15, 20],
};

const stock = stockStep<MobileExtra>(core, { extra: (ctx) => <Imeis ctx={ctx} />, quick: [1, 5, 10, 25, 50] });
const stockWithImeis: StepDef<MobileExtra> = {
  ...stock,
  validate: (d, isEdit) => { const e = stock.validate?.(d, isEdit) ?? {}; const err = imeiError(d); if (err) e.imeis = err; return e; },
};

const editor: EditorConfig<MobileExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const [product, page] = await Promise.all([productsApi.getOne(productId).catch(() => null), imeiApi.listAll({ productId, limit: 1 }).catch(() => null)]);
      const total = page ? Object.values(page.counts).reduce((s, n) => s + (n ?? 0), 0) : 0;
      return { phone: product?.productType === 'PHONE' || total > 0, model: (product as { shortDescription?: string | null } | null)?.shortDescription?.replace(MODEL_PREFIX, '') ?? '', onShelf: page?.counts.IN_STOCK ?? 0, imeis: [] };
    },
    // A phone's own stock starts at 0; its IMEIs bring it in.
    product: (d, payload) => ({
      ...payload,
      productType: d.extra.phone ? 'PHONE' : (payload.productType === 'PHONE' ? null : payload.productType),
      shortDescription: d.extra.model.trim() ? `Model: ${d.extra.model.trim()}` : undefined,
      ...(d.extra.phone && 'stock' in payload ? { stock: 0 } : {}),
    }),
    save: async (productId, d, { shopId }) => {
      const x = d.extra;
      if (!x.phone || !x.imeis.length) return;
      const variants = d.core.variants.length ? await variantsApi.list(productId) : [];
      const idOf = new Map(variants.map((v) => [v.name.trim(), v.id]));
      const groups = new Map<string, ImeiLine[]>();
      for (const l of x.imeis) groups.set(l.variant, [...(groups.get(l.variant) ?? []), l]);
      for (const [name, lines] of groups) {
        const variant = name ? d.core.variants.find((v) => v.name.trim() === name) : undefined;
        await imeiApi.bulkCreate({ productId, variantId: name ? idOf.get(name) : undefined, shopId: shopId ?? undefined, costPrice: Number(variant?.costPrice ?? d.core.costPrice) || 0, warrantyMonths: x.warrantyMonths,
          imeis: lines.map((l) => ({ imei1: l.imei1, imei2: l.imei2 || undefined, ptaStatus: l.pta })) });
      }
    },
  },
  steps: [
    basicStep<MobileExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: msg('Jaise: Samsung Galaxy A15') }),
    priceStep<MobileExtra>(core),
    stockWithImeis,
  ],
  summary: (d) => [
    [t('Kaisa'), `${d.extra.phone ? t('Phone / tablet') : t('Accessory')}${d.extra.model ? ` · ${d.extra.model}` : ''}`],
    ...(d.extra.phone && d.extra.warrantyMonths > 0 ? [[t('Warranty'), t('{{warrantyMonths}} mahine', { warrantyMonths: d.extra.warrantyMonths })] as [string, string]] : []),
    ...(d.extra.phone ? [[t('IMEI'), t('{{count}} naye IMEI', { count: d.extra.imeis.length })] as [string, string]] : []),
  ],
};

/** Models whose branch stock is not the number of phones on the shelf. */
function ImeiMismatch() {
  const th = useTheme();
  const { data = [] } = useQuery({ queryKey: ['mobile-imei-shelf'], queryFn: () => imeiApi.shelfCounts(), staleTime: 30_000 });
  const off = shelfMismatch(data);
  if (!off.length) return null;
  return (
    <Card tone="info" title={t('{{count}} phone models ka stock aur IMEI barabar nahi:', { count: off.length })}>
      {off.slice(0, 5).map((r) => <Text key={r.productId} size="sm" onPress={() => router.push(`/mobile/imei/product/${r.productId}` as never)}>{t('{{name}} · stock {{stock}} / IMEI {{inStock}}', { name: r.name, stock: Math.round(r.stock), inStock: r.inStock })}</Text>)}
      <Text size="xs" tone="muted" style={{ marginTop: th.space(1) }}>{t('Purchase ke baad IMEI daalna na bhoolein')}</Text>
    </Card>
  );
}

interface DetailExtra { rows: ImeiRow[]; total: number; counts: Partial<Record<string, number>> }
const isPhone = (p: { productType?: string | null }, x?: DetailExtra) => p.productType === 'PHONE' || (x?.total ?? 0) > 0;

registerInventoryIndustry({
  id: 'mobile',
  label: msg('Mobile'),
  list: {
    noun: 'model',
    filters: ['tags'],
    extras: (item) => {
      const tracked = item.productType === 'PHONE' || item.counts.imeis > 0;
      if (!tracked) return { line: item.brand?.name };
      return { line: [item.brand?.name, item.variants.length ? t('{{n}} variants', { n: item.variants.length }) : ''].filter(Boolean).join(' · ') || undefined, badges: [{ label: t('IMEI'), tone: 'neutral' }] };
    },
    actions: [{ icon: Hash, label: msg('IMEI stock'), href: '/mobile/imei' }, { icon: ShieldCheck, label: msg('Used phones'), href: '/mobile/used-phones' }],
    Banners: ImeiMismatch,
    onScanMiss: async (code) => {
      if (code.replace(/\D/g, '').length < 8) return false;
      const hit = await imeiApi.lookup(code).catch(() => null);
      if (!hit || (!hit.newPhones.length && !hit.usedPhones.length && !hit.repairs.length)) return false;
      router.push({ pathname: '/mobile/imei', params: { q: code } } as never);
      return true;
    },
    guide: [
      { icon: Smartphone, title: msg('Phone ka stock IMEI se'), text: msg('Har phone ka apna IMEI hai. Stock wohi hai jitne IMEI shelf par hain — purchase ke baad IMEI zaroor daalein.') },
      { icon: Hash, title: msg('Neeli patti'), text: msg('Jis model ka stock aur IMEI barabar nahi, wo upar patti me aata hai. Us par dabayein aur IMEI theek karein.') },
      { icon: ShieldCheck, title: msg('Accessories'), text: msg('Charger, cover, handsfree ka IMEI nahi hota — unka stock aam ginti se chalta hai.') },
    ],
  },
  editor,
  detail: {
    extra: {
      key: 'mobile-product-imeis',
      load: async (id): Promise<DetailExtra> => {
        const page = await imeiApi.listAll({ productId: id, limit: 200, sort: 'new' }).catch(() => null);
        return { rows: page?.items ?? [], total: page?.total ?? 0, counts: page?.counts ?? {} };
      },
    },
    badges: ({ product, extra }) => [{ label: isPhone(product, extra as DetailExtra | undefined) ? t('Phone (IMEI)') : t('Accessory'), tone: isPhone(product, extra as DetailExtra | undefined) ? 'info' : 'neutral' }],
    facts: ({ product, extra }) => {
      const x = extra as DetailExtra | undefined;
      const rows: Array<[string, string]> = [];
      const model = (product as { shortDescription?: string | null }).shortDescription?.replace(MODEL_PREFIX, '');
      if (model) rows.push([t('Model'), model]);
      if (isPhone(product, x)) { const months = x?.rows.find((r) => r.warrantyMonths)?.warrantyMonths; rows.push([t('Warranty'), months ? t('{{months}} mahine', { months }) : t('Nahi')]); }
      return rows;
    },
    tile: ({ product, extra, stock }) => {
      const x = extra as DetailExtra | undefined;
      if (!isPhone(product, x)) return null;
      const onShelf = x?.counts.IN_STOCK ?? 0;
      return { label: t('IMEI shelf par'), value: String(onShelf), hint: Math.round(stock) !== onShelf ? t('stock se {{value}} ka farq', { value: Math.abs(Math.round(stock) - onShelf) }) : t('stock ke barabar') };
    },
    alerts: ({ product, extra, stock }) => {
      const x = extra as DetailExtra | undefined;
      if (!isPhone(product, x)) return null;
      const onShelf = x?.counts.IN_STOCK ?? 0;
      if (Math.round(stock) === onShelf) return null;
      return (
        <Card tone="info" onPress={() => router.push(`/mobile/imei/product/${product.id}` as never)}>
          <Text size="sm" weight="medium">{t('Stock {{stock}} hai magar shelf par {{onShelf}} IMEI — {{value}}', { stock: Math.round(stock), onShelf, value: Math.round(stock) > onShelf ? t('purchase ke phone ke IMEI daalein') : t('stock ginti dobara karein') })}</Text>
          <Text size="xs" weight="semibold">{t('IMEI sambhalein')}</Text>
        </Card>
      );
    },
    tabs: [{
      id: 'imei', label: msg('IMEI'), icon: Smartphone, when: ({ product, extra }) => isPhone(product, extra as DetailExtra | undefined),
      render: ({ extra, product }) => {
        const x = extra as DetailExtra | undefined;
        const rows = x?.rows ?? [];
        const summary = Object.entries(x?.counts ?? {}).map(([k, v]) => `${t(imeiStatusOf(k).label)}: ${v}`).join(' · ');
        return (
          <Card flush title={t('Har phone IMEI ke saath')} description={summary || t('Abhi koi IMEI nahi')} action={<Button size="sm" variant="ghost" onPress={() => router.push(`/mobile/imei/product/${product.id}` as never)}>{t('IMEI daalein / badlein')}</Button>}>
            {rows.slice(0, 60).map((r, i) => (
              <ListRow key={r.id} dense divider={i < Math.min(rows.length, 60) - 1} title={<Text ltr weight="semibold">{r.imei1}</Text>}
                subtitle={<Row gap={1} wrap>{r.variant ? <Text size="xs" tone="muted">{r.variant.name}</Text> : null}<Badge tone={ptaOf(r.ptaStatus).tone}>{metaText(ptaOf(r.ptaStatus))}</Badge><Badge tone={imeiStatusOf(r.status).tone}>{metaText(imeiStatusOf(r.status))}</Badge>{r.status === 'IN_STOCK' ? <Text size="2xs" tone="muted">{ageText(r.daysInStock)}</Text> : null}</Row>}
                trailing={r.sale ? <Text size="xs" tone="muted" ltr>{r.sale.saleNumber}</Text> : r.purchasedAt ? <Text size="2xs" tone="muted">{formatDate(r.purchasedAt)}</Text> : undefined} />
            ))}
          </Card>
        );
      },
    }],
    stockChips: [1, 5, 10, 25],
  },
});

// Single phones for stock transfers and write-offs.
registerDeviceSource('mobile', {
  kind: 'imei', label: msg('Phones (IMEI)'), icon: Smartphone, transferField: 'imeiId',
  load: async (shopId) => (await imeiApi.listAll({ shopId, status: 'IN_STOCK', limit: 500, sort: 'new' })).items.map((r) => ({ id: r.id, kind: 'imei', productId: r.productId, name: `${r.product.name}${r.variant ? ` · ${r.variant.name}` : ''}`, ref: r.imei1, sub: r.color ?? undefined, cost: Number(r.costPrice) || 0 })),
  writeOff: (row, how, reason) => imeiApi.update(row.id, { status: how === 'DAMAGE' ? 'DAMAGED' : 'LOST', notes: reason || undefined }),
});
registerDeviceSource('mobile', {
  kind: 'used', label: msg('Used phones'), icon: Smartphone, transferField: 'usedPhoneId',
  load: async (shopId) => (await usedPhonesApi.list({ shopId, status: 'IN_STOCK', limit: 200, sort: 'new' })).items.map((u) => ({ id: u.id, kind: 'used', productId: '', name: `${u.brand} ${u.model}${u.storage ? ` ${u.storage}` : ''}`, ref: u.usedPhoneCode, sub: u.imei1, cost: Number(u.totalCost) || 0 })),
  writeOff: (row, how, reason) => usedPhonesApi.discard(row.id, [how === 'DAMAGE' ? 'Kharab' : 'Gum', reason].filter(Boolean).join(': ')),
});
