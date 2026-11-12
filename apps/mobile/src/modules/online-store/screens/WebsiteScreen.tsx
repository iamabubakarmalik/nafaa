/**
 * Website (Nafaa Stores) on mobile: the store's address and status, 30-day
 * numbers, quick switches (COD, WhatsApp button, sold-out products, the
 * WhatsApp confirm step), "show all in-stock products", sharing the link
 * and the recent website orders. Designing the website stays on the web
 * (theme editor); those links open the web app.
 */

import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, EyeOff, Globe, KeyRound, PackageCheck, Paintbrush, Rocket, Share2, ShoppingBag } from 'lucide-react-native';
import { haptic } from '@/core/device/haptics';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, EmptyState, ListRow, Screen, SkeletonRows, Switch, Text, confirm, toast, useTheme } from '@/design';
import { apiErrorMessage } from '../api/online';
import { websiteApi, type StoreFull, type StoreStatus } from '../api/website';
import { CommerceHero } from '../components/CommerceHero';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { openOnWeb, openUrl, openWhatsApp } from '../lib/device';
import { useOnlineGuard } from '../lib/online';

const KEY = ['stores'] as const;

const STATUS: Record<StoreStatus, { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' }> = {
  LIVE: { label: msg('Live'), tone: 'success' },
  PASSWORD: { label: msg('Password laga hai'), tone: 'warning' },
  DRAFT: { label: msg('Abhi band hai'), tone: 'neutral' },
  CLOSED: { label: msg('Band'), tone: 'danger' },
};

