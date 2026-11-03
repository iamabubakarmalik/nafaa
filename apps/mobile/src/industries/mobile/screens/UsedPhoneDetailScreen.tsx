/** One used phone (web UsedPhoneDetailPage): cost and margin, the check history, the seller and where the money went. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, CheckCircle2, ClipboardCheck, MessageCircle, Pencil, Printer, ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatDate, formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Badge, Button, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, PageHero, HeroAmount, HeroText, Text, toast, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { usedPhonesApi } from '../api';
import { DiscardSheet, InspectionSheet } from '../components/UsedPhoneSheets';
import { MetaPill } from '../components/kit';
import { USED_KEY, conditionOf, metaText, openWhatsApp, ptaOf, refreshMobile, sourceOf, usedStatusOf } from '../meta';
import { buybackSlip, sendSlip } from '../slips';

export function UsedPhoneDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const canManage = can(P.MOBILE_IMEI_MANAGE);
  const lang = useBillLanguage();
  const shopName = useAuthStore((s) => s.tenant?.name) ?? '';
  const { cost } = useCostMask();
  const [checking, setChecking] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const q = useQuery({ queryKey: [USED_KEY, 'detail', id], queryFn: () => usedPhonesApi.detail(id), enabled: !!id });
  const ready = useMutation({
    mutationFn: () => usedPhonesApi.markInStock(id),
    onSuccess: () => { toast.success(t('Phone bikne ko tayyar')); refreshMobile([USED_KEY]); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const p = q.data;
  const slip = (share: boolean) => { if (p) void sendSlip(buybackSlip(p, lang), shopName, lang, share).catch((e) => toast.error(apiErrorMessage(e, t('Print nahi hua')))); };
  const open = !!p && p.status !== 'SOLD' && p.status !== 'DISCARDED';
  const sold = p?.status === 'SOLD';
  const extras = p ? [p.hasOriginalBox && t('Dabba'), p.hasOriginalCharger && t('Charger'), p.hasOriginalCable && t('Cable'), p.hasOriginalEarphones && t('Handsfree'), p.hasOriginalReceipt && t('Pakki raseed'), p.hasWarrantyLeft && t('Company warranty{{value}}', { value: p.warrantyExpiryDate ? ` ${formatDate(p.warrantyExpiryDate)}` : '' })].filter(Boolean) as string[] : [];

  return (
    <DetailTemplate
      title={p ? `${p.brand} ${p.model}${p.storage ? ` ${p.storage}` : ''}` : t('Used phone')}
      subtitle={p ? `${p.usedPhoneCode} · IMEI ${p.imei1}${p.imei2 ? ` / ${p.imei2}` : ''}` : undefined}
      loading={q.isLoading} error={p ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={p ? (
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon={Printer} label={t('Parchi')} onPress={() => slip(false)} />
          {p.fromCustomerPhone ? <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => openWhatsApp(p.fromCustomerPhone, `Assalam o alaikum ${p.fromCustomerName ?? ''},\n${shopName}: ${p.brand} ${p.model} (${p.usedPhoneCode}) — ${formatMoney(p.buybackPrice)}. Shukriya!`)} /> : null}
          {canManage ? <IconButton icon={Pencil} label={t('Badlein')} onPress={() => router.push(`/mobile/used-phones/${p.id}/edit` as never)} /> : null}
        </View>
      ) : undefined}
      summary={p ? (
        <PageHero title={`${p.brand} ${p.model}`} chip={t(usedStatusOf(p.status).label)} stats={[
          { label: t('Cost'), value: <HeroText size="xl" weight="bold" ltr>{cost(p.totalCost)}</HeroText> },
          { label: sold ? t('Bika') : t('Bechne ki qeemat'), value: <HeroAmount value={sold ? Number(p.finalSoldPrice ?? 0) : p.resalePrice} size="xl" /> },
          { label: t('Profit'), value: <HeroText size="xl" weight="bold" ltr>{cost(sold ? Number(p.finalSoldPrice ?? 0) - Number(p.totalCost) : Number(p.resalePrice) - Number(p.totalCost))}</HeroText> },
        ]} />
      ) : undefined}
      bottomActions={p && open && canManage ? (
        <>
          <Button variant="secondary" icon={ClipboardCheck} style={{ flex: 1 }} onPress={() => setChecking(true)}>{t('Check')}</Button>
          {p.status !== 'IN_STOCK' ? <Button icon={CheckCircle2} style={{ flex: 1 }} loading={ready.isPending} onPress={() => ready.mutate()}>{t('Bikne ko tayyar')}</Button>
            : can(P.POS_USE) ? <Button icon={ShoppingCart} style={{ flex: 1 }} onPress={() => router.push('/pos' as never)}>{t('POS par bechein')}</Button> : null}
        </>
      ) : undefined}
    >
      {p && (
        <>
          <DetailSection title={t('Phone')}>
            <DetailRow label={t('PTA')} value={`${t(ptaOf(p.ptaStatus).label)}${p.ptaTaxPaid ? ` · ${t('tax {{n}}', { n: formatMoney(p.ptaTaxPaid) })}` : ''}`} />
            <DetailRow label={t('Halat')} value={`${t(conditionOf(p.condition).label)} (${conditionOf(p.condition).score})`} />
            <DetailRow label={t('RAM / Storage')} value={[p.ram, p.storage].filter(Boolean).join(' / ') || '—'} />
            <DetailRow label={t('Rang / saal')} value={[p.color, p.modelYear].filter(Boolean).join(' · ') || '—'} />
            <DetailRow label={t('Saath')} value={extras.join(', ') || t('Sirf phone')} />
            <DetailRow label={t('Aaya')} value={formatDateTime(p.receivedAt)} last />
            {p.conditionNotes ? <Text size="sm" tone="secondary" style={{ padding: th.space(3) }}>{p.conditionNotes}</Text> : null}
          </DetailSection>

          <DetailSection title={t('Check')}>
            {p.inspections.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(3) }}>{t('Bechne se pehle camera, speaker, charging, battery aur account lock check karein.')}</Text> : p.inspections.map((i, n) => {
              const bad = [i.cameraWorks === false && t('Camera'), i.speakerWorks === false && t('Speaker'), i.microphoneWorks === false && t('Mic'), i.chargingPortWorks === false && t('Charging'), i.buttonsWork === false && t('Buttons'), i.faceIdFingerprintWorks === false && t('Fingerprint/Face'), i.imeiUnlocked === false && 'SIM', i.icloudUnlocked === false && t('Account lock')].filter(Boolean);
              return (
                <ListRow key={i.id} divider={n < p.inspections.length - 1} title={formatDateTime(i.inspectedAt)}
                  subtitle={<View style={{ gap: 2 }}>
                    <Text size="xs" tone="secondary">{t('Screen: {{value}} · Body: {{value2}}', { value: i.screenCondition ?? '—', value2: i.bodyCondition ?? '—' })}</Text>
                    <Text size="xs" tone={bad.length ? 'danger' : 'success'}>{bad.length ? t('Kharab: {{value}}', { value: bad.join(', ') }) : t('Sab theek chal raha hai')}</Text>
                    {i.recommendedActions ? <Text size="xs" tone="muted">{i.recommendedActions}</Text> : null}
                  </View>}
                  trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>{i.batteryHealth != null ? <Badge tone={i.batteryHealth < 80 ? 'warning' : 'success'}>{t('Battery {{n}}%', { n: i.batteryHealth })}</Badge> : null}{i.needsRepair ? <Badge tone="warning">{t('Repair {{n}}', { n: formatMoney(i.estimatedRepairCost) })}</Badge> : null}</View>} />
              );
            })}
          </DetailSection>

          <DetailSection title={p.source === 'CONSIGNMENT' ? t('Malik') : t('Kis se liya')}>
            <DetailRow label={t('Naam')} value={p.fromCustomerName ?? p.fromCustomer?.name ?? '—'} />
            <DetailRow label={t('Phone')} value={p.fromCustomerPhone ?? '—'} />
            <DetailRow label={t('CNIC')} value={p.fromCustomerCnic ?? '—'} last />
            {(p.cnicPhotoUrl || p.imeiPhotoUrl) ? (
              <View style={{ flexDirection: 'row', gap: th.space(2), padding: th.space(3) }}>
                {p.cnicPhotoUrl ? <Image source={{ uri: p.cnicPhotoUrl }} style={{ width: 110, height: 80, borderRadius: th.radius('lg') }} /> : null}
                {p.imeiPhotoUrl ? <Image source={{ uri: p.imeiPhotoUrl }} style={{ width: 110, height: 80, borderRadius: th.radius('lg') }} /> : null}
              </View>
            ) : null}
          </DetailSection>

          <DetailSection title={t('Paise kahan gaye')}>
            <DetailRow label={t(sourceOf(p.source).label)} value={formatMoney(p.buybackPrice)} />
            {p.source === 'CASH_BUYBACK' && <DetailRow label={p.paidFromDrawer ? t('Galle se diye (register me likha)') : t('Galla khula nahi tha — register me nahi likha')} value={p.paidFromDrawer ? '✓' : '!'} />}
            {p.source === 'EXCHANGE' && <DetailRow label={p.tradeInBill ? t('Trade-in bill {{saleNumber}}', { saleNumber: p.tradeInBill.saleNumber }) : t('Abhi kisi bill me trade-in nahi laga — POS par Split / Trade-in se lagayein')} value={p.tradeInBill ? '✓' : '!'} />}
            {p.sale && <DetailRow label={t('Bika: {{saleNumber}}{{value}}', { saleNumber: p.sale.saleNumber, value: p.sale.customer ? ` · ${p.sale.customer.name}` : '' })} value={formatMoney(p.sale.total)} />}
            <DetailRow label={t('Status')} value={<MetaPill m={usedStatusOf(p.status)} />} last />
          </DetailSection>

          {p.history.length > 0 && (
            <DetailSection title={t('Is IMEI ka purana record')}>
              {p.history.map((h, n) => (
                <ListRow key={h.id} divider={n < p.history.length - 1} title={h.usedPhoneCode} subtitle={`${formatDate(h.receivedAt)} · ${h.fromCustomerName ?? ''}`}
                  trailing={<Badge tone={usedStatusOf(h.status).tone}>{metaText(usedStatusOf(h.status))}</Badge>} chevron onPress={() => router.push(`/mobile/used-phones/${h.id}` as never)} />
              ))}
            </DetailSection>
          )}

          {open && canManage && !p.tradeInBill && <Button variant="ghost" icon={Ban} onPress={() => setDiscarding(true)}>{t('Hata dein')}</Button>}
          <Button variant="ghost" onPress={() => slip(true)}>{t('Parchi share karein (PDF)')}</Button>
        </>
      )}
      <InspectionSheet phone={checking ? p ?? null : null} onClose={() => setChecking(false)} />
      <DiscardSheet phone={discarding ? p ?? null : null} onClose={() => setDiscarding(false)} />
    </DetailTemplate>
  );
}
