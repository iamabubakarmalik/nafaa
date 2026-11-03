/** One gawala (web FarmerDetailPage): what is owed, supplies, payments and the statement for a period. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { FileText, Pencil, Phone, Plus, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, Card, DetailRow, DetailSection, DetailTemplate, HeroAmount, IconButton, ListRow, PageHero, Row, Sheet, Text, useTheme } from '@/design';
import { callPhone } from '@/modules/customers/lib/contact';
import { OfflineNote, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { FarmerFormSheet, FarmerPaySheet } from '../components/FarmerSheets';
import { farmersApi, type FarmerStatement } from '../api';
import { CYCLE, DAIRY_KEYS, liters, qty, slotLabel } from '../meta';
import { DayBar } from '../../_shared/farm/DayBar';

export function DairyFarmerDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const { guard } = useDeskOnline('dairyDesk');
  const [sheet, setSheet] = useState<'pay' | 'edit' | 'statement' | null>(null);
  const q = useQuery({ queryKey: [DAIRY_KEYS.farmer, id], queryFn: () => farmersApi.getOne(id!), enabled: !!id });
  const f = q.data;
  const due = f?.currentBalance ?? 0;

  return (
    <DetailTemplate
      title={f?.name ?? t('Gawala')} subtitle={f ? [f.farmerNumber, f.village].filter(Boolean).join(' · ') : undefined}
      loading={q.isLoading} error={q.data ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={f && can(P.SUPPLIERS_EDIT) ? <IconButton icon={Pencil} label={t('Badlein')} onPress={() => guard(() => setSheet('edit'))} /> : undefined}
      summary={f ? <PageHero title={f.name} chip={t('Dena hai')} stats={[{ label: t('Dena hai'), value: <HeroAmount value={Math.max(due, 0)} size="2xl" /> }, { label: t('Rate (ek liter) *').replace(' *', ''), value: <HeroAmount value={f.ratePerLiter} size="2xl" /> }]} /> : undefined}
      bottomActions={f && can(P.SUPPLIERS_EDIT) && due > 0 ? <Button fullWidth variant="success" icon={Wallet} onPress={() => guard(() => setSheet('pay'))}>{t('Payment karein')}</Button> : undefined}
    >
      {f && (
        <View style={{ gap: th.space(4) }}>
          <OfflineNote feature="dairyDesk" />
          <Row gap={2}>
            {!!f.phone && <Button variant="secondary" icon={Phone} style={{ flex: 1 }} onPress={() => callPhone(f.phone)}>{t('Call')}</Button>}
            {can(P.PURCHASES_CREATE) && f.isActive && <Button variant="secondary" icon={Plus} style={{ flex: 1 }} onPress={() => router.push(`/dairy/supplies?farmer=${f.id}` as never)}>{t('Doodh ki entry')}</Button>}
            <Button variant="secondary" icon={FileText} style={{ flex: 1 }} onPress={() => setSheet('statement')}>{t('Statement')}</Button>
          </Row>
          <Card flush>
            <DetailRow label={t('Phone')} value={<Text ltr>{f.phone ?? '—'}</Text>} />
            {!!f.cnic && <DetailRow label={t('CNIC')} value={<Text ltr>{f.cnic}</Text>} />}
            <DetailRow label={t('Fat bonus (har point)')} value={f.fatBonusRate ? formatMoney(f.fatBonusRate) : '—'} />
            <DetailRow label={t('Payment kab')} value={t(CYCLE[f.paymentCycle] ?? f.paymentCycle)} />
            {(f.buffaloCount || f.cowCount) ? <DetailRow label={t('Janwar')} value={`${f.buffaloCount ?? 0} ${t('Bhainsen')} · ${f.cowCount ?? 0} ${t('Gayen')}`} /> : null}
            <DetailRow label={t('Kul doodh')} value={liters(f.totalSupplied)} />
            <DetailRow label={t('Kul ada')} value={formatMoney(f.totalPaid)} />
            {!!f.avgFatContent && <DetailRow label={t('Ausat fat')} value={`${f.avgFatContent}%`} />}
            <DetailRow label={t('Aakhri entry')} value={f.lastSupplyDate ? formatDate(f.lastSupplyDate, { year: true }) : '—'} last />
          </Card>
          <DetailSection title={t('Parchiyan')}>
            <Card flush>
              {(f.recentSupplies ?? []).length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi koi entry nahi')}</Text></View> : (f.recentSupplies ?? []).slice(0, 15).map((s, i, a) => (
                <ListRow key={s.id} divider={i < a.length - 1} dense title={`${formatDate(s.supplyDate)} · ${slotLabel(s.slot)}`} subtitle={`${liters(s.quantity)} @ ${formatMoney(s.ratePerLiter)}${s.fatContent ? ` · fat ${s.fatContent}%` : ''}`} trailing={<Amount value={s.totalAmount} size="sm" weight="semibold" />} />
              ))}
            </Card>
          </DetailSection>
          <DetailSection title={t('Payment')}>
            <Card flush>
              {(f.payments ?? []).length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi koi payment nahi')}</Text></View> : (f.payments ?? []).slice(0, 15).map((p, i, a) => (
                <ListRow key={p.id} divider={i < a.length - 1} dense title={formatDate(p.date, { year: true })} subtitle={[p.method, p.accountName, p.reference, p.note].filter(Boolean).join(' · ')} trailing={<Amount value={p.amount} size="sm" weight="semibold" tone="success" />} />
              ))}
            </Card>
          </DetailSection>
          <FarmerPaySheet farmer={f} open={sheet === 'pay'} onClose={() => setSheet(null)} />
          <FarmerFormSheet farmer={f} open={sheet === 'edit'} onClose={() => setSheet(null)} />
          <StatementSheet id={f.id} open={sheet === 'statement'} onClose={() => setSheet(null)} />
        </View>
      )}
    </DetailTemplate>
  );
}

function StatementSheet({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [from, setFrom] = useState(`${todayKey().slice(0, 8)}01`);
  const [to, setTo] = useState(todayKey());
  const q = useQuery({ queryKey: [DAIRY_KEYS.farmer, id, 'statement', from, to], queryFn: () => farmersApi.statement(id, { from, to }), enabled: open });
  const s: FarmerStatement | undefined = q.data;
  const share = () => {
    if (!s) return;
    const text = [`${s.farmer.name} (${s.farmer.farmerNumber})`, `${from} – ${to}`, ...s.lines.map((l) => `${l.date.slice(0, 10)} ${l.text} ${l.kind === 'MILK' ? formatMoney(l.milk) : `-${formatMoney(l.paid)}`}`), `${t('Baqi')}: ${formatMoney(s.closing)}`].join('\n');
    void Share.share({ message: text });
  };
  return (
    <Sheet open={open} onClose={onClose} height={0.92} title={t('Statement')} footer={<Button fullWidth variant="secondary" onPress={share} disabled={!s}>{t('Share')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <DayBar value={from} onChange={setFrom} />
        <DayBar value={to} onChange={(k) => setTo(k < from ? from : k)} />
        {s && (
          <>
            <Card flush>
              <DetailRow label={t('Pehle baqi')} value={formatMoney(s.opening + s.unrecorded)} />
              <DetailRow label={t('Doodh')} value={`${qty(s.liters)} L · ${formatMoney(s.milkIn)}`} />
              <DetailRow label={t('Ada')} value={formatMoney(s.paidOut)} />
              <DetailRow label={t('Aakhir me baqi')} value={<Amount value={s.closing} weight="bold" />} last />
            </Card>
            <Card flush>
              {s.lines.map((l, i, a) => (
                <ListRow key={i} dense divider={i < a.length - 1} title={`${formatDate(l.date)} · ${l.text}`} subtitle={l.kind === 'MILK' ? `${qty(l.quantity ?? 0)} L${l.fat ? ` · fat ${l.fat}%` : ''}${l.rate ? ` @ ${l.rate}` : ''}` : undefined}
                  trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="semibold" tone={l.kind === 'MILK' ? undefined : 'success'} ltr>{l.kind === 'MILK' ? formatMoney(l.milk) : `-${formatMoney(l.paid)}`}</Text><Text size="2xs" tone="muted" ltr>{formatMoney(l.balance)}</Text></View>} />
              ))}
            </Card>
          </>
        )}
      </View>
    </Sheet>
  );
}
