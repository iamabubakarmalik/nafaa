/** One karigar (web CarpentersPage DetailModal): contact and pay, the jobs in hand, and pay given from the drawer (saved as an expense). */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pencil, Phone, Power, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { daysTo } from '@nafaa/core/industries/furniture';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, Text, confirm, toast, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { Meta } from '../../_shared/trade/kit';
import { MoneySheet } from '../../_shared/trade/sheets';
import { carpentersApi, type FurnitureCarpenter } from '../api';
import { FURNITURE_KEYS, OPEN_ORDER, orderStatus, refreshFurniture } from '../meta';

export function CarpenterDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('furnitureDesk');
  const canManage = can(P.STAFF_MANAGE);
  const canPay = can(P.EXPENSES_CREATE);
  const [pay, setPay] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: [FURNITURE_KEYS.carpenters, 'one', id], queryFn: () => carpentersApi.getOne(id!), enabled: !!id });
  const c = q.data;
  const changed = (msg: string) => { toast.success(msg); setPay(false); refreshFurniture([FURNITURE_KEYS.carpenters]); void q.refetch(); };

  const doPay = (v: { amount: number; paymentMethod: string; notes?: string }) => guard(async () => {
    setBusy(true);
    try { const r = await carpentersApi.pay(id!, { amount: v.amount, paymentMethod: v.paymentMethod, note: v.notes, orderId: orderId || undefined }); changed(t('Pay save — expense {{expenseNumber}}', { expenseNumber: r.expenseNumber })); }
    catch (e) { toast.error(apiErrorMessage(e, t('Pay save nahi hui'))); } finally { setBusy(false); }
  });
  const toggle = (k: FurnitureCarpenter) => guard(async () => {
    if (k.isActive && !(await confirm({ title: t('{{name}} ko band karein?', { name: k.name }), tone: 'danger', confirmLabel: t('Band karein'), message: k.activeProjects ? t('{{activeProjects}} order abhi is ke paas hain — pehle doosre karigar ko dein.', { activeProjects: k.activeProjects }) : t('Purana kaam aur pay ka record rehta hai.') }))) return;
    setBusy(true);
    try {
      const r = k.isActive ? await carpentersApi.deactivate(k.id) : await carpentersApi.update(k.id, { employeeCode: k.employeeCode, name: k.name, phone: k.phone, isActive: true });
      changed(r.isActive ? t('Karigar phir kaam par') : t('Karigar band'));
    } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  });

  const jobs = c ? [...(c.activeOrders ?? []), ...(c.recentCompleted ?? [])] : [];
  return (
    <DetailTemplate
      title={c ? `${c.name}` : t('Karigar')}
      subtitle={c ? `${c.employeeCode} · ${c.isActive ? t('{{activeProjects}} kaam haath me', { activeProjects: c.activeProjects }) : t('Band')}` : undefined}
      loading={q.isLoading} error={q.data ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={c && canManage ? <IconButton icon={Pencil} label={t('Badlein')} onPress={() => guard(() => router.push(`/furniture/carpenters/${c.id}/edit` as never))} /> : undefined}
      bottomActions={c && canPay ? <Button fullWidth icon={Wallet} onPress={() => guard(() => setPay(true))}>{t('Pay dein')}</Button> : undefined}
    >
      {c && (
        <View style={{ gap: th.space(4) }}>
          <OfflineNote feature="furnitureDesk" />
          <DetailSection title={t('Karigar')}>
            <DetailRow label={t('Phone')} value={<Button size="sm" variant="link" icon={Phone} onPress={() => void Linking.openURL(`tel:${c.phone}`)}>{c.phone}</Button>} />
            <DetailRow label={t('Kya banata hai')} value={[c.specializations.join(', '), c.experienceYears ? t('{{n}} saal', { n: c.experienceYears }) : null, c.workshopLocation].filter(Boolean).join(' · ') || '—'} last />
          </DetailSection>
          <DetailSection title={t('Pay')}>
            <DetailRow label={t('Rate')} value={c.dailyWage ? t('{{dailyWage}}/din', { dailyWage: cost(c.dailyWage) }) : c.perProjectRate ? t('{{perProjectRate}}/kaam', { perProjectRate: cost(c.perProjectRate) }) : t('Rate likha nahi')} />
            <DetailRow label={t('Is mahine diya')} value={cost(c.paidThisMonth ?? 0)} last />
          </DetailSection>
          <Card flush title={t('Kaam')}>
            {jobs.length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Koi kaam nahi')}</Text></View> : jobs.map((o, i) => {
              const st = orderStatus(o.status);
              const d = OPEN_ORDER.includes(o.status) ? daysTo(o.expectedDeliveryDate) : null;
              return (
                <ListRow key={o.id} divider={i < jobs.length - 1} title={o.productType} subtitle={<Meta parts={[o.customerName, o.expectedDeliveryDate ? formatDate(o.expectedDeliveryDate) : null, d !== null && d < 0 ? t('{{value}} din late', { value: -d }) : null]} />}
                  trailing={<Badge tone={st.tone}>{t(st.label)}</Badge>} chevron onPress={() => router.push(`/furniture/custom-orders/${o.id}` as never)} />
              );
            })}
          </Card>
          {(c.payments?.length ?? 0) > 0 && (
            <Card flush title={t('Pay di gayi')}>
              {c.payments!.map((p, i) => (
                <ListRow key={p.id} divider={i < c.payments!.length - 1} title={p.title.replace(/^Karigar \[[^\]]+\]: /, '')} subtitle={[formatDate(p.createdAt), p.description].filter(Boolean).join(' · ')} trailing={<Text weight="semibold" ltr>{formatMoney(p.amount)}</Text>} />
              ))}
            </Card>
          )}
          {c.notes ? <Card tone="default"><Text size="sm" tone="secondary">{c.notes}</Text></Card> : null}
          {canManage && <Button variant="ghost" icon={Power} loading={busy} onPress={() => toggle(c)}>{c.isActive ? t('Band karein') : t('Phir kaam par')}</Button>}

          <MoneySheet open={pay} title={t('{{name}} ko pay', { name: c.name })} description={t('Drawer se — expense me jata hai')} due={c.dailyWage ?? c.perProjectRate ?? undefined} busy={busy} cta={t('Pay save')} outgoing
            hint={t('Dihari, thekay ya advance')}
            extra={(c.activeOrders?.length ?? 0) > 0 ? <View style={{ gap: 6 }}><Text size="sm" weight="semibold" tone="secondary">{t('Kis order ka')}</Text><ChipGroup wrap value={orderId} onChange={(x) => setOrderId(orderId === x ? '' : x)} options={(c.activeOrders ?? []).map((o) => ({ value: o.id, label: `${o.orderNumber} · ${o.productType}` }))} /></View> : undefined}
            onSubmit={doPay} onClose={() => setPay(false)} />
        </View>
      )}
    </DetailTemplate>
  );
}
