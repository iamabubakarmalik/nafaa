/** Loyalty sheets: a member's history, a manual gift or correction, and the programme rules. */

import { useQuery } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { spendPerPoint } from '@nafaa/core/customers';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, EmptyState, Input, ListRow, MoneyInput, Segmented, Sheet, SkeletonRows, Switch, Text, toast, useTheme } from '@/design';
import { queryClient } from '@/core/query/client';
import { settingsApi } from '@/modules/settings/api/settings';
import { loyaltyApi, type LoyaltyMember, type LoyaltyOverview } from '../api/loyalty';

const TX: Record<string, { label: string; tone: 'success' | 'danger' | 'default' | 'info' }> = {
  EARNED: { label: 'Mile', tone: 'success' }, REDEEMED: { label: 'Istemal', tone: 'danger' }, EXPIRED: { label: 'Khatam', tone: 'default' }, ADJUSTMENT: { label: 'Haath se', tone: 'info' },
};
export const refreshLoyalty = () => ['loyalty', 'customer', 'customers-directory'].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));

export function HistorySheet({ member, onClose }: { member: LoyaltyMember | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ['loyalty', 'history', member?.id], queryFn: () => loyaltyApi.history(member!.id), enabled: !!member });
  return (
    <Sheet open={!!member} onClose={onClose} title={t('{{name}} ke points', { name: member?.name ?? '' })} description={t('Abhi {{value}} points', { value: q.data?.customer.loyaltyPoints ?? member?.loyaltyPoints ?? 0 })} height={0.75}>
      {q.isLoading ? <SkeletonRows count={4} /> : !q.data?.transactions.length ? <EmptyState title={t('Abhi koi entry nahi')} /> : (
        <View>
          {q.data.transactions.map((x) => (
            <ListRow key={x.id} dense title={t(TX[x.type]?.label ?? x.type)} subtitle={`${formatDateTime(x.createdAt)}${x.note || x.reference ? `\n${[x.reference, x.note].filter(Boolean).join(' · ')}` : ''}`}
              trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr tone={x.points > 0 ? 'success' : 'danger'}>{`${x.points > 0 ? '+' : ''}${x.points}`}</Text><Text size="2xs" tone="muted" ltr>{`= ${x.balanceAfter}`}</Text></View>} />
          ))}
        </View>
      )}
    </Sheet>
  );
}

export function AdjustSheet({ member, onClose }: { member: LoyaltyMember | null; onClose: () => void }) {
  const th = useTheme();
  const [sign, setSign] = useState<'add' | 'cut'>('add');
  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (member) { setSign('add'); setPoints(''); setNote(''); } }, [member]);
  const n = Math.trunc(Number(points) || 0);
  const delta = sign === 'add' ? n : -n;
  const after = (member?.loyaltyPoints ?? 0) + delta;
  const error = points && !n ? t('Points 1 ya zyada likhein') : after < 0 ? t('Itne points nahi — abhi {{loyaltyPoints}} hain', { loyaltyPoints: member?.loyaltyPoints ?? 0 }) : undefined;
  const save = async () => {
    if (!member || !n || error) return;
    setBusy(true);
    try {
      const r = await loyaltyApi.adjust(member.id, delta, note.trim() || undefined);
      toast.success(t('{{name}}: ab {{loyaltyPoints}} points', { name: member.name, loyaltyPoints: r.loyaltyPoints }));
      refreshLoyalty();
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!member} onClose={onClose} title={t('Points · {{name}}', { name: member?.name ?? '' })} description={t('Abhi {{loyaltyPoints}} points', { loyaltyPoints: member?.loyaltyPoints ?? 0 })}
      footer={<Button fullWidth size="lg" loading={busy} disabled={!n || !!error} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Segmented value={sign} onChange={setSign} options={[{ value: 'add', label: t('Tohfa / jorein'), icon: Plus }, { value: 'cut', label: t('Kaatein'), icon: Minus }]} />
        <Input label={t('Kitne points')} value={points} onChangeText={(v) => setPoints(v.replace(/\D/g, ''))} keyboardType="number-pad" size="xl" autoFocus error={error} hint={!error ? t('Is ke baad: {{after}} points', { after }) : undefined} />
        <Input label={t('Wajah')} value={note} onChangeText={setNote} placeholder={t('Jaise: salgirah ka tohfa')} hint={t('Customer ki history mein dikhegi')} maxLength={200} />
      </View>
    </Sheet>
  );
}

