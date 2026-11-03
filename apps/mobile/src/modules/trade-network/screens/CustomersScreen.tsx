/**
 * Seller side of the trade network: link requests from shops, the network
 * customers with their khata and orders, and the network profile (invite
 * code and link, and the opt-in "Nafaa par distributors" listing).
 * Needs distribution switched on.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Copy, Inbox, MessageCircle, Share2, Users, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { APP_URL } from '@/core/api/client';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Button, Card, EmptyState, ErrorState, Input, ListRow, MoneyInput, Row, Screen, Segmented, Select, SkeletonRows, StatTile, Switch, Text, TextArea, confirm, toast, useTheme,
} from '@/design';
import { DistributionGate } from '@/modules/distribution/components/DistributionGate';
import { dayTime, rs } from '@/modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, tradeError, type IncomingRequest, type Profile } from '../api/trade.api';
import { LINK_STATUS } from '../lib/meta';
import { BizAvatar, CachedLine, Pill, useOverview, whereText } from '../components/shared';
import { TermsSheet } from '../components/TermsSheet';

type Tab = 'customers' | 'requests' | 'profile';

export function CustomersScreen() {
  return <DistributionGate title={t('Network')}><Seller /></DistributionGate>;
}

function Seller() {
  const th = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string }>();
  const ov = useOverview();
  const s = ov.data?.seller;
  const [picked, setPicked] = useState<Tab | null>((params.tab as Tab) ?? null);
  const tab: Tab = picked ?? ((s?.requests ?? 0) > 0 ? 'requests' : 'customers');
  return (
    <Screen title={t('Network')} subtitle={t('Nafaa network')} onRefresh={() => qc.invalidateQueries({ queryKey: [TRADE_KEY] })} refreshing={ov.isRefetching}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm" tone="muted">{t('Jo dukaanein Nafaa par hain woh aap se seedha Order bhejti hain — Orders desk me aate hain, delivery ke baad un ke paas Purchase khud banti hai')}</Text>
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Network customers')} value={String(s?.customers ?? '—')} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone={(s?.requests ?? 0) > 0 ? 'warning' : 'neutral'} label={t('Requests')} value={String(s?.requests ?? '—')} />
        </Row>
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone={(s?.newOrders ?? 0) > 0 ? 'warning' : 'neutral'} label={t('Naye Order')} value={String(s?.newOrders ?? '—')} onPress={() => router.push('/distribution/orders' as never)} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone={(s?.paymentsToConfirm ?? 0) > 0 ? 'warning' : 'neutral'} label={t('Payment confirm')} value={String(s?.paymentsToConfirm ?? '—')} />
        </Row>
        <Segmented size="sm" value={tab} onChange={setPicked}
          options={[{ value: 'customers', label: t('Customers') }, { value: 'requests', label: t('Requests'), count: s?.requests }, { value: 'profile', label: t('Invite & profile') }]} />
        {tab === 'customers' ? <Customers /> : tab === 'requests' ? <Requests /> : <ProfileTab />}
      </View>
    </Screen>
  );
}

function Customers() {
  const q = useQuery({ queryKey: [TRADE_KEY, 'customers'], queryFn: () => tradeApi.customers() });
  const rows = q.data ?? [];
  if (q.isLoading) return <SkeletonRows count={4} />;
  if (!q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!rows.length) {
    return (
      <EmptyState icon={Users} title={t('Customers')} message={t('Abhi koi dukaan jori nahi. \'Invite & profile\' se apna invite link dukaanon ko bhejein.')} />
    );
  }
  return (
    <View>
      <CachedLine query={q} />
      <Card flush>
        {rows.map((r, i) => (
          <ListRow key={r.id} divider={i < rows.length - 1} chevron leading={<BizAvatar card={r.buyer} />} title={r.buyer?.name ?? ''}
            subtitle={(
              <View style={{ gap: 4 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[whereText(r.buyer), r.customer?.priceListName, r.customer?.routeName].filter(Boolean).join(' · ')}</Text>
                <Row gap={1.5} wrap>
                  {r.status !== 'ACTIVE' && <Pill tone={LINK_STATUS[r.status].tone}>{LINK_STATUS[r.status].label}</Pill>}
                  <Text size="xs" tone="muted">{t('{{orders30d}} Order · {{value30d}}', { orders30d: r.orders30d, value30d: rs(r.value30d) })}</Text>
                  {r.paymentsToConfirm > 0 && <Pill tone="amber">{t('{{paymentsToConfirm}} payment confirm', { paymentsToConfirm: r.paymentsToConfirm })}</Pill>}
                </Row>
              </View>
            )}
            trailing={<View style={{ alignItems: 'flex-end' }}><Text size="2xs" tone="muted">{t('Khata')}</Text><Amount value={r.customer?.balance ?? 0} weight="bold" /></View>}
            onPress={() => router.push(`/network/links/${r.id}`)} />
        ))}
      </Card>
    </View>
  );
}

function Requests() {
  const th = useTheme();
  const qc = useQueryClient();
  const canLink = usePermission()(P.TRADE_LINKS_MANAGE);
  const [approve, setApprove] = useState<IncomingRequest | null>(null);
  const q = useQuery({ queryKey: [TRADE_KEY, 'incoming'], queryFn: tradeApi.incoming });
  const reject = useMutation({
    mutationFn: (id: string) => tradeApi.reject(id),
    onSuccess: () => { toast.success(t('Request reject')); void qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const rows = q.data ?? [];
  if (q.isLoading) return <SkeletonRows count={3} />;
  if (!q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!rows.length) return <EmptyState icon={Inbox} title={t('Requests')} message={t('Koi naya request nahi.')} />;
  return (
    <View style={{ gap: th.space(3) }}>
      {rows.map((r) => (
        <Card key={r.id}>
          <Row gap={3} align="start">
            <BizAvatar card={r.buyer} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text weight="semibold">{r.buyer?.name}</Text>
              <Text size="xs" tone="muted">{[r.buyer?.phone, r.buyer?.address, r.buyer?.city].filter(Boolean).join(' · ')}</Text>
              <Text size="xs" tone="muted">{`${dayTime(r.requestedAt)} · ${r.requestedVia === 'DIRECTORY' ? t('Directory se') : r.requestedVia === 'PHONE' ? t('Phone se') : t('Invite code se')}`}</Text>
              {!!r.requestNote && <Row gap={1}><MessageCircle size={12} color={th.colors.textMuted} /><Text size="xs" tone="secondary" style={{ flexShrink: 1 }}>{r.requestNote}</Text></Row>}
              {r.suggestedCustomer && <Text size="xs" tone="brand">{t('Pehle se customer: {{name}}', { name: r.suggestedCustomer.name })}</Text>}
            </View>
          </Row>
          {canLink && (
            <Row gap={2} style={{ marginTop: th.space(3) }}>
              <Button variant="ghost" icon={X} style={{ flex: 1 }} onPress={async () => {
                if (await confirm({ title: t('{{name}} ka request reject karein?', { name: r.buyer?.name }), confirmLabel: t('Reject'), tone: 'danger' })) reject.mutate(r.id);
              }}>{t('Reject')}</Button>
              <Button variant="success" icon={BadgeCheck} style={{ flex: 1 }} onPress={() => setApprove(r)}>{t('Approve')}</Button>
            </Row>
          )}
        </Card>
      ))}
      {approve && <TermsSheet linkId={approve.id} mode="approve" buyer={approve.buyer} suggested={approve.suggestedCustomer} onClose={() => setApprove(null)} />}
    </View>
  );
}

function ProfileTab() {
  const th = useTheme();
  const qc = useQueryClient();
  const canLink = usePermission()(P.TRADE_LINKS_MANAGE);
  const q = useQuery({ queryKey: [TRADE_KEY, 'profile'], queryFn: tradeApi.profile });
  const [form, setForm] = useState<Partial<Profile>>({});
  const [cats, setCats] = useState('');
  const [brands, setBrands] = useState('');
  useEffect(() => {
    if (!q.data) return;
    setForm(q.data.profile);
    setCats(q.data.profile.categories.join(', '));
    setBrands(q.data.profile.brands.join(', '));
  }, [q.data]);
  const parse = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const save = useMutation({
    mutationFn: () => tradeApi.saveProfile({
      acceptRequests: form.acceptRequests, listed: form.listed, displayName: form.displayName ?? '', phone: form.phone ?? '', city: form.city ?? '', area: form.area ?? '',
      categories: parse(cats), brands: parse(brands), about: form.about ?? '', minOrderValue: form.minOrderValue ?? null, catalogScope: form.catalogScope,
    }),
    onSuccess: () => { toast.success(t('Profile save')); void qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const newCode = useMutation({
    mutationFn: tradeApi.newCode,
    onSuccess: () => { toast.success(t('Naya code ban gaya — purana ab nahi chalega')); void qc.invalidateQueries({ queryKey: [TRADE_KEY, 'profile'] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  if (q.isLoading) return <SkeletonRows count={4} />;
  if (!q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const p = q.data.profile;
  const link = `${APP_URL}/network/join/${p.inviteCode}`;
  const text = t('Assalam o alaikum! Ab aap {{value}} se Nafaa par seedha Order bhej sakte hain. Yeh link kholein: {{link}} (code {{inviteCode}})', { value: q.data.card?.name ?? 'hum', link, inviteCode: p.inviteCode });
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <View style={{ gap: th.space(3) }}>
      <Card title={t('Invite code')} description={t('Dukaanein is code ya link se aap ko request bhejti hain')}>
        <View style={{ borderRadius: th.radius('lg'), backgroundColor: th.colors.brand.solid, paddingVertical: th.space(5), alignItems: 'center', gap: 4 }}>
          <Text size="xs" color="#ffffffb3">{t('Aap ka code')}</Text>
          <Text size="3xl" weight="bold" color="#fff" ltr style={{ letterSpacing: 3 }}>{p.inviteCode}</Text>
        </View>
        <Row gap={2} wrap style={{ marginTop: th.space(3) }}>
          <Button size="md" variant="secondary" icon={Copy} onPress={async () => { await Clipboard.setStringAsync(link); toast.success(t('Copy ho gaya')); }}>{t('Copy link')}</Button>
          <Button size="md" icon={Share2} onPress={() => { void Share.share({ message: text }); }}>{t('Share on WhatsApp')}</Button>
          {canLink && (
            <Button size="md" variant="ghost" loading={newCode.isPending} onPress={async () => {
              if (await confirm({ title: t('Naya code banayein?'), message: t('Purana code aur link band ho jayenge. Jure hue customers par koi farq nahi.'), confirmLabel: t('New code') })) newCode.mutate();
            }}>{t('New code')}</Button>
          )}
        </Row>
        <Text size="xs" tone="muted" ltr style={{ marginTop: th.space(2) }}>{link}</Text>
      </Card>
      <Card title={t('Profile aur directory')}>
        <View style={{ gap: th.space(3) }}>
          <Switch label={t('Naye requests lein')} description={t('Band ho to koi naya request nahi aa sakta')} value={!!form.acceptRequests} disabled={!canLink} onChange={(v) => set('acceptRequests', v)} />
          <Switch label={t('\'Nafaa par distributors\' me dikhein')} description={t('Aap ke shehar ki dukaanein aap ko dhoond kar request bhej sakengi')} value={!!form.listed} disabled={!canLink} onChange={(v) => set('listed', v)} />
          <Input label={t('Naam (directory me)')} placeholder={q.data.card?.name} value={form.displayName ?? ''} disabled={!canLink} onChangeText={(v) => set('displayName', v)} />
          <Input label={t('Phone')} keyboardType="phone-pad" value={form.phone ?? ''} disabled={!canLink} onChangeText={(v) => set('phone', v)} />
          <Row gap={2} align="start">
            <Input containerStyle={{ flex: 1 }} label={t('Shehar')} value={form.city ?? ''} disabled={!canLink} onChangeText={(v) => set('city', v)} />
            <Input containerStyle={{ flex: 1 }} label={t('Ilaqa')} value={form.area ?? ''} disabled={!canLink} onChangeText={(v) => set('area', v)} />
          </Row>
          <Input label={t('Categories')} hint={t('Comma se alag: Grocery, Beverages')} value={cats} disabled={!canLink} onChangeText={setCats} />
          <Input label={t('Brands')} hint={t('Comma se alag')} value={brands} disabled={!canLink} onChangeText={setBrands} />
          <MoneyInput label={t('Kam se kam Order (Rs)')} value={form.minOrderValue ?? null} disabled={!canLink} onChangeValue={(v) => set('minOrderValue', v)} />
          <Select label={t('Catalog me kya dikhe')} value={form.catalogScope ?? 'ALL'} disabled={!canLink} onChange={(v) => set('catalogScope', v as Profile['catalogScope'])}
            options={[{ value: 'ALL', label: t('Sab active items') }, { value: 'LISTED', label: t('Sirf customer ki price list wale') }]} />
          <TextArea label={t('Apne baare me')} numberOfLines={2} value={form.about ?? ''} disabled={!canLink} onChangeText={(v) => set('about', v)} />
          {canLink && <Button size="lg" loading={save.isPending} onPress={() => save.mutate()}>{t('Save')}</Button>}
        </View>
      </Card>
    </View>
  );
}
