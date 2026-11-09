/**
 * Sales channels: every connected store with its status, last order and new
 * orders waiting; pause or resume one and send a test order. Connecting a
 * new channel (Shopify, WooCommerce, Daraz OAuth, keys, plugins) stays on
 * the web, so the "connect" list opens the web app.
 */

import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Globe, Pause, Play, ShoppingBag } from 'lucide-react-native';
import type { SalesChannel } from '@nafaa/core/online-store';
import { formatRelative } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { Badge, Button, Card, EmptyState, ListTemplate, PressableScale, Text, confirm, toast, useTheme } from '@/design';
import { apiErrorMessage, ordersApi } from '../api/online';
import { BrandLogo, ChannelLogo, type BrandName } from '../components/BrandLogo';
import { ConnectOnWebCard, SavedDataNote } from '../components/bits';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { KpiHero } from '../components/CommerceHero';
import { KEYS, useOnlineGuard } from '../lib/online';
import { openOnWeb } from '../lib/device';

const KINDS: Array<{ brand: BrandName; name: string; desc: string; path: string }> = [
  { brand: 'shopify', name: 'Shopify', desc: msg('Install dabayein — orders, stock aur tracking khud'), path: '/online-store/connect?platform=shopify' },
  { brand: 'woocommerce', name: 'WooCommerce', desc: msg('WordPress website — Approve dabayein, baaqi Nafaa khud'), path: '/online-store/connect?platform=woocommerce' },
  { brand: 'daraz', name: 'Daraz', desc: msg('Seller account se Allow — orders, stock, label'), path: '/online-store/connect?platform=daraz' },
  { brand: 'foodpanda', name: 'foodpanda', desc: msg('Restaurant orders seedha counter par'), path: '/online-store/foodpanda' },
  { brand: 'website', name: 'Website', desc: msg('Developer ke liye tayyar code aur key'), path: '/online-store/connect?platform=custom' },
];

export function ChannelsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canEdit = can(PERMISSIONS.SETTINGS_EDIT) || can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const { guard } = useOnlineGuard('integrations');
  const q = useQuery({ queryKey: KEYS.channels, queryFn: ordersApi.channels, staleTime: 60_000 });
  const channels = q.data ?? [];
  const live = channels.filter((c) => c.live).length;
  const pending = channels.reduce((a, c) => a + (c.pendingOrders || 0), 0);
  const toggle = useMutation({
    mutationFn: (c: SalesChannel) => (c.live ? ordersApi.pause(c.id) : ordersApi.resume(c.id)),
    onSuccess: (_r, c) => { qc.invalidateQueries({ queryKey: KEYS.channels }); toast.success(c.live ? t('{{name}} ruk gaya — naye orders nahi aayenge', { name: c.displayName }) : t('{{name}} dobara chalu', { name: c.displayName })); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const test = useMutation({
    mutationFn: (c: SalesChannel) => ordersApi.testOrder(c.id),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: KEYS.orders }); toast.success(r.message || t('Test order aa gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });

  return (
    <ListTemplate
      title={t('Sales channels')}
      subtitle={t('Jahan jahan aap bechte hain — har channel ke orders Online orders me, aur stock sab ka ek')}
      actions={<OnlineMenuButton current="/online/channels" />}
      summary={(
        <View style={{ gap: th.space(3) }}>
          <SavedDataNote query={q} />
          {channels.length > 0 && (
            <KpiHero items={[
              { key: 'l', label: t('Live'), icon: Globe, tone: 'success', value: String(live), hint: channels.length - live ? t('{{value}} band', { value: channels.length - live }) : undefined },
              { key: 'p', label: t('Naye orders'), icon: ShoppingBag, tone: 'warning', value: String(pending), hint: pending ? t('accept karne') : undefined, onPress: () => router.push('/online' as never) },
            ]} />
          )}
        </View>
      )}
      data={channels}
      loading={q.isLoading}
      error={q.isError && !q.data ? q.error : undefined}
      onRetry={q.refetch}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      keyExtractor={(c) => c.id}
      renderItem={({ item: c }) => (
        <PressableScale onPress={() => router.push(`/online?channel=${c.id}&tab=ALL` as never)} style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(3), gap: th.space(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
            <ChannelLogo type={c.type} platform={c.platform} size={40} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5), flexWrap: 'wrap' }}>
                <Text size="sm" weight="bold" numberOfLines={1}>{c.displayName}</Text>
                <Badge tone={c.live ? 'success' : 'neutral'} dot>{c.live ? t('Live') : t('Band')}</Badge>
                {c.oneClick && <Badge tone="info">{t('Automatic')}</Badge>}
              </View>
              <Text size="xs" tone="muted" numberOfLines={1}>{[c.siteUrl?.replace(/^https?:\/\//, ''), c.lastOrderAt ? t('aakhri order {{lastOrderAt}}', { lastOrderAt: formatRelative(c.lastOrderAt) }) : t('abhi koi order nahi')].filter(Boolean).join(' · ')}</Text>
            </View>
            {c.pendingOrders > 0 && <Badge tone="warning">{t('{{pendingOrders}} naye', { pendingOrders: c.pendingOrders })}</Badge>}
          </View>
          {canEdit && (
            <View style={{ flexDirection: 'row', gap: th.space(2), paddingStart: 52 }}>
              <Button size="sm" variant="secondary" icon={c.live ? Pause : Play} loading={toggle.isPending && toggle.variables?.id === c.id}
                onPress={guard(async () => { if (!c.live || await confirm({ title: t('{{name}} rokein?', { name: c.displayName }), message: t('Rukne par is channel ke naye orders Nafaa me nahi aayenge.'), confirmLabel: t('Rokein'), tone: 'warning' })) toggle.mutate(c); })}>
                {c.live ? t('Rokein') : t('Chalu karein')}
              </Button>
              {c.isWebsite && c.live && <Button size="sm" variant="ghost" icon={FlaskConical} loading={test.isPending && test.variables?.id === c.id} onPress={guard(() => test.mutate(c))}>{t('Test order')}</Button>}
            </View>
          )}
        </PressableScale>
      )}
      empty={<EmptyState icon={Globe} title={t('Abhi koi channel nahi jura')} message={t('Apna store jorein — orders khud Nafaa me aayenge, ghanti bajegi, aur stock dono jagah ek rahega.')} />}
      footer={(
        <View style={{ padding: th.space(4), gap: th.space(3) }}>
          <ConnectOnWebCard />
          <Card flush title={t('Naya channel jorein')} description={t('Har channel ki apni setup guide hai — har qadam par kahan click karna hai')}>
            {KINDS.map((k) => (
              <PressableScale key={k.brand} onPress={() => openOnWeb(k.path)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
                <BrandLogo name={k.brand} size={32} />
                <View style={{ flex: 1 }}>
                  <Text size="sm" weight="semibold">{k.brand === 'website' ? t('Apni banayi website') : k.name}</Text>
                  <Text size="xs" tone="muted">{t(k.desc)}</Text>
                </View>
                <Text size="xs" weight="semibold" tone="brand">{t('Web par')}</Text>
              </PressableScale>
            ))}
          </Card>
        </View>
      )}
    />
  );
}
