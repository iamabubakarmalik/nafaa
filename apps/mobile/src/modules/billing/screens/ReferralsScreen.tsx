/**
 * Referrals: your sign-up link and code, the shops that joined through it,
 * the credit history and the top referrers. Share by copy, WhatsApp, the
 * phone share sheet or email.
 */

import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Award, CheckCircle2, Clock, Copy, Mail, MessageCircle, Share2, Trophy, UserPlus, Wallet, XCircle } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { APP_URL } from '@/core/api/client';
import { formatDate } from '@/core/format';
import { t, msg } from '@/core/i18n';
import {
  Amount, Button, Card, ChipGroup, EmptyState, ErrorState, ListGroup, ListRow, Row, Screen, SearchBar, SkeletonRows, StatTile, StatusPill, Tabs, Text, toast, useTheme,
  type StatusTone,
} from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { referralsApi, supportWhatsapp, type CreditType, type ReferralStatus } from '../api/billing';

type Tab = 'friends' | 'credits' | 'top';
type StatusFilter = 'all' | ReferralStatus;

const STATUS: Record<ReferralStatus, { label: string; hint: string; icon: typeof Clock; tone: StatusTone }> = {
  PENDING: { label: msg('Intezar'), hint: msg('Jur gaye, abhi payment nahi ki'), icon: Clock, tone: 'warning' },
  CONVERTED: { label: msg('Inaam mila'), hint: msg('Pehli payment ho gayi, credit jur gaya'), icon: CheckCircle2, tone: 'success' },
  PAID: { label: msg('Payout ho gaya'), hint: msg('Inaam ada kar diya gaya'), icon: Award, tone: 'brand' },
  EXPIRED: { label: msg('Khatam'), hint: msg('Period guzar gayi'), icon: XCircle, tone: 'neutral' },
};
const CREDIT: Record<CreditType, string> = {
  REFERRAL_BONUS: msg('Referral inaam'), PROMOTIONAL: msg('Promotion'), REFUND: msg('Return'), ADJUSTMENT: msg('Correction'),
};

