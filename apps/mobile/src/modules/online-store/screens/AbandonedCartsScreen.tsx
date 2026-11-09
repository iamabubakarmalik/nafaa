/**
 * Abandoned carts (web AbandonedCartsPage): checkouts left on Shopify or the
 * shop's own website. One tap sends the "Cart wapas" WhatsApp message with
 * the recovery link and marks the cart contacted; a later order from the
 * same phone counts as recovered. WooCommerce has no such API (note shown).
 */

import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MessageCircle, RefreshCw, ShoppingCart, Undo2 } from 'lucide-react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, ChipGroup, EmptyState, HeroAmount, IconButton, ListTemplate, PressableScale, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { apiErrorMessage } from '../api/online';
import { commerceApi, type AbandonedCart, type CartStatus } from '../api/board';
import { CommerceHero } from '../components/CommerceHero';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { Note } from '../components/bits';
import { openWhatsApp } from '../lib/device';
import { useOnlineGuard } from '../lib/online';
import { fillTemplate, templateText, useWaTemplates } from '../lib/wa';

const KEY = ['online-abandoned'] as const;
const DAYS = [7, 30, 90];

export function AbandonedCartsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const { guard } = useOnlineGuard();
  const shop = useAuthStore((s) => s.tenant?.name ?? '');
  const saved = useWaTemplates().data?.templates;
  const [status, setStatus] = useState<CartStatus>('OPEN');
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 300);
  const q = useQuery({ queryKey: [...KEY, status, days, query], queryFn: () => commerceApi.abandoned({ status, days, search: query || undefined }), refetchInterval: 60_000 });
  const data = q.data;
  const st = data?.stats;
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });

  const sync = useMutation({
    mutationFn: commerceApi.syncAbandoned,
    onSuccess: (r) => {
      refresh();
      const bad = r.find((x) => !x.ok);
      if (bad) toast.error(`${bad.channel}: ${bad.error ?? ''}`);
      else toast.success(t('{{count}} cart taaza hue', { count: r.reduce((a, x) => a + x.count, 0) }));
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const contacted = useMutation({
    mutationFn: ({ id, undo }: { id: string; undo?: boolean }) => commerceApi.contacted(id, undo),
    onSuccess: refresh,
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const send = (c: AbandonedCart) => {
    const text = fillTemplate(templateText('cart', saved), {
      name: c.customerName ?? '', shop, items: c.items.slice(0, 3).map((i) => `${i.quantity} × ${i.name}`).join(', '),
      total: formatMoney(c.total), cartUrl: c.recoveryUrl ?? '',
    });
    void openWhatsApp(c.customerPhone, text);
    contacted.mutate({ id: c.id });
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <CommerceHero chip={t('{{days}} din', { days })} loading={q.isLoading}
        stats={[
          { label: t('Chhode hue cart'), value: String(st?.carts ?? 0) },
          { label: t('Value'), value: <HeroAmount value={st?.value ?? 0} size="lg" /> },
          { label: t('Rabta kiya'), value: String(st?.contacted ?? 0) },
          { label: t('Wapas aaye'), value: <HeroAmount value={st?.recoveredValue ?? 0} size="lg" />, hint: st ? t('{{count}} order · {{rate}}%', { count: st.recovered, rate: st.rate }) : undefined },
        ]} />
      <ChipGroup value={String(days)} onChange={(v) => setDays(Number(v))} options={DAYS.map((d) => ({ value: String(d), label: t('{{days}} din', { days: d }) }))} />
      {!!data?.sources.woocommerce.length && <Note tone="info">{t('WooCommerce chhode hue cart nahi batata — ye abhi sirf Shopify aur apni website ke liye hai.')}</Note>}
      {data && !data.sources.shopify.length && !data.sources.website.length && (
        <Note tone="warning">{t('Shopify ya apni website jorein — phir chhode hue cart yahan aayenge.')}</Note>
      )}
    </View>
  );

  return (
    <ListTemplate
      title={t('Abandoned carts')}
      actions={<>
        {!!data?.sources.shopify.length && <IconButton icon={RefreshCw} label={t('Shopify se taaza')} onPress={guard(() => sync.mutate())} />}
        <OnlineMenuButton current="/online/abandoned" />
      </>}
      search={{ value: search, onChange: setSearch, placeholder: t('Naam ya phone…') }}
      filters={{ value: status, onChange: (v) => setStatus(v as CartStatus), options: [
        { value: 'OPEN', label: t('Baqi') }, { value: 'CONTACTED', label: t('Rabta kiya') }, { value: 'RECOVERED', label: t('Wapas aaye') }, { value: 'ALL', label: t('Sab') },
      ] }}
      summary={summary}
      data={data?.items ?? []}
      loading={q.isLoading}
      error={q.isError ? q.error : undefined}
      onRetry={q.refetch}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      keyExtractor={(c) => c.id}
      renderItem={({ item: c }) => (
        <View style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(3), gap: th.space(1.5) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            <Text size="base" weight="bold" numberOfLines={1} style={{ flex: 1 }}>{c.customerName || c.customerPhone || t('Naam nahi')}</Text>
            <Text size="base" weight="bold" ltr>{formatMoney(c.total)}</Text>
          </View>
          <Text size="xs" tone="muted" numberOfLines={2}>
            {[c.customerPhone, c.customerCity, c.channel, formatRelative(c.abandonedAt)].filter(Boolean).join(' · ')}
          </Text>
          <Text size="sm" tone="secondary" numberOfLines={2}>{c.items.map((i) => `${i.quantity} × ${i.name}${i.variant ? ` (${i.variant})` : ''}`).join(', ')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: th.space(2) }}>
            {c.recoveredAt ? (
              <PressableScale onPress={() => c.recoveredOrderId && router.push(`/online/orders/${c.recoveredOrderId}` as never)}>
                <Badge tone="success" icon={CheckCircle2}>{t('Wapas aaya · #{{no}}', { no: c.recoveredOrderNo ?? '' })}</Badge>
              </PressableScale>
            ) : c.contactedAt ? <Badge tone="info">{t('Rabta {{count}} dafa · {{when}}', { count: c.contactCount, when: formatRelative(c.contactedAt) })}</Badge> : null}
            <View style={{ flex: 1 }} />
            {!c.recoveredAt && c.contactedAt && <IconButton icon={Undo2} label={t('Rabta wapas lein')} size="sm" onPress={guard(() => contacted.mutate({ id: c.id, undo: true }))} />}
            {!c.recoveredAt && !!c.customerPhone && (
              <Button size="sm" variant="success" icon={MessageCircle} onPress={guard(() => send(c))}>{c.contactedAt ? t('Dobara') : t('WhatsApp')}</Button>
            )}
          </View>
        </View>
      )}
      empty={<EmptyState icon={ShoppingCart} title={t('Koi chhoda hua cart nahi')} message={t('Jab koi checkout chhod dega, yahan aa jayega.')} />}
    />
  );
}
