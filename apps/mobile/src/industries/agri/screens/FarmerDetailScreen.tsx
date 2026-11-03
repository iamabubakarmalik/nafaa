/** One farmer (web FarmerDetailPage): live udhaar by season, khata entries, payment, reminder, suspend and edit. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, Ban, MessageCircle, Pencil, Phone, Play, Trash2, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { creditUse } from '@nafaa/core/industries/agri';
import { formatDate, formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, HeroAmount, IconButton, ListRow, PageHero, ProgressBar, Row, Text, confirm, toast, useTheme } from '@/design';
import { callPhone, openWhatsApp } from '@/modules/customers/lib/contact';
import { OfflineNote, PaySheet, errorText, useDeskOnline } from '../../_shared/deskKit';
import { ReasonSheet } from '../../_shared/farm/ui';
import { farmersApi } from '../api';
import { AGRI_KEYS, FARMER_STATUS, refreshAgri, seasonLabel } from '../meta';

export function FarmerDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const manage = can(P.AGRI_FARMERS_MANAGE);
  const { guard } = useDeskOnline('agriDesk');
  const [sheet, setSheet] = useState<'pay' | 'suspend' | null>(null);
  const q = useQuery({ queryKey: [AGRI_KEYS.farmer, id], queryFn: () => farmersApi.khata(id!).catch(() => farmersApi.getOne(id!).then((farmer) => ({ farmer, seasons: [], entries: [] }))), enabled: !!id });
  const f = q.data?.farmer;
  const khata = q.data;
  const owed = Number(f?.currentBalance || 0);
  const limit = Number(f?.creditLimit || 0);
  const use = creditUse(owed, limit);
  const st = f ? FARMER_STATUS[f.status] : null;
  const done = (keys = [AGRI_KEYS.farmer, AGRI_KEYS.farmers], money = false) => refreshAgri(keys, money);

  const remind = () => {
    if (!f) return;
    openWhatsApp(f.phone, t('Assalam o Alaikum {{name}}, aap ka {{amount}} udhaar baqi hai. Meherbani karke wasooli ka intezam farma dein. Shukriya.', { name: f.fullName, amount: formatMoney(owed) }));
  };
  const remove = async () => {
    if (!f) return;
    const ok = await confirm({ title: t('{{fullName}} ko list se hatayein?', { fullName: f.fullName }), message: owed > 0 ? t('Is par {{currentBalance}} udhaar hai. Farmer list se hatega, magar khata, bill aur udhaar customer page par rahenge.', { currentBalance: formatMoney(owed) }) : t('Farmer list se hatega. Khata aur bill mehfooz rahenge.'), tone: 'danger', confirmLabel: t('List se hatayein') });
    if (!ok) return;
    try { await farmersApi.remove(f.id); done(); toast.success(t('Farmer list se hat gaya — khata aur bill mehfooz')); router.back(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };

  return (
    <DetailTemplate
      title={f?.fullName ?? t('Farmer')}
      subtitle={f ? [f.farmerNumber, f.village].filter(Boolean).join(' · ') : undefined}
      loading={q.isLoading} error={q.data ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={f && manage ? <IconButton icon={Pencil} label={t('Badlein')} onPress={() => guard(() => router.push(`/agri/farmers/${f.id}/edit` as never))} /> : undefined}
      summary={f ? <PageHero title={f.fullName} chip={st && f.status !== 'ACTIVE' ? t(st.label) : t('Udhaar')} stats={[
        { label: t('Udhaar'), value: <HeroAmount value={owed} size="2xl" /> },
        ...((f.advance ?? 0) > 0 ? [{ label: t('Advance'), value: <HeroAmount value={f.advance ?? 0} size="2xl" /> }] : []),
      ]} /> : undefined}
      bottomActions={f && manage && owed > 0 ? <Button fullWidth icon={Wallet} variant="success" onPress={() => guard(() => setSheet('pay'))}>{t('Wasool')}</Button> : undefined}
    >
      {f && (
        <View style={{ gap: th.space(4) }}>
          <OfflineNote feature="agriDesk" />
          {(f.dueNow ?? 0) > 0 && <Card tone="danger"><Text size="sm" weight="medium">{t('{{dueNow}} pichle season ka baqi hai — katai guzar chuki, wasooli ka waqt hai', { dueNow: formatMoney(f.dueNow) })}</Text></Card>}
          {f.status === 'SUSPENDED' && <Card tone="danger"><Text size="sm" weight="medium">{t('Udhaar roka hua — {{value}}', { value: f.suspensionReason || t('cash par dein') })}</Text></Card>}
          <Row gap={2}>
            {!!f.phone && <Button variant="secondary" icon={Phone} style={{ flex: 1 }} onPress={() => callPhone(f.phone)}>{t('Call')}</Button>}
            {!!f.phone && owed > 0 && <Button variant="secondary" icon={MessageCircle} style={{ flex: 1 }} onPress={remind}>{t('WhatsApp')}</Button>}
          </Row>

          {limit > 0 && (
            <Card title={t('Udhaar ki had')}>
              <ProgressBar value={use.used} tone={use.over ? 'danger' : use.used > 0.8 ? 'warning' : 'success'} />
              <Text size="xs" tone={use.over ? 'danger' : 'muted'}>{t('Had {{limit}}', { limit: formatMoney(limit) })}{use.over ? ` · ${t('Had se upar')}` : ''}</Text>
            </Card>
          )}

          {(f.seasons ?? khata?.seasons ?? []).length > 0 && (
            <DetailSection title={t('Season ka khata')}>
              <Card flush>
                {(f.seasons ?? []).map((s, i, a) => (
                  <ListRow key={s.key} divider={i < a.length - 1} title={s.label} subtitle={t('{{label}}: wapsi {{recoveryBy}} tak', { label: t('Wasooli'), recoveryBy: formatDate(s.recoveryBy, { year: true }) })}
                    trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={s.owed} weight="bold" tone={s.due ? 'danger' : undefined} />{s.due && <Text size="2xs" tone="danger">{t('Katai guzar gayi')}</Text>}</View>} />
                ))}
              </Card>
            </DetailSection>
          )}

          <DetailSection title={t('Farmer')}>
            <Card flush>
              <DetailRow label={t('Phone')} value={<Text ltr>{f.phone}</Text>} />
              {!!f.fatherName && <DetailRow label={t('Walid')} value={f.fatherName} />}
              {!!f.cnic && <DetailRow label={t('CNIC')} value={<Text ltr>{f.cnic}</Text>} />}
              {!!(f.village || f.district) && <DetailRow label={t('Pata')} value={[f.village, f.tehsil, f.district].filter(Boolean).join(', ')} />}
              {!!f.landAreaAcres && <DetailRow label={t('Zameen')} value={t('{{count}} acre', { count: f.landAreaAcres })} />}
              {!!f.landOwnership && <DetailRow label={t('Zameen kis ki')} value={t(f.landOwnership)} />}
              {!!f.waterSource && <DetailRow label={t('Paani')} value={t(f.waterSource)} />}
              {!!f.soilType && <DetailRow label={t('Mitti')} value={t(f.soilType)} />}
              {!!f.currentCrop && <DetailRow label={t('Abhi laga hai')} value={`${f.currentCrop}${f.currentSeason ? ` · ${seasonLabel(f.currentSeason)}` : ''}`} />}
              {(f.primaryCrops ?? []).length > 0 && <DetailRow label={t('Fasal')} value={f.primaryCrops.join(', ')} />}
              {(f.farmingType ?? []).length > 0 && <DetailRow label={t('Kaam')} value={f.farmingType.map((x) => t(x)).join(', ')} />}
              <DetailRow label={t('Aakhri khareed')} value={f.lastPurchaseAt ? formatDate(f.lastPurchaseAt, { year: true }) : '—'} />
              <DetailRow label={t('Aakhri payment')} value={f.lastPaymentAt ? formatDate(f.lastPaymentAt, { year: true }) : '—'} last />
            </Card>
          </DetailSection>

          {!f.khataLinked && <Card tone="warning"><Text size="sm">{t('Ye farmer kisi customer khate se nahi jura — POS ka udhaar yahan nahi dikhta')}</Text></Card>}

          <DetailSection title={t('Khate ki entries')}>
            <Card flush>
              {(khata?.entries ?? []).length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi khate me koi entry nahi — POS par farmer chun kar udhaar bill banayein')}</Text></View> : (khata?.entries ?? []).slice(0, 30).map((e, i, a) => (
                <ListRow key={e.id} divider={i < a.length - 1} icon={BookOpen} title={e.note || e.reference || e.type} subtitle={formatDateTime(e.createdAt)}
                  trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={e.amount} size="sm" weight="semibold" /><Text size="2xs" tone="muted">{t('Aakhir me baqi')} {formatMoney(e.balanceAfter)}</Text></View>} />
              ))}
            </Card>
          </DetailSection>

          {manage && (
            <Row gap={2} wrap>
              {f.status === 'SUSPENDED'
                ? <Button variant="secondary" icon={Play} style={{ flex: 1 }} onPress={() => guard(() => void farmersApi.reactivate(f.id).then(() => { done(); toast.success(t('Udhaar dobara chalu')); }).catch((e) => toast.error(errorText(e, t('Nahi hua')))))}>{t('Udhaar dobara chalu')}</Button>
                : <Button variant="secondary" icon={Ban} style={{ flex: 1 }} onPress={() => guard(() => setSheet('suspend'))}>{t('Udhaar roka hua')}</Button>}
              <Button variant="secondary" icon={Trash2} style={{ flex: 1 }} onPress={() => guard(() => void remove())}>{t('Hatayein')}</Button>
            </Row>
          )}
          <Row gap={2}>
            <Button variant="ghost" style={{ flex: 1 }} onPress={() => router.push('/agri/bulk-orders' as never)}>{t('Bulk orders')}</Button>
            <Button variant="ghost" style={{ flex: 1 }} onPress={() => router.push('/agri/subsidy' as never)}>{t('Subsidy claims')}</Button>
          </Row>

          <PaySheet open={sheet === 'pay'} title={t('{{fullName}} se wasooli', { fullName: f.fullName })} name={f.fullName} due={owed} advance cta={t('Wasool karein')}
            onConfirm={async ({ paymentMethod, paidAmount }) => { await farmersApi.payment(f.id, { amount: paidAmount, paymentMethod }); done([AGRI_KEYS.farmer, AGRI_KEYS.farmers], true); toast.success(t('{{amount}} wasool — khate me likh diya', { amount: formatMoney(paidAmount) })); }}
            onClose={() => setSheet(null)} />
          <ReasonSheet open={sheet === 'suspend'} title={t('Udhaar roka hua')} cta={t('Udhaar roka hua')} onClose={() => setSheet(null)}
            onConfirm={async (reason) => { try { await farmersApi.suspend(f.id, reason); done(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); throw e; } }} />
        </View>
      )}
    </DetailTemplate>
  );
}
