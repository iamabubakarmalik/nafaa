/** Warranty claims (web WarrantyClaimsPage): units left for repair, claims sent to the brand, what is stale and what is done. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Building2, CheckCircle2, ClipboardList, Plus, Printer, ShieldCheck, TriangleAlert, Trash2, Wrench } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { daysSince } from '@nafaa/core/industries/electronics';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Badge, Button, Card, ChipGroup, DetailRow, EmptyState, ListRow, ListTemplate, Row, Sheet, StatTile, Text, confirm, toast, useDebouncedValue, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { MetaPill } from '../../mobile/components/kit';
import { warrantyClaimsApi, type ClaimRow, type ClaimView } from '../api';
import { BrandSheet, NewClaimSheet, ResolveClaimSheet } from '../components/ClaimSheets';
import { CLAIM_KEYS, OUTCOME, claimStage, metaText, refreshElectronics } from '../meta';
import { claimSlip, sendSlip } from '../slips';

const VIEWS: Array<{ value: ClaimView; label: string }> = [
  { value: 'open', label: t('Khule') }, { value: 'repair', label: t('Repair mein') }, { value: 'brand', label: t('Company ke paas') }, { value: 'stale', label: t('Hafte se purane') },
  { value: 'done', label: t('Hal hue') }, { value: 'closed', label: t('Cancel') }, { value: 'all', label: t('Sab') },
];

export function WarrantyClaimsScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ serial?: string; q?: string }>();
  const canManage = usePermission()(P.ELECTRONICS_WARRANTY_MANAGE);
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('electronicsDesk');
  const [view, setView] = useState<ClaimView>(params.q ? 'all' : 'open');
  const [search, setSearch] = useState(params.q ?? '');
  const query = useDebouncedValue(search.trim(), 250);
  const [creating, setCreating] = useState<string | null>(params.serial ?? null);
  const [open, setOpen] = useState<ClaimRow | null>(null);
  const q = { view, search: query || undefined, page: 1, limit: 60 };
  const list = useQuery({ queryKey: ['electronics-claims', 'page', q], queryFn: () => warrantyClaimsApi.page(q), placeholderData: (p) => p });
  const sum = useQuery({ queryKey: ['electronics-claims-summary'], queryFn: warrantyClaimsApi.summary, refetchInterval: 60_000 });
  const c = list.data?.counts;
  const s = sum.data;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Wrench} tone="warning" label={t('Abhi kaam baqi')} loading={sum.isLoading} value={String(s?.pending ?? 0)} onPress={() => setView('open')} />
        <StatTile style={{ flex: 1 }} icon={TriangleAlert} tone={s?.stale ? 'danger' : 'neutral'} label={t('Hafte se purane')} loading={sum.isLoading} value={String(s?.stale ?? 0)} onPress={() => setView('stale')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Building2} tone="info" label={t('Company ke paas')} loading={sum.isLoading} value={String(s?.sentToBrand ?? 0)} onPress={() => setView('brand')} />
        <StatTile style={{ flex: 1 }} label={t('Dukaan ka kharcha')} loading={sum.isLoading} value={cost(s?.cost.shopBore ?? 0)} />
      </Row>
      <ChipGroup value={view} onChange={setView} options={VIEWS.map((v) => ({ value: v.value, label: `${v.label}${c?.[v.value] != null ? ` ${c[v.value]}` : ''}` }))} />
      <OfflineNote feature="electronicsDesk" />
      <CachedNote query={list} />
    </View>
  );

  return (
    <>
      <ListTemplate<ClaimRow>
        title={t('Warranty claims')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Claim, customer, serial ya product…') }}
        summary={header}
        data={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.data ? null : list.error}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        keyExtractor={(x) => x.id}
        renderItem={({ item: x }) => {
          const isOpen = !x.resolvedAt && ['ACTIVE', 'CLAIMED', 'IN_REPAIR'].includes(x.status);
          const age = daysSince(x.claimDate);
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: isOpen && age >= 7 ? th.colors.danger.solid : th.colors.border }}>
              <ListRow icon={ShieldCheck} iconTone={claimStage(x).tone}
                title={<Text weight="semibold" numberOfLines={1}>{x.productName}</Text>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone="muted" numberOfLines={1}>{x.claimNumber} · {x.customerName}</Text>
                  <Row gap={1} wrap><MetaPill m={claimStage(x)} />{isOpen && age >= 7 ? <Badge tone="danger">{t('{{n}} din', { n: age })}</Badge> : null}{x.sentToBrand ? <Badge tone="accent">{t('Company ke paas')}</Badge> : null}</Row>
                </View>}
                trailing={<Text size="2xs" tone="muted">{formatDate(x.claimDate)}</Text>}
                onPress={() => setOpen(x)} />
            </View>
          );
        }}
        empty={<EmptyState icon={ClipboardList} title={t('Koi claim nahi')} message={t('Naya claim kholne ke liye + dabayein.')} />}
        fab={canManage ? { icon: Plus, label: t('Naya claim'), onPress: () => guard(() => setCreating('')) } : undefined}
      />
      <NewClaimSheet open={creating != null} initialCode={creating ?? undefined} onClose={() => setCreating(null)} />
      <ClaimSheet claim={open} canManage={canManage} onClose={() => setOpen(null)} />
    </>
  );
}

function ClaimSheet({ claim: c, canManage, onClose }: { claim: ClaimRow | null; canManage: boolean; onClose: () => void }) {
  const th = useTheme();
  const { cost } = useCostMask();
  const lang = useBillLanguage();
  const shopName = useAuthStore((s) => s.tenant?.name) ?? '';
  const [resolve, setResolve] = useState(false);
  const [brand, setBrand] = useState(false);
  const detail = useQuery({ queryKey: ['electronics-claims', 'one', c?.id], queryFn: () => warrantyClaimsApi.getOne(c!.id), enabled: !!c });
  const d = detail.data ?? c;
  useEffect(() => { if (!c) { setResolve(false); setBrand(false); } }, [c]);
  const isOpen = !!c && !c.resolvedAt && ['ACTIVE', 'CLAIMED', 'IN_REPAIR'].includes(c.status);
  const underWarranty = !!detail.data?.serial?.warrantyEndDate && !!c && new Date(detail.data.serial.warrantyEndDate).getTime() > new Date(c.claimDate).getTime();
  const toRepair = useMutation({
    mutationFn: () => warrantyClaimsApi.updateStatus(c!.id, { status: 'IN_REPAIR' }),
    onSuccess: () => { toast.success(t('Repair mein')); refreshElectronics([...CLAIM_KEYS, 'electronics-claims']); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const cancel = async () => {
    if (!c || !(await confirm({ title: t('Claim cancel karein?'), message: c.claimNumber, tone: 'danger', confirmLabel: t('Haan, cancel') }))) return;
    try { await warrantyClaimsApi.remove(c.id); toast.success(t('Claim cancel ho gaya')); refreshElectronics([...CLAIM_KEYS, 'electronics-claims']); onClose(); } catch (e) { toast.error(apiErrorMessage(e, t('Cancel nahi hua'))); }
  };
  return (
    <>
      <Sheet open={!!c && !resolve && !brand} onClose={onClose} height={0.9} title={c?.productName} description={c ? `${c.claimNumber} · ${c.customerName}` : undefined}
        footer={c ? (
          <Row gap={2} wrap>
            <Button variant="secondary" icon={Printer} style={{ flex: 1 }} onPress={() => void sendSlip(claimSlip(c, lang), shopName, lang).catch((e) => toast.error(apiErrorMessage(e, t('Print nahi hua'))))}>{t('Parchi')}</Button>
            {isOpen && canManage ? <Button icon={CheckCircle2} style={{ flex: 1 }} onPress={() => setResolve(true)}>{t('Hal karein')}</Button> : null}
          </Row>
        ) : undefined}>
        {c && d && (
          <View style={{ gap: th.space(2) }}>
            <Card flush>
              <DetailRow label={t('Halat')} value={<MetaPill m={claimStage(c)} />} />
              <DetailRow label={t('Kharabi')} value={c.issueDescription} />
              {c.serialNumber ? <DetailRow label={t('Serial')} value={c.imei ? `${c.serialNumber} / ${c.imei}` : c.serialNumber} /> : null}
              <DetailRow label={t('Khareed')} value={`${formatDate(c.purchaseDate)}${c.invoiceNumber ? ` · ${c.invoiceNumber}` : ''}`} />
              {detail.data?.serial?.warrantyEndDate ? <DetailRow label={t('Warranty tak')} value={formatDate(detail.data.serial.warrantyEndDate)} /> : null}
              {c.customerPhone ? <DetailRow label={t('Phone')} value={c.customerPhone} /> : null}
              {c.diagnosis ? <DetailRow label={t('Masla')} value={c.diagnosis} /> : null}
              {c.sentToBrand ? <DetailRow label={t('Company ref')} value={`${c.brandRef ?? '—'}${c.brandContactedAt ? ` · ${formatDate(c.brandContactedAt)}` : ''}`} /> : null}
              {c.brandResponse ? <DetailRow label={t('Company ka jawab')} value={c.brandResponse} /> : null}
              {c.resolvedAt ? <DetailRow label={t('Natija')} value={t(OUTCOME[c.resolutionType as keyof typeof OUTCOME]?.label ?? c.resolutionType ?? '—')} /> : null}
              {c.replacementSerialNumber ? <DetailRow label={t('Naya unit')} value={c.replacementSerialNumber} /> : null}
              {c.paidByCustomer > 0 ? <DetailRow label={t('Customer charge')} value={formatMoney(c.paidByCustomer)} /> : null}
              {c.repairCost > 0 ? <DetailRow label={t('Repair kharcha')} value={cost(c.repairCost)} /> : null}
              {c.paidByBrand > 0 ? <DetailRow label={t('Company ne diya')} value={cost(c.paidByBrand)} /> : null}
              {c.refundAmount > 0 ? <DetailRow label={t('Paisa wapas')} value={formatMoney(c.refundAmount)} /> : null}
              <DetailRow label={t('Bill')} value={c.bill ? `${c.bill.saleNumber} · ${formatMoney(c.bill.total)}` : '—'} last />
            </Card>
            {c.internalNotes ? <Text size="sm" tone="secondary">{c.internalNotes}</Text> : null}
            {isOpen && canManage && !c.bill && (
              <Row gap={2} wrap>
                {c.status !== 'IN_REPAIR' ? <Button variant="soft" size="sm" icon={Wrench} loading={toRepair.isPending} onPress={() => toRepair.mutate()}>{t('Repair mein daalein')}</Button> : null}
                <Button variant="soft" size="sm" icon={Building2} onPress={() => setBrand(true)}>{c.sentToBrand ? t('Company ka record') : t('Company ko bheja')}</Button>
                <Button variant="ghost" size="sm" icon={Trash2} onPress={() => void cancel()}>{t('Cancel')}</Button>
              </Row>
            )}
          </View>
        )}
      </Sheet>
      <ResolveClaimSheet claim={resolve ? c : null} underWarranty={underWarranty} onClose={() => { setResolve(false); onClose(); }} />
      <BrandSheet claim={brand ? c : null} onClose={() => { setBrand(false); }} />
    </>
  );
}
