/**
 * Online customers for selling again: VIP and repeat buyers, who has gone
 * quiet (30/60/90 days), who is new, who returns parcels and who is
 * blocked. Each customer opens with their orders; the broadcast tab sends a
 * ready WhatsApp message (shop language) to the segment one by one.
 * Mirrors the web OnlineCustomersPage.
 */

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Copy, Crown, Download, MessageCircle, Phone, Repeat, Send, ShieldBan, Sparkles, UserMinus, UserPlus, Users } from 'lucide-react-native';
import { orderNo, waNumber, type OnlineCustomer } from '@nafaa/core/online-store';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { kv } from '@/core/storage/kv';
import {
  Amount, Avatar, Badge, Button, Card, ChipGroup, EmptyState, IconButton, Input, ListTemplate, PressableScale, Sheet, SkeletonRows, Tabs, Text,
  TextArea, confirm, toast, useDebouncedValue, useTheme,
} from '@/design';
import { apiErrorMessage, ordersApi } from '../api/online';
import { KpiStrip, OrderStatusBadge, SavedDataNote } from '../components/bits';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { CUSTOMER_SEGMENTS } from '../lib/labels';
import { KEYS, useOnlineGuard } from '../lib/online';
import { callPhone, copyText, openWhatsApp } from '../lib/device';
import { SEGMENT_TEMPLATES, fillTemplate, useShopLanguage } from '../lib/messages';
import { shareCsv } from '../lib/docs';

const LIMIT = 50;
const KV_TPL = 'nafaa.online.customers.templates';
const KV_LINK = 'nafaa.online.customers.link';

