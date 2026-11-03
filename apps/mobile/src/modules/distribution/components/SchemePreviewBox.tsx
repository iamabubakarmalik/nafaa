/**
 * "Test karein": an item, a quantity in packs and optionally a customer go
 * to the server, which prices the line on the customer's list and applies
 * the running schemes exactly as an order would. Shows the scheme that won,
 * the rupees off, the free goods and the net rate.
 */

import { useQuery } from '@tanstack/react-query';
import { Gift, Search, Sparkles, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Card, IconButton, Input, Row, Select, Skeleton, Text, useDebouncedValue, useTheme } from '@/design';
import { DIST_KEY, distSetupApi } from '../api/distribution.api';
import { partyOf, useCustomerRoster, type ProductHit } from '../api/setup-lookups';
import { packText, rs } from '../lib/meta';
import { digits, errText, num } from '../lib/setup';
import { ProductPickSheet } from './SetupPickers';

export function SchemePreviewBox({ title, hint, initialProduct, note }: { title: string; hint?: string; initialProduct?: ProductHit | null; note?: string }) {
  const th = useTheme();
  const [product, setProduct] = useState<ProductHit | null>(initialProduct ?? null);
  const [picking, setPicking] = useState(false);
  const [qty, setQty] = useState('10');
  const [unitKey, setUnitKey] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const rosterQ = useCustomerRoster();
  const seeded = useRef(!!initialProduct);
  useEffect(() => { if (initialProduct && !seeded.current) { seeded.current = true; setProduct(initialProduct); } }, [initialProduct]);

  const resolveQ = useQuery({
    queryKey: [DIST_KEY, 'resolve', product?.id, customerId],
    queryFn: () => distSetupApi.resolve({ productIds: [product!.id], customerId: customerId || undefined }),
    enabled: !!product,
  });
  const packs = useMemo(() => (resolveQ.data?.items ?? []).filter((i) => i.productId === product?.id && !i.variantId).sort((a, b) => a.conversionRate - b.conversionRate), [resolveQ.data, product]);
  const pack = packs.find((p) => (p.unitId ?? '') === unitKey) ?? packs[packs.length - 1];
  const q = useDebouncedValue(num(qty) ?? 0, 300);
  const baseQty = pack ? q * pack.conversionRate : 0;

  const previewQ = useQuery({
    queryKey: [DIST_KEY, 'scheme-preview', product?.id, pack?.unitId, pack?.perBase, baseQty, customerId],
    queryFn: () => distSetupApi.schemePreview({ customerId: customerId || undefined, lines: [{ productId: product!.id, baseQty, unitPrice: pack!.perBase }] }),
    enabled: !!product && !!pack && baseQty > 0,
  });
  const r = previewQ.data?.lines[0];
  const gross = pack ? q * pack.price : 0;
  const net = gross - (r?.discount ?? 0);
  const customers = (rosterQ.data ?? []).filter((c) => c.isActive !== false).slice(0, 300);
  const baseUnit = packs[0]?.unitName ?? product?.unit ?? 'pcs';
  const err = resolveQ.error ?? previewQ.error;

  return (
    <Card title={title} description={hint}>
      <View style={{ gap: th.space(3) }}>
        {product ? (
          <Row gap={2} style={{ padding: th.space(2), paddingStart: th.space(3), borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted }}>
            <Text weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{product.name}</Text>
            <IconButton icon={X} label={t('Item badlein')} size="sm" onPress={() => { setProduct(null); setUnitKey(null); }} />
          </Row>
        ) : <Button variant="secondary" icon={Search} onPress={() => setPicking(true)}>{t('Item chunein…')}</Button>}
        <Row gap={3} align="start">
          <Input containerStyle={{ flex: 1 }} ltr label={t('Qty')} value={qty} onChangeText={(v) => setQty(digits(v))} keyboardType="decimal-pad" />
          <View style={{ flex: 1 }}>
            <Select label={t('Pack')} value={pack?.unitId ?? ''} onChange={setUnitKey} disabled={!packs.length}
              options={packs.length ? packs.map((p) => ({ value: p.unitId ?? '', label: p.conversionRate > 1 ? `${p.unitName} (${p.conversionRate})` : p.unitName })) : [{ value: '', label: '—' }]} />
          </View>
        </Row>
        {customers.length > 0 && (
          <Select label={t('Customer (marzi)')} value={customerId} onChange={setCustomerId} searchable
            options={[{ value: '', label: t('Default list wala customer') }, ...customers.map((c) => ({ value: c.id, label: partyOf(c) }))]} />
        )}

        <View style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted, gap: th.space(1.5) }}>
          {!product ? <Text size="sm" tone="muted" align="center">{t('Item chunein')}</Text>
            : resolveQ.isLoading || previewQ.isLoading ? <Skeleton height={80} />
            : err ? <Text size="sm" tone="danger">{errText(err)}</Text>
            : !pack ? <Text size="sm" tone="muted">{t('Is item ka rate nahi mila')}</Text>
            : (
              <>
                <Line k={`${q} ${pack.unitName} × ${rs(pack.price)}`} v={rs(gross)} />
                {resolveQ.data?.priceListName && <Text size="xs" tone="muted">{t('Rate: {{priceListName}} list', { priceListName: resolveQ.data.priceListName })}</Text>}
                {r?.schemeId ? (
                  <>
                    <Row gap={1.5}><Sparkles size={14} color={th.colors.accent.text} /><Text size="sm" weight="semibold" style={{ color: th.colors.accent.text }}>{r.schemeName}</Text></Row>
                    {r.discount > 0 && <Line k={t('Discount')} v={`− ${rs(r.discount)}`} tone="success" />}
                    {r.freeBaseQty > 0 && (
                      <Row gap={1.5}>
                        <Gift size={14} color={th.colors.success.text} />
                        <Text size="sm" weight="semibold" tone="success" style={{ flex: 1 }}>
                          {t('{{freeBaseQty}} free{{value}}', {
                            freeBaseQty: packText(r.freeBaseQty, r.freeProductId ? null : pack.conversionRate, r.freeProductId ? null : pack.unitName, baseUnit),
                            value: r.freeProductId ? t(' (doosra item)') : '',
                          })}
                        </Text>
                      </Row>
                    )}
                  </>
                ) : <Text size="sm" tone="muted">{t('Is qty par koi scheme nahi lagti')}</Text>}
                <View style={{ borderTopWidth: 1, borderTopColor: th.colors.divider, paddingTop: th.space(1.5) }}>
                  <Line k={t('Kul')} v={rs(net)} bold />
                  {q > 0 && <Text size="xs" tone="muted" align="end">{t('{{rs}} per {{unitName}}', { rs: rs(net / q), unitName: pack.unitName })}</Text>}
                </View>
              </>
            )}
        </View>
        {note && <Text size="xs" tone="muted">{note}</Text>}
      </View>
      {picking && <ProductPickSheet open onClose={() => setPicking(false)} onPick={(p) => { setProduct(p); setUnitKey(null); }} />}
    </Card>
  );
}

function Line({ k, v, tone, bold }: { k: string; v: string; tone?: 'success'; bold?: boolean }) {
  return (
    <Row gap={2} justify="between">
      <Text size="sm" tone="muted" style={{ flexShrink: 1 }} numberOfLines={1}>{k}</Text>
      <Text size={bold ? 'md' : 'sm'} weight={bold ? 'bold' : 'semibold'} tone={tone} tabular ltr>{v}</Text>
    </Row>
  );
}