export function RulesSheet({ overview, open, onClose }: { overview: LoyaltyOverview | undefined; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const s = overview?.settings;
  const [on, setOn] = useState(true);
  const [per, setPer] = useState<number | null>(100);
  const [rate, setRate] = useState<number | null>(1);
  const [min, setMin] = useState<number | null>(null);
  const [max, setMax] = useState<number | null>(100);
  const [expiry, setExpiry] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open && overview && s) { setOn(overview.enabled); setPer(spendPerPoint(s.pointsPerRupee)); setRate(s.redemptionRate); setMin(s.minRedeem || null); setMax(s.maxRedeemPercent); setExpiry(s.expiryDays || null); }
  }, [open, overview, s]);
  const errors = { per: !((per ?? 0) >= 1) ? t('Kam se kam Rs 1 likhein') : undefined, rate: !((rate ?? 0) > 0) ? t('Point ki qeemat 0 se zyada honi chahiye') : undefined, max: !((max ?? 0) >= 1 && (max ?? 0) <= 100) ? t('1 se 100 ke beech likhein') : undefined };
  const invalid = Object.values(errors).some(Boolean);
  const save = async () => {
    if (invalid) return;
    setBusy(true);
    try {
      await settingsApi.update({ enableLoyalty: on, loyaltyPointsPerRupee: 1 / (per as number), loyaltyRedemptionRate: rate as number, loyaltyMinRedeem: Math.max(0, Math.trunc(min ?? 0)), loyaltyMaxRedeemPercent: max as number, loyaltyExpiryDays: Math.max(0, Math.trunc(expiry ?? 0)) } as never);
      toast.success(t('Usool save ho gaye'));
      refreshLoyalty();
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  const earn = Math.floor(1000 / Math.max(1, per ?? 100));
  return (
    <Sheet open={open} onClose={onClose} title={t('Loyalty ke usool')} description={t('Sab branches par yahi usool chalte hain')}
      footer={<Button fullWidth size="lg" loading={busy} disabled={invalid} onPress={() => void save()}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Switch value={on} onChange={setOn} label={t('Loyalty chalu')} description={t('Band ho to naye bill par points nahi milte; jo jama hain woh rehte hain')} />
        <MoneyInput label={t('Kitne rupay par 1 point')} value={per} onChangeValue={setPer} decimals={false} error={errors.per} hint={t('Jaise 100: har Rs 100 ki khareedari par 1 point')} />
        <MoneyInput label={t('1 point kitne rupay ka')} value={rate} onChangeValue={setRate} error={errors.rate} hint={t('Istemal par itni Discount milti hai')} />
        <Input label={t('Kam se kam kitne points istemal')} value={min == null ? '' : String(min)} onChangeText={(v) => setMin(v.replace(/\D/g, '') ? Number(v.replace(/\D/g, '')) : null)} keyboardType="number-pad" placeholder={t('Koi had nahi')} />
        <Input label={t('Bill ka zyada se zyada % points se')} value={max == null ? '' : String(max)} onChangeText={(v) => setMax(v.replace(/\D/g, '') ? Number(v.replace(/\D/g, '')) : null)} keyboardType="number-pad" error={errors.max} hint={t('100 = poora bill points se')} />
        <Input label={t('Points kitne din baad khatam hon')} value={expiry == null ? '' : String(expiry)} onChangeText={(v) => setExpiry(v.replace(/\D/g, '') ? Number(v.replace(/\D/g, '')) : null)} keyboardType="number-pad" placeholder={t('Kabhi nahi')} />
        <View style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.brand.soft }}>
          <Text size="sm" color={th.colors.brand.text}>{t('Misal: Rs 1,000 ki khareedari par {{points}} milenge, jo agli dafa {{value}} ke barabar honge.', { points: earn, value: formatMoney(earn * (rate ?? 0)) })}</Text>
        </View>
      </View>
    </Sheet>
  );
}