export function OnlineCustomersScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const lang = useShopLanguage();
  const { guard } = useOnlineGuard();
  const shop = useAuthStore((s) => s.tenant?.name) ?? '';
  const [tab, setTab] = useState<'list' | 'broadcast'>('list');
  const [segment, setSegment] = useState('all');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 300);
  const [open, setOpen] = useState<OnlineCustomer | null>(null);
  const [custom, setCustom] = useState<Record<string, string>>(() => kv.get(KV_TPL, {}));
  const [link, setLink] = useState<string>(() => kv.get(KV_LINK, ''));
  const [sent, setSent] = useState<Set<string>>(new Set());
  useEffect(() => { kv.set(KV_TPL, custom); kv.set(KV_LINK, link); }, [custom, link]);
  useEffect(() => setSent(new Set()), [segment]);

  const q = useInfiniteQuery({
    queryKey: [...KEYS.customers, segment, query],
    queryFn: ({ pageParam }) => ordersApi.customers({ segment, search: query || undefined, limit: LIMIT, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => { const n = pages.reduce((a, p) => a + p.rows.length, 0); return n < last.total ? n : undefined; },
  });
  const first = q.data?.pages[0];
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.rows) ?? [], [q.data]);
  const counts = first?.counts ?? {};
  const tplKey = `${lang}:${segment}`;
  const tpl = custom[tplKey] ?? SEGMENT_TEMPLATES[lang][segment] ?? '';
  const seg = CUSTOMER_SEGMENTS.find((s) => s.value === segment) ?? CUSTOMER_SEGMENTS[0];
  const text = (c: OnlineCustomer) => fillTemplate(tpl, { naam: c.name, dukaan: shop, link });

  const block = useMutation({
    mutationFn: (c: OnlineCustomer) => (c.blocked ? ordersApi.unblock(c.phone) : ordersApi.block({ phone: c.phone, name: c.name, reason: 'Customers safhe se' })),
    onSuccess: (_r, c) => { toast.success(c.blocked ? t('Unblock ho gaya') : t('Block ho gaya')); qc.invalidateQueries({ queryKey: KEYS.customers }); qc.invalidateQueries({ queryKey: KEYS.blocklist }); setOpen(null); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const askBlock = async (c: OnlineCustomer) => {
    if (c.blocked || await confirm({ title: t('{{name}} ({{phone}}) block karein?', { name: c.name, phone: c.phone }), message: t('Is number ka naya order khud accept nahi hoga.'), tone: 'danger', confirmLabel: t('Block') })) block.mutate(c);
  };
  const fetchAll = async () => {
    const out: OnlineCustomer[] = [];
    for (let offset = 0; offset < 2000; offset += 200) {
      const page = await ordersApi.customers({ segment, search: query || undefined, limit: 200, offset });
      out.push(...page.rows);
      if (out.length >= page.total || !page.rows.length) break;
    }
    return out;
  };
  const exportCsv = async () => {
    try {
      const all = await fetchAll();
      if (!all.length) { toast.error(t('Is list me koi customer nahi')); return; }
      await shareCsv(`online-customers-${segment}.csv`, [
        [t('Naam'), t('Phone'), t('Shehar'), t('Orders'), t('Deliver hue'), t('Wapas'), t('Cancel'), t('Kharch (Rs)'), t('Ausat order'), t('Aakhri order (din pehle)'), t('Channels'), t('Blocked')],
        ...all.map((c) => [c.name, c.phone, c.city ?? '', c.orders, c.delivered, c.returned, c.cancelled, c.spent, c.avgOrder, c.daysSince, c.channels.join(' / '), c.blocked ? t('Haan') : '']),
      ]);
    } catch (e) { toast.error(apiErrorMessage(e, t('CSV nahi bani'))); }
  };
  const copyNumbers = async () => {
    const all = (await fetchAll()).filter((c) => !c.blocked);
    await copyText(all.map((c) => c.phone).join('\n'), t('{{count}} number copy — WhatsApp broadcast list me paste karein', { count: all.length }));
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <SavedDataNote query={q} />
      <KpiStrip items={[
        { key: 'c', label: t('Customers'), icon: Users, loading: !first, value: String(first?.totals.customers ?? 0), hint: t('pichhle 2 saal') },
        { key: 's', label: t('Kul kharch'), icon: Crown, tone: 'success', loading: !first, value: <Amount value={first?.totals.spent ?? 0} size="lg" weight="bold" />, hint: t('deliver hue orders') },
        { key: 'r', label: t('Dobara lene wale'), icon: Repeat, tone: 'info', loading: !first, value: `${first?.totals.repeatRate ?? 0}%`, hint: String(counts.repeat ?? 0), onPress: () => setSegment('repeat') },
        { key: 'v', label: t('VIP'), icon: Crown, tone: 'warning', loading: !first, value: String(counts.vip ?? 0), onPress: () => setSegment('vip') },
        { key: 'i', label: t('30 din se gayab'), icon: UserMinus, tone: 'accent', loading: !first, value: String(counts.inactive30 ?? 0), hint: t('wapas laane ka mauqa'), onPress: () => setSegment('inactive30') },
        { key: 'n', label: t('Naye'), icon: UserPlus, tone: 'brand', loading: !first, value: String(counts.new ?? 0), onPress: () => setSegment('new') },
        { key: 'k', label: t('RTO wale'), icon: ShieldBan, tone: 'danger', loading: !first, value: String(counts.risky ?? 0), hint: t('{{value}} blocked', { value: counts.blocked ?? 0 }), onPress: () => setSegment('risky') },
      ]} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'list', label: t('Customers'), count: first?.total }, { value: 'broadcast', label: t('WhatsApp broadcast') }]} />
      <ChipGroup value={segment} onChange={setSegment} style={{ marginHorizontal: -th.space(4) }} options={CUSTOMER_SEGMENTS.map((s) => ({ value: s.value, label: t(s.label), count: s.value === 'all' ? undefined : counts[s.value] }))} />
      <Text size="xs" tone="muted">{t(seg.hint)}</Text>
      {tab === 'broadcast' && segment !== 'blocked' && (
        <Card title={t('Message')} description={t('{naam}, {dukaan} aur {link} khud badal jate hain.')}>
          <View style={{ gap: th.space(3) }}>
            <TextArea value={tpl} onChangeText={(v) => setCustom({ ...custom, [tplKey]: v })} maxLength={600} />
            <Input label={t('{{value}} — order form ya website ka link', { value: '{link}' })} value={link} onChangeText={setLink} placeholder="https://…" ltr autoCapitalize="none" />
            <View style={{ flexDirection: 'row', gap: th.space(2), flexWrap: 'wrap' }}>
              <Button size="sm" variant="ghost" onPress={() => { const { [tplKey]: _x, ...rest } = custom; setCustom(rest); }}>{t('Pehla wala message')}</Button>
              <Button size="sm" variant="secondary" icon={Copy} disabled={!rows.length} onPress={() => void copyNumbers()}>{t('Sab numbers copy')}</Button>
            </View>
            {rows[0] && (
              <View style={{ backgroundColor: th.colors.success.soft, borderRadius: th.radius('md'), padding: th.space(3) }}>
                <Text size="2xs" weight="semibold" tone="success">{t('{{value}} ko aise jayega', { value: rows[0].name.split(' ')[0] })}</Text>
                <Text size="sm">{text(rows[0])}</Text>
              </View>
            )}
            <Text size="xs" tone="muted">{t('{{size}} / {{count}} bhej diye (is safhe ke). WhatsApp khulega — "Send" dabayein, phir agla.', { size: sent.size, count: rows.filter((c) => waNumber(c.phone) && !c.blocked).length })}</Text>
          </View>
        </Card>
      )}
      {tab === 'broadcast' && segment === 'blocked' && <EmptyState compact icon={Ban} title={t('Blocked customers ko message nahi bhejte')} />}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ListTemplate
        title={t('Online customers')}
        actions={<>
          <IconButton icon={Download} label={t('CSV')} onPress={() => void exportCsv()} />
          <IconButton icon={ShieldBan} label={t('Block list')} onPress={() => router.push('/online/blocklist' as never)} />
          <OnlineMenuButton current="/online/customers" />
        </>}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, phone ya shehar…') }}
        summary={summary}
        data={tab === 'broadcast' && segment === 'blocked' ? [] : rows}
        loading={q.isLoading}
        error={q.isError && !rows.length ? q.error : undefined}
        onRetry={q.refetch}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={q.refetch}
        onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }}
        footer={q.isFetchingNextPage ? <ActivityIndicator style={{ margin: th.space(4) }} /> : undefined}
        keyExtractor={(c) => c.key}
        renderItem={({ item: c }) => tab === 'broadcast' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5) }}>
            <Avatar name={c.name} size={36} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" weight="semibold" numberOfLines={1}>{c.name}</Text>
              <Text size="xs" tone="muted" ltr numberOfLines={1}>{c.phone}{c.city ? ` · ${c.city}` : ''}</Text>
            </View>
            {waNumber(c.phone) && !c.blocked ? (
              <Button size="sm" variant={sent.has(c.key) ? 'secondary' : 'success'} icon={MessageCircle}
                onPress={() => { void openWhatsApp(c.phone, text(c)); setSent((s) => new Set(s).add(c.key)); }}>{sent.has(c.key) ? t('Bhej diya') : t('Bhejein')}</Button>
            ) : <Text size="xs" tone="subtle">{t('Number sahi nahi')}</Text>}
          </View>
        ) : (
          <PressableScale onPress={() => setOpen(c)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5) }}>
            <Avatar name={c.name} size={40} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5), flexWrap: 'wrap' }}>
                <Text size="sm" weight="semibold" numberOfLines={1}>{c.name}</Text>
                {c.segments.includes('vip') && <Badge tone="accent" icon={Crown}>{t('VIP')}</Badge>}
                {c.segments.includes('new') && <Badge tone="info" icon={Sparkles}>{t('Naya')}</Badge>}
                {c.blocked && <Badge tone="danger">{t('Blocked')}</Badge>}
                {c.returned > 0 && !c.blocked && <Badge tone="warning">{t('{{returned}} wapas', { returned: c.returned })}</Badge>}
              </View>
              <Text size="xs" tone="muted" numberOfLines={1}>{c.phone}{c.city ? ` · ${c.city}` : ''} · {t('{{delivered}}/{{orders}} deliver', { delivered: c.delivered, orders: c.orders })} · {c.daysSince === 0 ? t('aaj') : t('{{daysSince}} din pehle', { daysSince: c.daysSince })}</Text>
            </View>
            <Amount value={c.spent} size="sm" weight="bold" />
          </PressableScale>
        )}
        empty={<EmptyState icon={Users} title={t('Is list me koi customer nahi')} message={query ? t('Is talaash se kuch nahi mila.') : t(seg.hint)} />}
      />
      <CustomerSheet c={open} canManage={canManage} message={open ? text(open) : ''} onClose={() => setOpen(null)} onBlock={guard((c: OnlineCustomer) => void askBlock(c))} />
    </View>
  );
}