export function WebsiteScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canEdit = can(PERMISSIONS.ONLINE_PRODUCTS_MANAGE);
  const { guard } = useOnlineGuard();
  const list = useQuery({ queryKey: [...KEY, 'list'], queryFn: websiteApi.list });
  const store = list.data?.items[0] ?? null;
  const id = store?.id;
  const home = useQuery({ queryKey: [...KEY, id, 'home'], queryFn: () => websiteApi.home(id!), enabled: !!id });
  const full = useQuery({ queryKey: [...KEY, id, 'full'], queryFn: () => websiteApi.get(id!), enabled: !!id });
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });

  const status = useMutation({
    mutationFn: (s: 'LIVE' | 'PASSWORD' | 'DRAFT') => websiteApi.setStatus(id!, s),
    onSuccess: (r) => { haptic('success'); void refresh(); toast.success(r.status === 'LIVE' ? t('Mubarak ho! Website live hai.') : t('Save ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const settings = useMutation({
    mutationFn: (s: Record<string, unknown>) => websiteApi.updateSettings(id!, s),
    onSuccess: (r) => { qc.setQueryData([...KEY, id, 'full'], r); haptic('tap'); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const checkout = useMutation({
    mutationFn: (b: Record<string, unknown>) => websiteApi.saveCheckout(id!, b),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: [...KEY, id, 'full'] }); haptic('tap'); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const inStock = useMutation({
    mutationFn: () => websiteApi.showInStock(id!),
    onSuccess: (r) => { haptic('success'); toast.success(t('{{n}} products badal gaye', { n: r.updated })); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });

  const f: StoreFull | undefined = full.data;
  const s = home.data?.stats;
  const st = STATUS[store?.status ?? 'DRAFT'];
  const done = home.data?.checklist.filter((c) => c.done).length ?? 0;

  return (
    <Screen title={t('Website')} actions={<OnlineMenuButton current="/online/website" />} onRefresh={() => refresh()}>
      <CommerceHero title={store?.name ?? t('Website')} loading={list.isLoading || home.isLoading}
        chip={store ? t(st.label) : undefined} meta={store?.primaryHost}
        stats={[
          { label: t('Visitors (30 din)'), value: String(s?.visitors ?? 0) },
          { label: t('Orders'), value: String(s?.orders ?? 0) },
          { label: t('Sale'), value: <Amount value={s?.revenue ?? 0} /> },
          { label: t('Conversion'), value: `${(s?.conversion ?? 0).toFixed(1)}%` },
        ]} />

      {list.isLoading ? <SkeletonRows count={4} /> : !store ? (
        <Card>
          <EmptyState icon={Globe} title={t('10 minute me apni website')} message={t('Computer par Nafaa kholein aur website banayein. Phir yahan se chalayein.')}
            action={<Button icon={ExternalLink} onPress={() => openOnWeb('/online-store/site/setup')}>{t('Web par kholein')}</Button>} />
        </Card>
      ) : (
        <>
          <Card title={t('Website ki halat')} description={t('{{done}} / {{total}} kaam ho gaye', { done, total: home.data?.checklist.length ?? 8 })}
            action={<Badge tone={st.tone}>{t(st.label)}</Badge>}>
            <View style={{ gap: th.space(2), padding: th.space(4), paddingTop: th.space(2) }}>
              <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                <Button style={{ flex: 1 }} variant="secondary" icon={ExternalLink} onPress={() => openUrl(store.url)}>{t('Store dekhein')}</Button>
                <Button style={{ flex: 1 }} variant="secondary" icon={Share2} onPress={() => void openWhatsApp(null, t('Hamari website dekhein: {{url}}', { url: store.url }))}>{t('Link bhejein')}</Button>
              </View>
              {canEdit && store.status !== 'LIVE' && (
                <Button icon={Rocket} loading={status.isPending} onPress={guard(() => status.mutate('LIVE'))}>{t('Live karein')}</Button>
              )}
              {canEdit && store.status === 'LIVE' && (
                <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                  {f?.hasPassword && <Button style={{ flex: 1 }} size="sm" variant="ghost" icon={KeyRound} onPress={guard(() => status.mutate('PASSWORD'))}>{t('Password lagayein')}</Button>}
                  <Button style={{ flex: 1 }} size="sm" variant="ghost" icon={EyeOff}
                    onPress={guard(async () => { if (await confirm({ title: t('Website band karein?'), message: t('Customers website nahi khol sakenge. Data sab mehfooz rahega.'), confirmLabel: t('Band karein'), tone: 'danger' })) status.mutate('DRAFT'); })}>
                    {t('Band karein')}
                  </Button>
                </View>
              )}
            </View>
          </Card>

          {f && canEdit && (
            <Card title={t('Jaldi switches')}>
              <View style={{ gap: th.space(1), padding: th.space(4), paddingTop: th.space(2) }}>
                <Switch label={t('Cash on Delivery (COD)')} value={f.checkout.payments.cod}
                  onChange={(v) => guard(() => checkout.mutate({ payments: { ...f.checkout.payments, cod: v } }))()} />
                <Switch label={t('COD order ke baad WhatsApp confirm')} value={f.checkout.codConfirmWhatsApp}
                  onChange={(v) => guard(() => checkout.mutate({ codConfirmWhatsApp: v }))()} />
                <Switch label={t('WhatsApp ka gol button har page par')} value={f.settings.whatsappButton.enabled}
                  onChange={(v) => guard(() => settings.mutate({ whatsappButton: { ...f.settings.whatsappButton, enabled: v } }))()} />
                <Switch label={t('Khatam stock wale bhi dikhayein ("Sold out")')} value={f.settings.showOutOfStock}
                  onChange={(v) => guard(() => settings.mutate({ showOutOfStock: v }))()} />
                <Switch label={t('Website par Urdu bhi (English hamesha)')} value={!!f.settings.languages?.enabled.includes('ur')}
                  onChange={(v) => guard(() => settings.mutate({ languages: { default: 'en', enabled: v ? ['en', 'ur'] : ['en'] } }))()} />
                <Button variant="secondary" icon={PackageCheck} loading={inStock.isPending} onPress={guard(() => inStock.mutate())} style={{ marginTop: th.space(2) }}>
                  {t('Sab in-stock dikhayein')}
                </Button>
              </View>
            </Card>
          )}

          <Card title={t('Naye website orders')} flush>
            {home.isLoading ? <SkeletonRows count={3} /> : !home.data?.recentOrders.length ? (
              <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Abhi website se koi order nahi aaya')}</Text>
            ) : home.data.recentOrders.map((o, i) => (
              <ListRow key={o.id} icon={ShoppingBag} title={`#${o.orderNumber} · ${o.customerName ?? t('Customer')}`} subtitle={new Date(o.receivedAt).toLocaleString()}
                trailing={<Amount value={o.total} />} divider={i > 0} chevron onPress={() => router.push(`/online/orders/${o.id}`)} />
            ))}
          </Card>

          <Card title={t('Design aur baqi kaam')} description={t('Ye computer par behtar chalte hain')} flush>
            <ListRow icon={Paintbrush} title={t('Theme editor')} chevron onPress={() => openOnWeb('/online-store/site/theme')} />
            <ListRow icon={PackageCheck} title={t('Website products')} chevron divider onPress={() => openOnWeb('/online-store/site/products')} />
            <ListRow icon={Globe} title={t('Domains')} chevron divider onPress={() => openOnWeb('/online-store/site/domains')} />
          </Card>
        </>
      )}
    </Screen>
  );
}
