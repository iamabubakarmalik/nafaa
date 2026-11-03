/** IMEI sheets (web components/imei): add phones to a model, edit one phone, and the IMEI check (the whole story of one number). */

import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ClipboardPaste, Recycle, ScanLine, ShieldCheck, ShieldOff, Smartphone, Trash2, Wrench } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { imeiLineProblem, parseImeiPaste } from '@nafaa/core/industries/mobile';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, Card, ChipGroup, DetailRow, IconButton, Input, ListRow, MoneyInput, Row, Select, Sheet, Skeleton, Text, TextArea, confirm, toast, useTheme } from '@/design';
import { productsApi, variantsApi } from '@/modules/inventory/api/products';
import { CameraScan } from '@/modules/pos/components/CameraScan';
import { imeiApi, type ImeiRow, type ImeiStatus, type PtaStatus } from '../api';
import { IMEI_STATUSES, PTA_HINT, PTA_LIST, conditionOf, imeiStatusOf, metaText, ptaOf, refreshMobile, repairStatusOf, sourceOf, usedStatusOf } from '../meta';
import { ImeiInput, MetaPill, ProductField, useShopId } from './kit';
import { router } from 'expo-router';

const digitsOnly = (v: string) => v.replace(/\D/g, '');

/** Adds phones by IMEI to a model (and variant): scan boxes one after another, paste a list or type. */
export function AddImeisSheet({ open, productId: fixedId, onClose }: { open: boolean; productId?: string; onClose: () => void }) {
  const th = useTheme();
  const shopId = useShopId();
  const [product, setProduct] = useState<{ id: string; name: string; costPrice?: number } | null>(null);
  const [variantId, setVariantId] = useState('');
  const [cost, setCost] = useState<number | null>(null);
  const [warranty, setWarranty] = useState('12');
  const [pta, setPta] = useState<PtaStatus>('APPROVED');
  const [lines, setLines] = useState<Array<{ imei1: string; imei2: string }>>([]);
  const [one, setOne] = useState('');
  const [paste, setPaste] = useState('');
  const [scan, setScan] = useState(false);
  const pid = fixedId ?? product?.id ?? '';
  const fixed = useQuery({ queryKey: ['product', fixedId], queryFn: () => productsApi.getOne(fixedId!), enabled: !!fixedId && open });
  const variants = useQuery({ queryKey: ['product-variants', pid], queryFn: () => variantsApi.list(pid), enabled: !!pid && open });
  const active = (variants.data ?? []).filter((v) => v.isActive !== false);
  useEffect(() => { if (open) { setLines([]); setOne(''); setPaste(''); setVariantId(''); setProduct(null); } }, [open]);
  useEffect(() => {
    const v = active.find((x) => x.id === variantId);
    const c = v?.costPrice ?? fixed.data?.costPrice ?? product?.costPrice;
    if (c) setCost(Number(c));
  }, [variantId, fixed.data?.costPrice, product?.costPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  const known = useMemo(() => new Set(lines.flatMap((l) => [l.imei1, l.imei2].filter(Boolean))), [lines]);
  const add = (a: string, b = '') => {
    const x = digitsOnly(a);
    if (x.length !== 15 || known.has(x)) return false;
    setLines((ls) => [...ls, { imei1: x, imei2: digitsOnly(b).length === 15 ? digitsOnly(b) : '' }]);
    return true;
  };
  const rows = parseImeiPaste(paste);
  const problem = !pid ? t('Model chunein') : active.length > 0 && !variantId ? t('Variant chunein') : !lines.length ? t('Kam az kam ek IMEI daalein')
    : lines.some((l) => l.imei2 && l.imei2 === l.imei1) ? t('IMEI 1 aur 2 ek jaise nahi ho sakte') : null;

  const save = useMutation({
    mutationFn: () => imeiApi.bulkCreate({ productId: pid, variantId: variantId || undefined, shopId: shopId ?? undefined, costPrice: cost ?? undefined, warrantyMonths: Number(warranty) || 0, imeis: lines.map((l) => ({ imei1: l.imei1, imei2: l.imei2 || undefined, ptaStatus: pta })) }),
    onSuccess: (r) => {
      toast.success(t('{{count}} phone stock me aa gaye', { count: r.count }));
      if (r.badChecksum?.length) toast.warning(t('{{count}} IMEI ka check digit nahi milta — dobara dekh lein', { count: r.badChecksum.length }));
      refreshMobile([IMEI_KEY_ALL, 'mobile-imei-shelf', 'mobile-product-imeis', 'product', 'products-catalog', 'inv'], true);
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('IMEI save nahi hue'))),
  });

  return (
    <Sheet open={open} onClose={onClose} height={0.94} title={t('IMEI daalein')} description={t('Dabbe scan karein ya list paste karein')}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{lines.length ? t('{{count}} phone jorein', { count: lines.length }) : t('IMEI daalein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {!fixedId && <ProductField label={t('Model')} value={product} onChange={(p) => { setProduct({ id: p.product.id, name: p.product.name }); setVariantId(p.variantId ?? ''); }} />}
        {fixedId && fixed.data && <Text weight="semibold">{fixed.data.name}</Text>}
        {active.length > 0 && <Select label={t('Variant')} value={variantId} onChange={setVariantId} placeholder={t('Chunein…')} options={active.map((v) => ({ value: v.id, label: v.name }))} />}
        <Row gap={2}>
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Cost (har phone)')} value={cost} onChangeValue={setCost} />
          <Input containerStyle={{ flex: 1 }} label={t('Warranty (mahine)')} value={warranty} onChangeText={(v) => setWarranty(v.replace(/\D/g, ''))} keyboardType="number-pad" ltr />
        </Row>
        <Text size="sm" weight="medium" tone="secondary">{t('PTA')}</Text>
        <ChipGroup wrap value={pta} onChange={setPta} options={PTA_LIST.map((p) => ({ value: p, label: t(ptaOf(p).label) }))} />
        <Text size="xs" tone="muted">{t(PTA_HINT[pta])}</Text>
        <ImeiInput label={t('IMEI 1')} value={one} onValue={setOne} onScanned={(c) => { if (!add(c)) toast.warning(t('IMEI pehle se hai ya 15 number ka nahi')); }} />
        <Button variant="soft" disabled={one.length !== 15} onPress={() => { if (add(one)) setOne(''); else toast.warning(t('IMEI pehle se hai ya 15 number ka nahi')); }}>{t('List me jorein')}</Button>
        <Button variant="secondary" icon={ScanLine} onPress={() => setScan(true)}>{t('Dabba scan karein')}</Button>
        <Card flush title={t('Excel ya WhatsApp se paste (har line: IMEI 1, IMEI 2)')}>
          <View style={{ padding: th.space(3), gap: th.space(2) }}>
            <TextArea value={paste} onChangeText={setPaste} placeholder={'356789012345678, 356789012345686\n356789012345694'} ltr />
            {rows.length > 0 && <Button icon={ClipboardPaste} variant="soft" onPress={() => { rows.forEach((p) => add(p[0], p[1] ?? '')); setPaste(''); }}>{t('{{count}} jorein', { count: rows.length })}</Button>}
          </View>
        </Card>
        {lines.length > 0 && (
          <Card flush title={t('{{count}} IMEI', { count: lines.length })}>
            {lines.map((l, i) => (
              <ListRow key={l.imei1} divider={i < lines.length - 1} dense title={<Text ltr weight="semibold">{l.imei1}</Text>} subtitle={l.imei2 ? <Text size="xs" tone="muted" ltr>{l.imei2}</Text> : undefined}
                trailing={<IconButton icon={Trash2} label={t('Hatayein')} size="sm" variant="danger" onPress={() => setLines(lines.filter((_, j) => j !== i))} />} />
            ))}
          </Card>
        )}
        {problem && lines.length > 0 && <Text size="xs" tone="danger">{problem}</Text>}
      </View>
      {scan && (
        <CameraScan title={t('Dabba scan karein')} continuous onClose={() => setScan(false)}
          onCode={(c) => { const d = digitsOnly(c); if (d.length !== 15) return false; return add(d); }} footer={<Text size="sm" tone="inverse">{t('{{count}} IMEI', { count: lines.length })}</Text>} />
      )}
    </Sheet>
  );
}

const IMEI_KEY_ALL = 'mobile-imeis';
const SHELF: ImeiStatus[] = ['IN_STOCK', 'RESERVED', 'DAMAGED', 'LOST'];

/** One phone's record: PTA, shelf status, cost, warranty and notes. A sold phone only takes PTA and notes. */
export function EditImeiSheet({ row, canManage, onClose }: { row: ImeiRow | null; canManage: boolean; onClose: () => void }) {
  const th = useTheme();
  const sold = row?.status === 'SOLD';
  const [f, setF] = useState({ imei1: '', imei2: '', pta: 'APPROVED' as PtaStatus, status: 'IN_STOCK' as ImeiStatus, cost: null as number | null, warranty: '', color: '', notes: '' });
  useEffect(() => {
    if (row) setF({ imei1: row.imei1, imei2: row.imei2 ?? '', pta: row.ptaStatus, status: row.status, cost: Number(row.costPrice ?? 0), warranty: String(row.warrantyMonths ?? ''), color: row.color ?? '', notes: row.notes ?? '' });
  }, [row]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const writeOff = !!row && !sold && f.status !== row.status && (f.status === 'DAMAGED' || f.status === 'LOST');
  const save = useMutation({
    mutationFn: () => imeiApi.update(row!.id, sold
      ? { ptaStatus: f.pta, notes: f.notes.trim() || undefined, warrantyMonths: Number(f.warranty) || 0 }
      : { imei1: f.imei1, imei2: f.imei2 || undefined, ptaStatus: f.pta, status: f.status, costPrice: f.cost ?? 0, warrantyMonths: Number(f.warranty) || 0, color: f.color.trim() || undefined, notes: f.notes.trim() || undefined }),
    onSuccess: () => { toast.success(t('Save ho gaya')); refreshMobile([IMEI_KEY_ALL, 'mobile-imei-shelf', 'mobile-product-imeis', 'product', 'products-catalog', 'inv'], true); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const remove = async () => {
    if (!row || !(await confirm({ title: t('Ye IMEI hata dein?'), message: t('Sirf ghalat likha hua IMEI hatayein. Stock bhi us hisaab se theek ho jayega.'), tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    try { await imeiApi.remove(row.id); toast.success(t('Ghalat IMEI hata diya — stock bhi theek ho gaya')); refreshMobile([IMEI_KEY_ALL, 'mobile-imei-shelf', 'mobile-product-imeis', 'product', 'products-catalog', 'inv'], true); onClose(); }
    catch (e) { toast.error(apiErrorMessage(e, t('Nahi hata'))); }
  };
  const bad = !sold && (!/^\d{15}$/.test(f.imei1) || (!!f.imei2 && !/^\d{15}$/.test(f.imei2)) || f.imei1 === f.imei2);
  return (
    <Sheet open={!!row} onClose={onClose} height={0.92} title={row ? `${row.product.name}${row.variant ? ` · ${row.variant.name}` : ''}` : undefined}
      description={row ? t('IMEI {{imei1}} · {{label}}', { imei1: row.imei1, label: t(imeiStatusOf(row.status).label) }) : undefined}
      footer={canManage && row ? (
        <Row gap={2}>
          {!sold && <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="lg" onPress={() => void remove()} />}
          <Button style={{ flex: 1 }} size="lg" loading={save.isPending} disabled={bad} onPress={() => save.mutate()}>{t('Save')}</Button>
        </Row>
      ) : undefined}>
      {row && (
        <View style={{ gap: th.space(3) }}>
          {row.sale && <Text size="sm" tone="secondary">{t('Bill {{n}}', { n: row.sale.saleNumber })}{row.sale.customer ? ` · ${row.sale.customer.name}` : ''}</Text>}
          {!sold && (
            <>
              <ImeiInput label={t('IMEI 1')} value={f.imei1} onValue={(v) => set({ imei1: v })} disabled={!canManage} />
              <ImeiInput label={t('IMEI 2')} value={f.imei2} onValue={(v) => set({ imei2: v })} disabled={!canManage} />
            </>
          )}
          <Text size="sm" weight="medium" tone="secondary">{t('PTA')}</Text>
          <ChipGroup wrap value={f.pta} onChange={(pta) => set({ pta })} options={PTA_LIST.map((p) => ({ value: p, label: t(ptaOf(p).label) }))} />
          {!sold && (
            <>
              <Text size="sm" weight="medium" tone="secondary">{t('Halat')}</Text>
              <ChipGroup wrap value={f.status} onChange={(status) => set({ status })} options={SHELF.map((s) => ({ value: s, label: t(imeiStatusOf(s).label) }))} />
              {writeOff && <Text size="xs" tone="warning">{t('Kharab ya gum phone cost par write-off hoga — stock se nikal jayega.')}</Text>}
              <MoneyInput label={t('Cost')} value={f.cost} onChangeValue={(cost) => set({ cost })} />
              <Input label={t('Rang')} value={f.color} onChangeText={(color) => set({ color })} />
            </>
          )}
          <Input label={t('Warranty (mahine)')} value={f.warranty} onChangeText={(v) => set({ warranty: v.replace(/\D/g, '') })} keyboardType="number-pad" ltr />
          <TextArea label={t('Note')} value={f.notes} onChangeText={(notes) => set({ notes })} />
        </View>
      )}
    </Sheet>
  );
}

/** IMEI check: one number's whole story in this shop. */
export function ImeiLookupSheet({ open, initial = '', onClose }: { open: boolean; initial?: string; onClose: () => void }) {
  const th = useTheme();
  const [text, setText] = useState(initial);
  const [code, setCode] = useState(digitsOnly(initial).length >= 5 ? digitsOnly(initial) : '');
  useEffect(() => { if (open) { setText(initial); setCode(digitsOnly(initial).length >= 5 ? digitsOnly(initial) : ''); } }, [open, initial]);
  const q = useQuery({ queryKey: ['mobile-imei-lookup', code], queryFn: () => imeiApi.lookup(code), enabled: open && code.length >= 5, retry: false });
  const d = q.data;
  const empty = d && !d.newPhones.length && !d.usedPhones.length && !d.repairs.length;
  const go = (c: string) => { setText(c); if (c.length >= 5) setCode(c); };
  const visits = d ? d.newPhones.filter((p) => p.status === 'SOLD').length + d.usedPhones.length : 0;
  const open1 = (href: string) => { onClose(); router.push(href as never); };
  return (
    <Sheet open={open} onClose={onClose} height={0.94} title={t('IMEI check')} description={t('Warranty, bill, purana record — sab ek jagah')}>
      <View style={{ gap: th.space(3) }}>
        <ImeiInput label={t('IMEI')} value={text} onValue={go} onScanned={go} hint={t('IMEI likhein ya scan karein (*#06#)')} />
        {d?.luhnOk === false && <Text size="sm" tone="warning"><AlertTriangle size={14} color={th.colors.warning.text} /> {t('Ye IMEI ka check digit nahi milta — number dobara dekhein, ya phone ki asliyat check karein.')}</Text>}
        {q.isFetching && !d && <Skeleton height={90} />}
        {q.isError && <Text size="sm" tone="danger">{t('Check nahi ho saka — dobara koshish karein')}</Text>}
        {empty && <Card><Text weight="semibold">{t('Is dukaan me is IMEI ka koi record nahi')}</Text><Text size="sm" tone="muted">{t('Na ye phone yahan se bika, na khareeda gaya, na repair hua.')}</Text></Card>}
        {visits > 1 && <Text size="sm" tone="info">{t('Ye phone {{visits}} dafa is dukaan me aaya — neeche har dafa ka record hai (naya pehle).', { visits })}</Text>}

        {d?.newPhones.map((p) => {
          const w = p.warranty;
          return (
            <Card key={p.id} title={`${p.product.name}${p.variant ? ` · ${p.variant.name}` : ''}`} action={<MetaPill m={imeiStatusOf(p.status)} />}>
              <Row gap={2} wrap>
                <Smartphone size={14} color={th.colors.textMuted} />
                <Text ltr size="sm">{p.imei1}{p.imei2 ? ` / ${p.imei2}` : ''}{p.color ? ` · ${p.color}` : ''}</Text>
                <Badge tone={ptaOf(p.ptaStatus).tone as never}>{metaText(ptaOf(p.ptaStatus))}</Badge>
              </Row>
              <DetailRow label={t('Aaya')} value={`${p.purchasedAt ? formatDate(p.purchasedAt) : '—'}${p.shop ? ` · ${p.shop.name}` : ''}`} />
              {p.sale && <DetailRow label={t('Bill')} value={`${p.sale.saleNumber} · ${formatDate(p.sale.createdAt)}`} />}
              {p.sale?.customer && <DetailRow label={t('Customer')} value={`${p.sale.customer.name}${p.sale.customer.phone ? ` · ${p.sale.customer.phone}` : ''}`} />}
              {p.sale && <DetailRow label={t('Bika')} value={formatMoney(p.sale.price)} last />}
              {p.status === 'SOLD' && (
                <Row gap={2} style={{ marginTop: th.space(2), padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: w.active ? th.colors.success.soft : th.colors.surfaceMuted }}>
                  {w.active ? <ShieldCheck size={16} color={th.colors.success.text} /> : <ShieldOff size={16} color={th.colors.textMuted} />}
                  <Text size="sm" weight="medium" style={{ flex: 1 }}>
                    {!w.months ? t('Is phone par dukaan ki warranty nahi thi') : w.active ? t('Warranty baqi — {{daysLeft}} din ({{end}} tak)', { daysLeft: w.daysLeft ?? 0, end: formatDate(w.end ?? '') }) : t('Warranty khatam — {{end}} ko', { end: formatDate(w.end ?? '') })}
                  </Text>
                </Row>
              )}
              {p.notes ? <Text size="xs" tone="muted">{p.notes}</Text> : null}
            </Card>
          );
        })}
        {d?.usedPhones.map((u) => (
          <Card key={u.id} title={`${u.brand} ${u.model}${u.storage ? ` ${u.storage}` : ''}`} description={u.usedPhoneCode} action={<MetaPill m={usedStatusOf(u.status)} />}>
            <DetailRow label={t('Kis se liya')} value={`${u.fromCustomerName || '—'}${u.fromCustomerPhone ? ` · ${u.fromCustomerPhone}` : ''}`} />
            <DetailRow label={t('CNIC')} value={u.fromCustomerCnic || '—'} />
            <DetailRow label={t('Kaise')} value={`${t(sourceOf(u.source).label)} · ${formatDate(u.receivedAt)}`} />
            <DetailRow label={t('Halat')} value={t(conditionOf(u.condition).label)} last={!u.sale} />
            {u.sale && <DetailRow label={t('Aage bika')} value={`${u.sale.saleNumber}${u.sale.customer ? ` · ${u.sale.customer.name}` : ''}`} last />}
            <Button variant="ghost" size="sm" icon={Recycle} onPress={() => open1(`/mobile/used-phones/${u.id}`)}>{t('Kholein')}</Button>
          </Card>
        ))}
        {d?.repairs.map((r) => (
          <Card key={r.id} title={r.ticketNumber} action={<MetaPill m={repairStatusOf(r.status)} />}>
            <Text size="sm" tone="secondary">{r.deviceBrand} {r.deviceModel} — {r.diagnosedIssue || r.reportedIssue}</Text>
            <Text size="xs" tone="muted">{r.customerName} · {r.customerPhone} · {formatDate(r.receivedAt)} · {formatMoney(r.totalCost)}</Text>
            {r.warrantyActive && <Text size="xs" tone="success">{t('Repair warranty {{end}} tak', { end: formatDate(r.warrantyEnds ?? '') })}</Text>}
            <Button variant="ghost" size="sm" icon={Wrench} onPress={() => open1(`/mobile/repairs/${r.id}`)}>{t('Kholein')}</Button>
          </Card>
        ))}
      </View>
    </Sheet>
  );
}