export function ReferralsScreen() {
  const th = useTheme();
  const [tab, setTab] = useState<Tab>('friends');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const q = useQuery({ queryKey: ['referrals-me'], queryFn: referralsApi.me });
  const top = useQuery({ queryKey: ['referrals-leaderboard'], queryFn: referralsApi.leaderboard, enabled: tab === 'top', staleTime: 10 * 60_000 });
  const d = q.data;
  const st = d?.stats;
  const code = d?.tenant.referralCode ?? '';
  const link = code ? `${APP_URL}/register?ref=${code}` : '';
  const message = [
    'Assalam-o-Alaikum! Main apni dukaan Nafaa POS par chalata hoon — sale, stock, khata aur reports sab ek jagah.',
    '', `Mere code se shuru karein: ${code}`, link,
  ].join('\n');
  const rule = st ? t('{{amount}} ya {{pct}}% — jo zyada ho', { amount: `Rs ${Math.round(st.rewardAmount ?? 0).toLocaleString('en-US')}`, pct: st.rewardPercentage ?? 0 }) : '';

  const copyLink = () => { if (link) { void Clipboard.setStringAsync(link); toast.success(t('Link copy ho gaya')); } };
  const copyCode = () => { if (code) { void Clipboard.setStringAsync(code); toast.success(t('Code copy ho gaya')); } };
  const whatsapp = () => { if (link) void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`); };
  const email = () => { if (link) void Linking.openURL(`mailto:?subject=${encodeURIComponent('Nafaa POS try karein')}&body=${encodeURIComponent(message)}`); };
  const share = () => { if (link) void Share.share({ message, url: link }); };

  const friends = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (d?.referrals ?? []).filter((r) => (status === 'all' || r.status === status) && (!term || r.referee?.name?.toLowerCase().includes(term)));
  }, [d?.referrals, search, status]);

  return (
    <Screen title={t('Referrals')} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <Card>
        <Text size="xs" tone="muted">{t('Dukaan-daar dost ko Nafaa par layein, inaam paayein')}</Text>
        <Text size="sm" weight="semibold" style={{ marginTop: th.space(3) }}>{t('Aap ka link')}</Text>
        <Text size="sm" ltr selectable numberOfLines={2} style={{ marginTop: 2 }}>{link || '…'}</Text>
        <Row gap={2} wrap style={{ marginTop: th.space(3) }}>
          <Button size="sm" variant="soft" icon={Copy} disabled={!link} onPress={copyCode}>{code || '—'}</Button>
          <Button size="sm" variant="secondary" icon={Copy} disabled={!link} onPress={copyLink}>{t('Link copy')}</Button>
          <Button size="sm" variant="secondary" icon={MessageCircle} disabled={!link} onPress={whatsapp}>{t('WhatsApp')}</Button>
          <Button size="sm" variant="secondary" icon={Mail} disabled={!link} onPress={email}>{t('Email')}</Button>
          <Button size="sm" variant="secondary" icon={Share2} disabled={!link} onPress={share}>{t('Share')}</Button>
        </Row>
        <View style={{ gap: th.space(1.5), marginTop: th.space(4) }}>
          {[
            t('Dost aap ke link ya code se Nafaa par account banata hai.'),
            t('Wo apni pehli payment karta hai.'),
            t('Aap ke credit me inaam jur jata hai: {{rule}}.', { rule: rule || '…' }),
          ].map((x, i) => <Text key={i} size="sm" tone="secondary">{i + 1}. {x}</Text>)}
        </View>
      </Card>

      <Row gap={3}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Kul kamaai')} loading={q.isLoading} value={<Amount value={st?.totalEarned ?? 0} size="lg" weight="bold" />} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="brand" label={t('Aap ka credit')} loading={q.isLoading} value={<Amount value={st?.currentCredit ?? 0} size="lg" weight="bold" />} onPress={() => setTab('credits')} />
      </Row>
      <Row gap={3}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('Intezar me')} loading={q.isLoading} value={<Text size="lg" weight="bold">{st?.pendingCount ?? 0}</Text>}
          onPress={() => { setTab('friends'); setStatus(status === 'PENDING' ? 'all' : 'PENDING'); }} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Inaam mila')} loading={q.isLoading} value={<Text size="lg" weight="bold">{st?.convertedCount ?? 0}</Text>}
          onPress={() => { setTab('friends'); setStatus(status === 'CONVERTED' ? 'all' : 'CONVERTED'); }} />
      </Row>

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'friends', label: t('Dost'), count: d?.referrals.length || undefined },
        { value: 'credits', label: t('Credit history'), count: d?.credits.length || undefined },
        { value: 'top', label: t('Top referrers') },
      ]} />
      <CachedNote query={q} />

      {q.isError && !d ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : null}

      {tab === 'friends' && (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('Dukaan ka naam…')} />
          <ChipGroup value={status} onChange={(v) => setStatus(v as StatusFilter)} options={[
            { value: 'all', label: t('Sab') },
            ...(Object.keys(STATUS) as ReferralStatus[]).map((s) => ({ value: s, label: t(STATUS[s].label) })),
          ]} />
          {q.isLoading ? <SkeletonRows count={4} /> : !friends.length ? (
            <EmptyState compact icon={UserPlus} title={d?.referrals.length ? t('Is filter me koi nahi') : t('Abhi koi dost nahi jura')}
              message={d?.referrals.length ? t('Filter badal kar dekhein') : t('Link WhatsApp par bhejein — pehla dost judte hi yahan nazar aayega')}
              action={d?.referrals.length ? undefined : <Button icon={MessageCircle} onPress={whatsapp} disabled={!link}>{t('WhatsApp par bhejein')}</Button>} />
          ) : (
            <ListGroup>
              {friends.map((r) => {
                const s = STATUS[r.status];
                return (
                  <ListRow key={r.id} icon={s.icon} iconTone={s.tone}
                    title={r.referee?.name ?? t('Dukaan')}
                    subtitle={t('Jure: {{day}}{{value}}', { day: formatDate(r.referee?.createdAt ?? r.createdAt, { year: true }), value: r.convertedAt ? t(' · Payment: {{convertedAt}}', { convertedAt: formatDate(r.convertedAt, { year: true }) }) : '' })}
                    trailing={(
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        {r.rewardAmount ? <Amount value={r.rewardAmount} weight="bold" /> : <Text tone="muted">—</Text>}
                        <StatusPill tone={s.tone}>{t(s.label)}</StatusPill>
                      </View>
                    )} />
                );
              })}
            </ListGroup>
          )}
        </>
      )}

      {tab === 'credits' && (
        <>
          <Card tone="muted">
            <Text size="sm">{t('Credit nikalwane ya agle bill me lagwane ke liye Nafaa support se rabta karein.')}</Text>
            <Button style={{ marginTop: th.space(3) }} size="sm" variant="secondary" icon={MessageCircle}
              onPress={() => void Linking.openURL(supportWhatsapp(`Assalam-o-Alaikum, mera referral code ${code} hai. Mujhe apne ${st ? `Rs ${Math.round(st.currentCredit).toLocaleString('en-US')}` : ''} credit ke baare me baat karni hai.`))}>
              {t('Support WhatsApp')}
            </Button>
          </Card>
          {q.isLoading ? <SkeletonRows count={4} /> : !d?.credits.length ? (
            <EmptyState compact icon={Wallet} title={t('Abhi koi credit nahi')} message={t('Dost ki pehli payment par inaam yahan aayega')} />
          ) : (
            <ListGroup>
              {d.credits.map((c) => (
                <ListRow key={c.id} title={t(CREDIT[c.type] ?? c.type)}
                  subtitle={`${formatDate(c.createdAt, { year: true })}${c.note ? ` · ${c.note}` : ''}`}
                  trailing={(
                    <View style={{ alignItems: 'flex-end' }}>
                      <Amount value={c.amount} signed colorize weight="bold" />
                      <Text size="xs" tone="muted">{t('Baqi {{balanceAfter}}', { balanceAfter: `Rs ${Math.round(c.balanceAfter).toLocaleString('en-US')}` })}</Text>
                    </View>
                  )} />
              ))}
            </ListGroup>
          )}
        </>
      )}

      {tab === 'top' && (top.isLoading ? <SkeletonRows count={5} /> : !top.data?.length ? (
        <EmptyState compact icon={Trophy} title={t('Abhi koi top referrer nahi')} message={t('Pehle dost ko bulayein — aap is list me sab se upar ho sakte hain')} />
      ) : (
        <ListGroup>
          {top.data.map((x, i) => (
            <ListRow key={`${x.name}-${i}`} leading={<Text weight="bold" tone={i < 3 ? 'warning' : 'muted'} style={{ width: 28 }} align="center">{i + 1}</Text>}
              title={<Text ltr>{x.name}</Text>} trailing={<Text weight="bold" ltr tabular>{x.successfulReferrals}</Text>} />
          ))}
        </ListGroup>
      ))}
    </Screen>
  );
}
