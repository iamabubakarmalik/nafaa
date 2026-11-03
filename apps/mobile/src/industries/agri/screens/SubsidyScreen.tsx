/** Government subsidy claims (web SubsidyPage): scheme, product and amounts per farmer; approve, reject, mark paid. */

import { Banknote, Clock, Landmark, Plus, ShieldCheck, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { cnicOk, formatCnic } from '@nafaa/core/industries/agri';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, Checkbox, ChipGroup, DetailRow, EmptyState, Input, ListRow, ListTemplate, MoneyInput, Row, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { ReasonSheet, RowCard, StatRow } from '../../_shared/farm/ui';
import { FarmerField } from '../components/FarmerField';
import { subsidyApi, type Farmer, type SubsidyClaim } from '../api';
import { AGRI_KEYS, CLAIM_STATUS, opt, refreshAgri } from '../meta';

const LIMIT = 25;
const SCHEMES = ['Kissan Card', 'DAP subsidy', 'Urea subsidy', 'Beej subsidy', 'Spray subsidy', 'Machinery scheme'];
const DOCS = ['CNIC copy', 'Fard / zameen ka record', 'Kissan card', 'Bill ki copy', 'Scheme voucher'];

export function SubsidyScreen() {
  const th = useTheme();
  const manage = usePermission()(P.AGRI_ORDERS_MANAGE);
  const { guard } = useDeskOnline('agriDesk');
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<SubsidyClaim | null>(null);
  const [adding, setAdding] = useState(false);
  const params = { search: search.trim() || undefined, status: tab || undefined, limit: LIMIT };
  const list = usePaged([AGRI_KEYS.subsidy, 'page', params], (page) => subsidyApi.page({ ...params, page }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })));
  const c = list.first?.counts ?? {};
  const a = list.first?.amounts ?? {};
  const live = open ? list.items.find((x) => x.id === open.id) ?? open : null;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: Clock, tone: 'warning', label: t('Baqi'), loading: list.loading, value: String(c.PENDING ?? 0), hint: formatMoney(a.PENDING ?? 0), onPress: () => setTab('PENDING') },
        { icon: ShieldCheck, tone: 'info', label: t('Manzoor'), loading: list.loading, value: String(c.APPROVED ?? 0), hint: formatMoney(a.APPROVED ?? 0), onPress: () => setTab('APPROVED') },
      ]} />
      <StatRow tiles={[
        { icon: Banknote, tone: 'success', label: t('Paisa mil gaya'), loading: list.loading, value: String(c.DISBURSED ?? 0), hint: formatMoney(a.DISBURSED ?? 0), onPress: () => setTab('DISBURSED') },
        { icon: XCircle, tone: 'danger', label: t('Radd'), loading: list.loading, value: String(c.REJECTED ?? 0), onPress: () => setTab('REJECTED') },
      ]} />
      <ChipGroup value={tab} onChange={setTab} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab') }, ...Object.keys(CLAIM_STATUS).map((s) => ({ value: s, label: t(CLAIM_STATUS[s].label) }))]} />
      <OfflineNote feature="agriDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<SubsidyClaim>
        title={t('Govt subsidies')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Claim, farmer ya scheme…') }}
        summary={header}
        data={list.items}
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={list.refetch}
        onEndReached={list.loadMore}
        keyExtractor={(x) => x.id}
        renderItem={({ item: x }) => {
          const st = CLAIM_STATUS[x.status] ?? { label: x.status, tone: 'neutral' as const };
          return (
            <RowCard>
              <ListRow icon={Landmark} iconTone={st.tone}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{x.schemeName}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
                subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" ltr numberOfLines={1}>{`${x.claimNumber} · ${x.productType}`}</Text><Text size="xs" tone="secondary" numberOfLines={1}>{x.farmer?.fullName ?? '—'}</Text></View>}
                trailing={<Amount value={x.subsidyAmount} weight="bold" />} chevron onPress={() => setOpen(x)} />
            </RowCard>
          );
        }}
        empty={<EmptyState icon={Landmark} title={search ? t('Koi claim nahi mila') : t('Abhi koi claim nahi')} message={t('Sarkari subsidy ka claim yahan likhein aur uska pata rakhein.')} />}
        fab={manage ? { icon: Plus, label: t('Naya claim'), onPress: () => guard(() => setAdding(true)) } : undefined}
      />
      <ClaimSheet x={live} manage={manage} onClose={() => setOpen(null)} />
      <ClaimForm open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function ClaimSheet({ x, manage, onClose }: { x: SubsidyClaim | null; manage: boolean; onClose: () => void }) {
  const th = useTheme();
  const { guard } = useDeskOnline('agriDesk');
  const [approvedBy, setApprovedBy] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); refreshAgri([AGRI_KEYS.subsidy], true); toast.success(ok); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  const st = x ? CLAIM_STATUS[x.status] ?? { label: x.status, tone: 'neutral' as const } : null;
  return (
    <>
      <Sheet open={!!x && !rejecting} onClose={onClose} height={0.86} title={x?.schemeName} description={x ? `${x.claimNumber} · ${x.farmer?.fullName ?? ''}` : undefined}
        footer={x && manage && x.status === 'PENDING' ? <Row gap={2}><Button style={{ flex: 1 }} size="lg" variant="secondary" onPress={() => guard(() => setRejecting(true))}>{t('Radd')}</Button><Button style={{ flex: 1 }} size="lg" loading={busy} onPress={() => guard(() => void run(() => subsidyApi.approve(x.id, opt(approvedBy)), t('Manzoor')))}>{t('Manzoor')}</Button></Row>
          : x && manage && x.status === 'APPROVED' ? <Button fullWidth size="lg" variant="success" icon={Banknote} loading={busy} onPress={() => guard(() => void run(() => subsidyApi.disburse(x.id), t('Paisa mil gaya')))}>{t('Paisa mil gaya')}</Button> : undefined}>
        {x && st && (
          <View style={{ gap: th.space(3) }}>
            <Row gap={2} wrap><Badge tone={st.tone}>{t(st.label)}</Badge>{!!x.govtScheme && <Text size="sm" tone="muted">{x.govtScheme}</Text>}</Row>
            <Card flush>
              <DetailRow label={t('Maal')} value={x.productType} />
              <DetailRow label={t('Quantity')} value={String(x.quantity)} />
              <DetailRow label={t('Kul asal price')} value={formatMoney(x.originalPrice)} />
              <DetailRow label={t('Subsidy amount')} value={<Amount value={x.subsidyAmount} weight="bold" tone="success" />} />
              <DetailRow label={t('Farmer ka hissa')} value={formatMoney(x.finalPrice)} last />
            </Card>
            <Card flush>
              <DetailRow label={t('Farmer')} value={x.farmer?.fullName ?? '—'} />
              {!!x.farmerCnic && <DetailRow label={t('CNIC')} value={<Text ltr>{x.farmerCnic}</Text>} />}
              {!!x.cropTarget && <DetailRow label={t('Fasal')} value={x.cropTarget} />}
              {!!x.approvedBy && <DetailRow label={t('Manzoor kis ne kiya')} value={x.approvedBy} />}
              {!!x.approvalDate && <DetailRow label={t('Manzoor')} value={formatDate(x.approvalDate, { year: true })} />}
              {!!x.disbursementDate && <DetailRow label={t('Paisa mil gaya')} value={formatDate(x.disbursementDate, { year: true })} />}
              <DetailRow label={t('Date')} value={formatDate(x.createdAt, { year: true })} last />
            </Card>
            {x.documentsSubmitted.length > 0 && <Card title={t('Kagzaat')}><Row gap={1.5} wrap>{x.documentsSubmitted.map((d) => <Badge key={d} tone="neutral">{t(d)}</Badge>)}</Row></Card>}
            {!!x.rejectionReason && <Card tone="danger"><Text size="sm">{x.rejectionReason}</Text></Card>}
            {!!x.notes && <Card><Text size="sm" tone="secondary">{x.notes}</Text></Card>}
            {manage && x.status === 'PENDING' && <Input label={t('Manzoor kis ne kiya')} value={approvedBy} onChangeText={setApprovedBy} placeholder={t('Agri officer / bank ka naam')} hint={t('Marzi hai')} />}
          </View>
        )}
      </Sheet>
      <ReasonSheet open={rejecting} title={t('Claim radd karein')} cta={t('Radd')} label={t('Wajah')} onClose={() => setRejecting(false)}
        onConfirm={async (reason) => { await run(() => subsidyApi.reject(x!.id, reason), t('Radd')); }} />
    </>
  );
}

function ClaimForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const blank = { schemeName: '', govtScheme: '', productType: '', quantity: null as number | null, originalPrice: null as number | null, subsidyAmount: null as number | null, farmerCnic: '', cropTarget: '', landAreaAcres: null as number | null, docs: [] as string[], notes: '' };
  const [d, setD] = useState(blank);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setD(blank); setFarmer(null); setTouched(false); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const error = !farmer ? t('Farmer chunein') : !d.schemeName.trim() ? t('Scheme likhein') : !d.productType.trim() ? t('Maal likhein') : !((d.quantity ?? 0) > 0) ? t('Quantity likhein') : !((d.originalPrice ?? 0) > 0) ? t('Asal price likhein') : !((d.subsidyAmount ?? 0) > 0) ? t('Subsidy amount likhein') : (d.subsidyAmount ?? 0) > (d.originalPrice ?? 0) ? t('Subsidy kul price se zyada nahi') : !cnicOk(d.farmerCnic) ? t('CNIC 13 hindsay ka hota hai') : '';
  const save = async () => {
    setTouched(true);
    if (error) { toast.error(error); return; }
    setBusy(true);
    try {
      await subsidyApi.create({ farmerId: farmer!.id, schemeName: d.schemeName.trim(), govtScheme: opt(d.govtScheme), productType: d.productType.trim(), quantity: d.quantity ?? 0, originalPrice: d.originalPrice ?? 0, subsidyAmount: d.subsidyAmount ?? 0, farmerCnic: opt(d.farmerCnic), cropTarget: opt(d.cropTarget), landAreaAcres: d.landAreaAcres ?? undefined, documentsSubmitted: d.docs, notes: opt(d.notes) });
      refreshAgri([AGRI_KEYS.subsidy]);
      toast.success(t('Claim likh diya'));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} height={0.94} title={t('Naya claim')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <FarmerField label={t('Farmer')} value={farmer} onChange={(f) => { setFarmer(f); if (f) setD((x) => ({ ...x, farmerCnic: x.farmerCnic || f.cnic || '', landAreaAcres: x.landAreaAcres ?? f.landAreaAcres ?? null })); }} error={touched && !farmer ? error : undefined} />
        <Input label={t('Scheme')} value={d.schemeName} onChangeText={(v) => set('schemeName', v)} placeholder={t('Kissan Card')} error={touched && farmer && !d.schemeName.trim() ? error : undefined} />
        <ChipGroup wrap value={d.schemeName} onChange={(v) => set('schemeName', v)} options={SCHEMES.map((s) => ({ value: t(s), label: t(s) }))} />
        <Input label={t('Mahkama / bank')} value={d.govtScheme} onChangeText={(v) => set('govtScheme', v)} hint={t('Marzi hai')} />
        <Input label={t('Maal')} value={d.productType} onChangeText={(v) => set('productType', v)} placeholder={t('DAP 50 kg')} />
        <NumberInput label={t('Quantity')} value={d.quantity} onChangeValue={(v) => set('quantity', v)} />
        <MoneyInput label={t('Kul asal price')} value={d.originalPrice} onChangeValue={(v) => set('originalPrice', v)} />
        <MoneyInput label={t('Subsidy amount')} value={d.subsidyAmount} onChangeValue={(v) => set('subsidyAmount', v)} />
        <Input label={t('CNIC')} keyboardType="number-pad" ltr value={d.farmerCnic} onChangeText={(v) => set('farmerCnic', formatCnic(v))} placeholder="35202-1234567-1" />
        <Input label={t('Fasal')} value={d.cropTarget} onChangeText={(v) => set('cropTarget', v)} />
        <NumberInput label={t('Zameen (acre)')} value={d.landAreaAcres} onChangeValue={(v) => set('landAreaAcres', v)} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Kagzaat')}</Text>
        {DOCS.map((doc) => <Checkbox key={doc} value={d.docs.includes(doc)} onChange={(on) => set('docs', on ? [...d.docs, doc] : d.docs.filter((x) => x !== doc))} label={t(doc)} />)}
        <TextArea label={t('Note')} value={d.notes} onChangeText={(v) => set('notes', v)} hint={t('Marzi hai')} />
      </View>
    </Sheet>
  );
}