function CustomerSheet({ c, canManage, message, onClose, onBlock }: { c: OnlineCustomer | null; canManage: boolean; message: string; onClose: () => void; onBlock: (c: OnlineCustomer) => void }) {
  const th = useTheme();
  const orders = useQuery({ queryKey: [...KEYS.orders, 'customer', c?.phone], queryFn: () => ordersApi.list({ search: c!.phone, limit: 30 }), enabled: !!c });
  return (
    <Sheet open={!!c} onClose={onClose} title={c?.name} description={c ? `${c.phone}${c.city ? ` · ${c.city}` : ''}` : undefined}>
      {c && (
        <View style={{ gap: th.space(3) }}>
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            <Mini label={t('Orders')} value={String(c.orders)} />
            <Mini label={t('Deliver hue')} value={String(c.delivered)} />
            <Mini label={t('Wapas')} value={String(c.returned)} />
            <Mini label={t('Kul kharch')} value={formatMoney(c.spent)} />
          </View>
          <View style={{ flexDirection: 'row', gap: th.space(2), flexWrap: 'wrap' }}>
            {waNumber(c.phone) && !c.blocked && <Button size="sm" variant="success" icon={Send} onPress={() => openWhatsApp(c.phone, message)}>WhatsApp</Button>}
            <Button size="sm" variant="secondary" icon={Phone} onPress={() => callPhone(c.phone)}>{t('Call')}</Button>
            {canManage && <Button size="sm" variant={c.blocked ? 'secondary' : 'critical'} icon={Ban} onPress={() => onBlock(c)}>{c.blocked ? t('Unblock') : t('Block')}</Button>}
          </View>
          <Text size="sm" weight="semibold" tone="secondary">{t('Orders')}</Text>
          {orders.isLoading ? <SkeletonRows count={3} /> : (orders.data?.items ?? []).map((o) => (
            <PressableScale key={o.id} onPress={() => { onClose(); setTimeout(() => router.push(`/online/orders/${o.id}` as never), 250); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingVertical: th.space(2), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
              <Text size="sm" weight="semibold" ltr>#{orderNo(o)}</Text>
              <OrderStatusBadge status={o.orderStatus} />
              <View style={{ flex: 1 }} />
              <Amount value={o.total} size="sm" />
            </PressableScale>
          ))}
        </View>
      )}
    </Sheet>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  const th = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: th.colors.surfaceMuted, borderRadius: th.radius('md'), padding: th.space(2) }}>
      <Text size="sm" weight="bold" ltr numberOfLines={1}>{value}</Text>
      <Text size="2xs" tone="muted" numberOfLines={1}>{label}</Text>
    </View>
  );
}
