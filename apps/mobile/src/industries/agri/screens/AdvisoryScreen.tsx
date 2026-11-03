/** Crop advisory (web AdvisoryPage): a farmer's crop problem, the advice given, products suggested and the follow-up date. */

import { CalendarClock, CheckCircle2, ListChecks, Plus, Share2, Sprout, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { adviceLines, adviceProducts } from '@nafaa/core/industries/agri';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, DatePicker, DetailRow, EmptyState, FormSection, IconButton, Input, ListRow, ListTemplate, Row, Select, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { OfflineNote, dateToKey, errorText, keyToDate, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { FarmerField } from '../components/FarmerField';
import { advisoryApi, farmersApi, type AdvisoryInput, type AdvisoryTab, type CropAdvisory, type Farmer } from '../api';
import { AGRI_KEYS, CROPS, SEASONS, daysTo, dayPhrase, opt, refreshAgri, seasonLabel } from '../meta';

const LIMIT = 25;
const STAGES = ['Zameen ki tayyari', 'Bijai', 'Ugaao', 'Barhwar', 'Phool', 'Phal / daana', 'Pakai', 'Katai'];

export function AdvisoryScreen() {
  const th = useTheme();
  const manage = usePermission()(P.AGRI_ADVISORY_MANAGE);
  const { guard } = useDeskOnline('agriDesk');
  const [tab, setTab] = useState<AdvisoryTab>('open');
  const [season, setSeason] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<CropAdvisory | null>(null);
  const [form, setForm] = useState<CropAdvisory | 'new' | null>(null);
  const params = { search: search.trim() || undefined, tab, season: season || undefined, limit: LIMIT };
  const list = usePaged([AGRI_KEYS.advisory, 'page', params], (page) => advisoryApi.page({ ...params, page }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })));
  const c = list.first?.counts;
  const live = open ? list.items.find((a) => a.id === open.id) ?? open : null;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: ListChecks, tone: 'info', label: t('Khule'), loading: list.loading, value: String(c?.open ?? 0), onPress: () => setTab('open') },
        { icon: CalendarClock, tone: (c?.due ?? 0) > 0 ? 'warning' : 'neutral', label: t('Follow-up aaj / guzra'), loading: list.loading, value: String(c?.due ?? 0), onPress: () => setTab('due') },
      ]} />
      <StatRow tiles={[
        { icon: CheckCircle2, tone: 'success', label: t('Mukammal'), loading: list.loading, value: String(c?.done ?? 0), onPress: () => setTab('done') },
        { icon: Sprout, tone: 'success', label: t('Sab se zyada'), loading: list.loading, value: list.first?.analytics.crops[0]?.crop ?? '—' },
      ]} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as AdvisoryTab)} style={{ marginHorizontal: -th.space(4) }} options={[{ value: 'open', label: t('Khule') }, { value: 'due', label: t('Follow-up') }, { value: 'done', label: t('Mukammal') }, { value: 'all', label: t('Sab') }]} />
      <ChipGroup value={season} onChange={setSeason} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Har season') }, ...SEASONS.filter((s) => s.value !== 'ALL_SEASON').map((s) => ({ value: s.value, label: t(s.label) }))]} />
      <OfflineNote feature="agriDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<CropAdvisory>
        title={t('Crop advisory')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Farmer, fasal ya mashwara…') }}
        summary={header}
        data={list.items}
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={list.refetch}
        onEndReached={list.loadMore}
        keyExtractor={(a) => a.id}
        renderItem={({ item: a }) => {
          const d = a.followUpDate ? daysTo(a.followUpDate) : null;
          return (
            <RowCard>
              <ListRow icon={Sprout} iconTone={a.completed ? 'success' : d !== null && d <= 0 ? 'warning' : 'info'}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{[a.cropName, a.cropVariety].filter(Boolean).join(' · ')}</Text>{a.completed && <Badge tone="success">{t('Mukammal')}</Badge>}</Row>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone="muted" numberOfLines={1}>{[a.farmer?.fullName ?? t('Farmer ke bagair'), a.stage, a.season ? seasonLabel(a.season) : ''].filter(Boolean).join(' · ')}</Text>
                  {!a.completed && d !== null && <Text size="xs" tone={d <= 0 ? 'warning' : 'secondary'}>{t('Follow-up')} · {dayPhrase(d)}</Text>}
                </View>}
                chevron onPress={() => setOpen(a)} />
            </RowCard>
          );
        }}
        empty={<EmptyState icon={Sprout} title={search ? t('Koi mashwara nahi mila') : t('Abhi koi mashwara nahi')} message={t('Farmer ki fasal ka masla aur apna mashwara yahan likhein.')} />}
        fab={manage ? { icon: Plus, label: t('Naya mashwara'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <DetailSheet a={live} manage={manage} onClose={() => setOpen(null)} onEdit={(a) => { setOpen(null); guard(() => setForm(a)); }} />
      <FormSheet value={form} onClose={() => setForm(null)} />
    </>
  );
}

function DetailSheet({ a, manage, onClose, onEdit }: { a: CropAdvisory | null; manage: boolean; onClose: () => void; onEdit: (a: CropAdvisory) => void }) {
  const th = useTheme();
  const [busy, setBusy] = useState(false);
  const recs = a ? adviceLines(a.recommendations) : [];
  const prods = a ? adviceProducts(a.productSuggestions) : [];
  const share = () => {
    if (!a) return;
    const text = [`${t('Fasal ka mashwara')} ${a.advisoryNumber}`, [a.cropName, a.cropVariety].filter(Boolean).join(' · '), a.currentIssues ? `${t('Masla')}: ${a.currentIssues}` : '', ...recs.map((r, i) => `${i + 1}. ${r}`), prods.length ? `${t('Maal')}: ${prods.map((p) => p.name).join(', ')}` : ''].filter(Boolean).join('\n');
    void Share.share({ message: text });
  };
  const complete = async () => {
    if (!a) return;
    setBusy(true);
    try { await advisoryApi.complete(a.id); refreshAgri([AGRI_KEYS.advisory]); toast.success(t('Mukammal')); onClose(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!a} onClose={onClose} height={0.88} title={a ? [a.cropName, a.cropVariety].filter(Boolean).join(' · ') : ''} description={a ? `${a.advisoryNumber} · ${a.farmer?.fullName ?? t('Farmer ke bagair')}` : undefined}
      footer={a && manage && !a.completed ? <Row gap={2}><Button style={{ flex: 1 }} size="lg" variant="secondary" onPress={() => onEdit(a)}>{t('Badlein')}</Button><Button style={{ flex: 1 }} size="lg" icon={CheckCircle2} loading={busy} onPress={() => void complete()}>{t('Mukammal')}</Button></Row> : undefined}>
      {a && (
        <View style={{ gap: th.space(3) }}>
          <Card flush>
            {!!a.season && <DetailRow label={t('Season')} value={seasonLabel(a.season)} />}
            {!!a.landAreaAcres && <DetailRow label={t('Zameen')} value={t('{{count}} acre', { count: a.landAreaAcres })} />}
            {!!a.stage && <DetailRow label={t('Marhala')} value={a.stage} />}
            {!!a.sowingDate && <DetailRow label={t('Bijai')} value={formatDate(a.sowingDate, { year: true })} />}
            {!!a.expectedHarvest && <DetailRow label={t('Katai (andaza)')} value={formatDate(a.expectedHarvest, { year: true })} />}
            <DetailRow label={t('Follow-up')} value={a.followUpDate ? formatDate(a.followUpDate, { year: true }) : '—'} last />
          </Card>
          {!!a.currentIssues && <Card title={t('Masla')}><Text size="sm">{a.currentIssues}</Text></Card>}
          {recs.length > 0 && <Card title={t('Mashwara')}>{recs.map((r, i) => <Text key={i} size="sm">{`${i + 1}. ${r}`}</Text>)}</Card>}
          {prods.length > 0 && <Card title={t('Maal')}><Row gap={1.5} wrap>{prods.map((p, i) => <Badge key={i} tone="success">{p.name}</Badge>)}</Row></Card>}
          {!!a.notes && <Card title={t('Note')}><Text size="sm" tone="secondary">{a.notes}</Text></Card>}
          <Button variant="secondary" icon={Share2} onPress={share}>{t('Share')}</Button>
        </View>
      )}
    </Sheet>
  );
}

function FormSheet({ value, onClose }: { value: CropAdvisory | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const a = value === 'new' ? null : value;
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [d, setD] = useState({ cropName: '', cropVariety: '', season: '', landAreaAcres: null as number | null, stage: '', followUpDate: null as string | null, sowingDate: null as string | null, expectedHarvest: null as string | null, currentIssues: '', recommendations: '', notes: '', advisorName: '' });
  const [products, setProducts] = useState<Array<{ productId: string; name: string }>>([]);
  const [picking, setPicking] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!value) return;
    setTouched(false);
    setFarmer(null);
    setD({
      cropName: a?.cropName ?? '', cropVariety: a?.cropVariety ?? '', season: a?.season ?? '', landAreaAcres: a?.landAreaAcres ?? null, stage: a?.stage ?? '', followUpDate: a?.followUpDate?.slice(0, 10) ?? null,
      sowingDate: a?.sowingDate?.slice(0, 10) ?? null, expectedHarvest: a?.expectedHarvest?.slice(0, 10) ?? null, currentIssues: a?.currentIssues ?? '', recommendations: adviceLines(a?.recommendations).join('\n'), notes: a?.notes ?? '', advisorName: a?.advisorName ?? '',
    });
    setProducts(adviceProducts(a?.productSuggestions).filter((p): p is { productId: string; name: string } => !!p.productId));
    if (a?.farmerId) void farmersApi.getOne(a.farmerId).then(setFarmer).catch(() => undefined);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const error = !d.cropName.trim() ? t('Fasal likhein') : d.sowingDate && d.expectedHarvest && d.expectedHarvest < d.sowingDate ? t('Katai bijai se pehle nahi ho sakti') : '';
  const save = async () => {
    setTouched(true);
    if (error) { toast.error(error); return; }
    const body: AdvisoryInput = {
      farmerId: farmer?.id ?? null, advisorName: opt(d.advisorName), cropName: d.cropName.trim(), cropVariety: opt(d.cropVariety), season: opt(d.season), landAreaAcres: d.landAreaAcres, stage: opt(d.stage),
      sowingDate: d.sowingDate, expectedHarvest: d.expectedHarvest, currentIssues: opt(d.currentIssues), recommendations: d.recommendations.split('\n').map((x) => x.trim()).filter(Boolean),
      productSuggestions: products, followUpDate: d.followUpDate, notes: opt(d.notes),
    };
    setBusy(true);
    try {
      if (a) await advisoryApi.update(a.id, body); else await advisoryApi.create(body);
      refreshAgri([AGRI_KEYS.advisory]);
      toast.success(a ? t('Save ho gaya') : t('Mashwara likh diya'));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Sheet open={!!value && !picking} onClose={onClose} height={0.94} title={a ? t('Mashwara badlein') : t('Naya mashwara')}
        footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <FarmerField label={t('Farmer')} value={farmer} onChange={setFarmer} />
          <Input label={t('Fasal')} value={d.cropName} onChangeText={(v) => set('cropName', v)} placeholder={t('Kapas')} error={touched && !d.cropName.trim() ? error : undefined} />
          <ChipGroup wrap value={d.cropName} onChange={(v) => set('cropName', v)} options={CROPS.map((c) => ({ value: t(c), label: t(c) }))} />
          <Input label={t('Variety')} value={d.cropVariety} onChangeText={(v) => set('cropVariety', v)} placeholder="FH-142" hint={t('Beej ka naam')} />
          <Select label={t('Season')} value={d.season} onChange={(v) => set('season', v)} options={[{ value: '', label: '—' }, ...SEASONS.filter((s) => s.value !== 'ALL_SEASON').map((s) => ({ value: s.value, label: t(s.label) }))]} />
          <NumberInput label={t('Zameen (acre)')} value={d.landAreaAcres} onChangeValue={(v) => set('landAreaAcres', v)} />
          <Input label={t('Marhala')} value={d.stage} onChangeText={(v) => set('stage', v)} hint={t('Fasal abhi kis haal me')} />
          <ChipGroup wrap value={d.stage} onChange={(v) => set('stage', v)} options={STAGES.map((s) => ({ value: t(s), label: t(s) }))} />
          <DatePicker label={t('Follow-up')} value={keyToDate(d.followUpDate)} onChange={(x) => set('followUpDate', dateToKey(x))} />
          <DatePicker label={t('Bijai')} value={keyToDate(d.sowingDate)} onChange={(x) => set('sowingDate', dateToKey(x))} />
          <DatePicker label={t('Katai (andaza)')} value={keyToDate(d.expectedHarvest)} onChange={(x) => set('expectedHarvest', dateToKey(x))} />
          <TextArea label={t('Masla')} value={d.currentIssues} onChangeText={(v) => set('currentIssues', v)} placeholder={t('Patte peele, safed makhi, sundi…')} />
          <TextArea label={t('Mashwara')} value={d.recommendations} onChangeText={(v) => set('recommendations', v)} placeholder={t('Har line par ek kaam')} />
          <FormSection title={t('Maal')}>
            <Row gap={1.5} wrap>{products.map((p) => <Badge key={p.productId} tone="success">{p.name}</Badge>)}</Row>
            <Row gap={2}><Button variant="secondary" icon={Plus} onPress={() => setPicking(true)}>{t('Cheez jorein')}</Button>{products.length > 0 && <IconButton icon={Trash2} label={t('Hatayein')} onPress={() => setProducts([])} />}</Row>
          </FormSection>
          <TextArea label={t('Note')} value={d.notes} onChangeText={(v) => set('notes', v)} hint={t('Marzi hai — sirf dukaan ke liye')} />
        </View>
      </Sheet>
      <ProductPicker open={picking} onClose={() => setPicking(false)} title={t('Maal')} variants={false} includeRaw={false} pickedIds={new Set(products.map((p) => p.productId))}
        onPick={({ product }) => { setProducts((l) => (l.some((x) => x.productId === product.id) ? l : [...l, { productId: product.id, name: product.name }])); setPicking(false); }} />
    </>
  );
}
