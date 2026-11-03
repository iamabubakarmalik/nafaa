/**
 * Medicines through the shared products list, editor and detail (web
 * PharmacyProducts, PharmacyProductEditor, PharmacyProductDetail): brand name
 * and form, the formula (salts with strength, which gives the generic name and
 * the substitutes), strip/box packing, schedule and storage, and opening stock
 * by batch with expiry. The extra data saves after the product (online).
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowRightLeft, Beaker, CalendarX, Plus, ShieldAlert, Star, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { DOSAGE_FORMS, REGISTER_CLASSES, STRENGTHS, genericName, needsRegister } from '@nafaa/core/industries/pharmacy';
import { apiErrorMessage } from '@/core/api/errors';
import { msg, t } from '@/core/i18n';
import { Amount, Badge, Button, Card, Chip, FormSection, IconButton, Input, ListRow, Row, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput, Tiles } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { Errors } from '@/modules/inventory/screens/editor/types';
import { medicinesApi, saltsApi, substitutesApi, type MedicineFacts, type PharmacyMedicine, type Salt, type StorageCondition } from './api';
import { MEDICINE_FACTS_KEY, useMedicineFacts } from './facts';
import { SALTS_KEY, SCHEDULE_META, STORAGE_META, scheduleLabel } from './meta';

interface SaltLine { saltId: string; name: string; strength: string; isMainSalt: boolean }

export interface PharmacyExtra {
  dosageForm: string; packSize: string; manufacturer: string; registrationNumber: string; isGeneric: boolean;
  salts: SaltLine[];
  scheduleClass: string; requiresPrescription: boolean; isNarcotic: boolean;
  storageCondition: StorageCondition; requiresColdChain: boolean; minTemperature: number | null; maxTemperature: number | null;
  indication: string; storageInstructions: string;
}

const initial: PharmacyExtra = {
  dosageForm: 'Tablet', packSize: '', manufacturer: '', registrationNumber: '', isGeneric: false, salts: [],
  scheduleClass: 'OTC', requiresPrescription: false, isNarcotic: false,
  storageCondition: 'ROOM_TEMPERATURE', requiresColdChain: false, minTemperature: null, maxTemperature: null,
  indication: '', storageInstructions: '',
};

const opt = (v: string) => v.trim() || undefined;
const isRegister = (x: PharmacyExtra) => x.isNarcotic || REGISTER_CLASSES.includes(x.scheduleClass);

/* ── Basic step addition: form, maker, DRAP number ── */
function Identity({ ctx }: { ctx: StepContext<PharmacyExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  return (
    <View style={{ gap: th.space(3) }}>
      <View style={{ gap: th.space(1.5) }}>
        <Text size="sm" weight="medium">{t('Shakal (form)')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>
          {DOSAGE_FORMS.map((f) => <Chip key={f} label={f} selected={x.dosageForm === f} onPress={() => ctx.setExtra({ dosageForm: x.dosageForm === f ? '' : f })} />)}
        </View>
      </View>
      <Input label={t('Company')} value={x.manufacturer} onChangeText={(manufacturer) => ctx.setExtra({ manufacturer })} placeholder={t('GSK, Getz, Searle…')} hint={t('Card aur substitute list par dikhti hai')} />
      <Input label={t('Pack')} value={x.packSize} onChangeText={(packSize) => ctx.setExtra({ packSize })} placeholder={t('10 x 10 tablets, 60 ml')} hint={t('Dabbe par likha pack')} />
      <Input label={t('DRAP registration')} value={x.registrationNumber} onChangeText={(registrationNumber) => ctx.setExtra({ registrationNumber })} placeholder={t('Reg. No. 012345')} ltr />
      <Switch value={x.isGeneric} onChange={(isGeneric) => ctx.setExtra({ isGeneric })} label={t('Generic dawai')} description={t('Brand ke bagair, sirf formula ke naam se bikti hai')} />
    </View>
  );
}

/* ── Formula step: salts with strength ── */
function Formula({ ctx }: { ctx: StepContext<PharmacyExtra> }) {
  const th = useTheme();
  const qc = useQueryClient();
  const x = ctx.draft.extra;
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const { data: salts = [] } = useQuery({ queryKey: [SALTS_KEY, 'all'], queryFn: () => saltsApi.list(), staleTime: 5 * 60_000 });
  const taken = new Set(x.salts.map((s) => s.saltId));
  const q = query.trim().toLowerCase();
  const matches = q ? salts.filter((s) => s.isActive && !taken.has(s.id) && [s.name, s.genericName, s.code].some((v) => (v ?? '').toLowerCase().includes(q))).slice(0, 6) : [];
  const exact = salts.some((s) => s.name.toLowerCase() === q);
  const add = (s: Pick<Salt, 'id' | 'name' | 'scheduleClass' | 'isNarcotic' | 'requiresPrescription'>) => {
    // A controlled salt makes the medicine controlled; the owner can still loosen it on the next step.
    const upgrade = s.isNarcotic ? { isNarcotic: true, requiresPrescription: true, scheduleClass: s.scheduleClass }
      : s.requiresPrescription && !x.requiresPrescription ? { requiresPrescription: true } : {};
    ctx.setExtra({ salts: [...x.salts, { saltId: s.id, name: s.name, strength: '', isMainSalt: x.salts.length === 0 }], ...upgrade });
    setQuery('');
  };
  const create = async () => {
    const name = query.trim();
    if (name.length < 2) return;
    setBusy(true);
    try {
      const s = await saltsApi.create({ name });
      void qc.invalidateQueries({ queryKey: [SALTS_KEY] });
      add(s);
      toast.success(t('Salt "{{name}}" ban gaya', { name: s.name }));
    } catch (e) {
      toast.error(apiErrorMessage(e, t('Salt nahi bana')));
    } finally { setBusy(false); }
  };
  const update = (i: number, patch: Partial<SaltLine>) => ctx.setExtra({ salts: x.salts.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const remove = (i: number) => {
    const rest = x.salts.filter((_, j) => j !== i);
    ctx.setExtra({ salts: rest.some((s) => s.isMainSalt) || !rest.length ? rest : rest.map((s, j) => ({ ...s, isMainSalt: j === 0 })) });
  };
  const generic = genericName(x.salts);

  return (
    <View style={{ gap: th.space(3) }}>
      <FormSection title={t('Formula (salt)')} description={t('Dawai me kya hai aur kitna — isi se generic naam banta hai aur stock khatam ho to substitute milta hai')}>
        <Input value={query} onChangeText={setQuery} placeholder={t('Salt likhein: Paracetamol, Amoxicillin…')} returnKeyType="done"
          onSubmitEditing={() => { if (matches[0]) add(matches[0]); else if (!exact) void create(); }} />
        {q ? (
          <Card flush>
            {matches.map((s) => (
              <ListRow key={s.id} dense title={s.name} subtitle={s.genericName || undefined} onPress={() => add(s)} trailing={s.isNarcotic ? <Badge tone="danger">{t('Narcotic')}</Badge> : undefined} />
            ))}
            {!exact && <ListRow dense icon={Plus} iconTone="brand" title={t('"{{value}}" naya salt banayein', { value: query.trim() })} onPress={() => void create()} disabled={busy} />}
          </Card>
        ) : null}
        {x.salts.length === 0 ? (
          <Text size="sm" tone="muted" align="center">{t('Abhi koi salt nahi — upar likh kar jorein. Bagair salt ke bhi save ho jata hai.')}</Text>
        ) : x.salts.map((s, i) => (
          <Card key={s.saltId}>
            <Row justify="between" gap={2}>
              <Text weight="semibold" style={{ flex: 1 }}>{s.name}</Text>
              <Chip label={s.isMainSalt ? t('Asal') : t('Asal banayein')} icon={Star} selected={s.isMainSalt} onPress={() => ctx.setExtra({ salts: x.salts.map((y, j) => ({ ...y, isMainSalt: j === i })) })} />
              <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => remove(i)} />
            </Row>
            <Input value={s.strength} onChangeText={(strength) => update(i, { strength })} placeholder={t('Strength: 500mg')} ltr />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>
              {STRENGTHS.map((v) => <Chip key={v} label={v} selected={s.strength === v} onPress={() => update(i, { strength: v })} />)}
            </View>
          </Card>
        ))}
        {ctx.errors.salts ? <Text size="sm" tone="danger">{ctx.errors.salts}</Text> : null}
        {generic ? <Text size="sm" tone="secondary">{t('Generic naam:')} <Text size="sm" weight="bold">{generic}</Text></Text> : null}
      </FormSection>
      <FormSection title={t('Kis bimari me')} description={t('Marzi hai — counter par poochne walon ke kaam aata hai')}>
        <TextArea value={x.indication} onChangeText={(indication) => ctx.setExtra({ indication })} placeholder={t('Bukhar, dard…')} />
      </FormSection>
    </View>
  );
}

/* ── Schedule and storage step ── */
function Rules({ ctx }: { ctx: StepContext<PharmacyExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const cold = x.requiresColdChain || x.storageCondition === 'REFRIGERATED' || x.storageCondition === 'FROZEN';
  return (
    <View style={{ gap: th.space(3) }}>
      <FormSection title={t('Schedule')} description={t('Bagair nuskhe ke bik sakti hai ya nahi — POS par isi hisaab se poocha jata hai')}>
        <Tiles value={x.scheduleClass} columns={2} onChange={(scheduleClass) => set({ scheduleClass, ...(REGISTER_CLASSES.includes(scheduleClass) && { requiresPrescription: true }) })}
          options={Object.keys(SCHEDULE_META).map((k) => ({ value: k, label: scheduleLabel(k) }))} />
        <Text size="xs" tone="muted">{t(SCHEDULE_META[x.scheduleClass]?.hint ?? '')}</Text>
        <Switch value={x.requiresPrescription || isRegister(x)} onChange={(requiresPrescription) => set({ requiresPrescription })}
          label={t('Nuskhe par bikti hai (Rx)')} description={isRegister(x) ? t('Register wali dawai hamesha nuskhe par') : t('POS par yaad dihani aati hai')} />
        <Switch value={x.isNarcotic} onChange={(isNarcotic) => set({ isNarcotic, ...(isNarcotic && { requiresPrescription: true }) })}
          label={t('Narcotic register me likhein')} description={t('Har sale par doctor aur mareez ka naam poocha jayega')} />
      </FormSection>
      <FormSection title={t('Kahan rakhein')} description={t('Fridge wali dawai ka temperature Cold Chain log me roz likhein')}>
        <Tiles value={x.storageCondition} columns={2} onChange={(storageCondition) => set({ storageCondition, ...((storageCondition === 'REFRIGERATED' || storageCondition === 'FROZEN') && { requiresColdChain: true }) })}
          options={(Object.entries(STORAGE_META) as Array<[StorageCondition, string]>).map(([value, label]) => ({ value, label: t(label) }))} />
        <Switch value={x.requiresColdChain} onChange={(requiresColdChain) => set({ requiresColdChain })} label={t('Thandi rakhni hai (cold chain)')} description={t('Card par Fridge ka nishan lagta hai')} />
        {cold && (
          <Row gap={2}>
            <View style={{ flex: 1 }}><NumberInput label={t('Kam se kam °C')} value={x.minTemperature} onChangeValue={(minTemperature) => set({ minTemperature })} error={ctx.errors.temperature} /></View>
            <View style={{ flex: 1 }}><NumberInput label={t('Zyada se zyada °C')} value={x.maxTemperature} onChangeValue={(maxTemperature) => set({ maxTemperature })} /></View>
          </Row>
        )}
        <Input label={t('Rakhne ki hidayat')} value={x.storageInstructions} onChangeText={(storageInstructions) => set({ storageInstructions })} placeholder={t('Dhoop se door, bachon ki pohanch se door')} />
      </FormSection>
    </View>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'tablet', label: msg('Tablet') }, { value: 'capsule', label: msg('Capsule') }, { value: 'strip', label: msg('Strip') },
    { value: 'bottle', label: msg('Bottle') }, { value: 'tube', label: msg('Tube') }, { value: 'vial', label: msg('Vial') },
    { value: 'ampoule', label: msg('Ampoule') }, { value: 'sachet', label: msg('Sachet') }, { value: 'box', label: msg('Box') },
    { value: 'pcs', label: msg('Adad (pcs)') }, { value: 'ml', label: 'ml' }, { value: 'gram', label: msg('Gram') },
  ],
  skuPrefix: 'MED',
  packs: true,
  variants: false,
  batches: true,
  markups: [10, 15, 17, 20, 25],
};

const formulaStep: StepDef<PharmacyExtra> = {
  id: 'formula', title: msg('Formula'), icon: Beaker, render: (ctx) => <Formula ctx={ctx} />,
  validate: (d): Errors => (d.extra.salts.some((s) => !s.strength.trim()) ? { salts: t('Har salt ki strength likhein (jaise 500mg)') } : {}),
};
const rulesStep: StepDef<PharmacyExtra> = {
  id: 'rules', title: msg('Schedule'), icon: ShieldAlert, render: (ctx) => <Rules ctx={ctx} />,
  validate: (d): Errors => (d.extra.minTemperature != null && d.extra.maxTemperature != null && d.extra.minTemperature > d.extra.maxTemperature
    ? { temperature: t('Kam se kam wala zyada wale se bara hai') } : {}),
};

const editor: EditorConfig<PharmacyExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const m = await medicinesApi.byProduct(productId).catch(() => null);
      if (!m) return {};
      const ps = m.product?.productSalts ?? [];
      return {
        dosageForm: m.dosageForm ?? '', packSize: m.packSize ?? '', manufacturer: m.manufacturer ?? '', registrationNumber: m.registrationNumber ?? '',
        isGeneric: m.isGeneric, scheduleClass: m.scheduleClass, requiresPrescription: m.requiresPrescription, isNarcotic: m.isNarcotic,
        storageCondition: m.storageCondition, requiresColdChain: m.requiresColdChain, minTemperature: m.minTemperature ?? null, maxTemperature: m.maxTemperature ?? null,
        indication: m.indication ?? '', storageInstructions: m.storageInstructions ?? '',
        salts: ps.map((s) => ({ saltId: s.saltId, name: s.salt?.name ?? '', strength: s.strength ?? '', isMainSalt: s.isMainSalt })),
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await medicinesApi.upsert({
        productId, dosageForm: opt(x.dosageForm), packSize: opt(x.packSize), manufacturer: opt(x.manufacturer), registrationNumber: opt(x.registrationNumber),
        isGeneric: x.isGeneric, scheduleClass: x.scheduleClass, requiresPrescription: x.requiresPrescription || isRegister(x), isNarcotic: x.isNarcotic,
        storageCondition: x.storageCondition, requiresColdChain: x.requiresColdChain,
        isRefrigerated: x.storageCondition === 'REFRIGERATED' || x.storageCondition === 'FROZEN',
        minTemperature: x.minTemperature ?? undefined, maxTemperature: x.maxTemperature ?? undefined,
        indication: opt(x.indication), storageInstructions: opt(x.storageInstructions),
      });
      await saltsApi.assign(productId, x.salts.map((s) => ({ saltId: s.saltId, strength: s.strength.trim(), isMainSalt: s.isMainSalt })));
      void qcInvalidate();
    },
  },
  steps: [
    basicStep<PharmacyExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: msg('Jaise: Panadol 500mg Tablet') }),
    formulaStep,
    priceStep<PharmacyExtra>(core),
    rulesStep,
    stockStep<PharmacyExtra>(core, { quick: [10, 30, 100, 300, 1000] }),
  ],
  summary: (d) => {
    const x = d.extra;
    const rows: Array<[string, string]> = [];
    const generic = genericName(x.salts);
    if (generic) rows.push([t('Formula'), generic]);
    const line = [x.dosageForm, x.manufacturer, SCHEDULE_META[x.scheduleClass] ? scheduleLabel(x.scheduleClass) : ''].filter(Boolean).join(' · ');
    if (line) rows.push([t('Dawai'), line]);
    if (isRegister(x)) rows.push([t('Register'), t('Register wali dawai')]);
    if (x.requiresColdChain) rows.push([t('Fridge'), t('Fridge me rakhein')]);
    return rows;
  },
};

async function qcInvalidate() {
  const { queryClient } = await import('@/core/query/client');
  void queryClient.invalidateQueries({ queryKey: [MEDICINE_FACTS_KEY] });
  void queryClient.invalidateQueries({ queryKey: [SALTS_KEY] });
  void queryClient.invalidateQueries({ queryKey: ['pharmacy-product-detail'] });
}

/* ── Detail ── */

const genericOf = (m: PharmacyMedicine | null | undefined) => genericName(
  [...(m?.product?.productSalts ?? [])].sort((a, b) => Number(b.isMainSalt) - Number(a.isMainSalt)).map((s) => ({ name: s.salt?.name ?? '', strength: s.strength ?? undefined })),
);
const inRegister = (m?: PharmacyMedicine | null) => !!m && needsRegister(m);

function Substitutes({ productId }: { productId: string }) {
  const th = useTheme();
  const q = useQuery({ queryKey: ['pharmacy-substitutes', productId], queryFn: () => substitutesApi.autoSuggest(productId).catch(() => []), staleTime: 60_000 });
  const data = q.data ?? [];
  return (
    <Card flush title={t('Substitute (same formula)')} description={t('Stock khatam ho to grahak ko ye de sakte hain — pehle bilkul same formula, phir shelf wali')}>
      {q.isLoading ? <Text tone="muted" style={{ padding: th.space(4) }}>{t('Dhoond rahe hain…')}</Text>
        : data.length === 0 ? <Text tone="muted" style={{ padding: th.space(4) }}>{t('Is formula ki koi aur dawai nahi — formula (salt) likha ho to yahan dikhegi')}</Text>
          : data.slice(0, 20).map((s, i, a) => (
            <ListRow key={s.product.id} divider={i < a.length - 1} icon={ArrowRightLeft} title={s.product.name}
              subtitle={`${s.matchedSalts.map((m) => [m.salt.name, m.strength].filter(Boolean).join(' ')).join(' + ')}${s.exact ? ` · ${t('bilkul same')}` : ''}`}
              trailing={<View style={{ alignItems: 'flex-end' }}>
                <Amount value={s.product.price} weight="bold" />
                <Text size="2xs" tone={s.stock > 0 ? 'success' : 'danger'} ltr>{s.stock > 0 ? t('{{value}} stock', { value: Number(s.stock.toFixed(2)) }) : t('Stock nahi')}</Text>
              </View>}
              onPress={() => router.push(`/products/${s.product.id}` as never)} />
          ))}
    </Card>
  );
}

registerInventoryIndustry({
  id: 'pharmacy',
  label: msg('Pharmacy'),
  list: {
    noun: 'dawai',
    filters: ['tags'],
    useSource: () => useMedicineFacts(),
    extras: (item, ctx) => {
      const m = (ctx.source as Map<string, MedicineFacts> | undefined)?.get(item.id);
      if (!m) return {};
      return {
        line: [m.generic, m.dosageForm, m.packSize].filter(Boolean).join(' · ') || undefined,
        badges: [
          ...(needsRegister(m) ? [{ label: t('Register'), tone: 'danger' as const }] : m.requiresPrescription ? [{ label: t('Rx'), tone: 'warning' as const }] : []),
          ...(m.requiresColdChain || m.isRefrigerated ? [{ label: t('Fridge'), tone: 'info' as const }] : []),
        ],
        chips: m.manufacturer ? [m.manufacturer] : undefined,
      };
    },
    actions: [
      { icon: CalendarX, label: msg('Expiry'), href: '/pharmacy/expiring' },
      { icon: Beaker, label: msg('Salts'), href: '/pharmacy/salts' },
    ],
    stockChips: () => [1, 10, 30, 100],
    Banners: ({ data }) => (data.stats.expiring > 0 ? (
      <Card tone="warning">
        <Row gap={2}>
          <CalendarX size={18} color="#b45309" />
          <Text size="sm" weight="semibold" style={{ flex: 1 }}>{t('{{expiring}} dawaiyon ka batch {{expiryDays}} din me expire hoga', { expiring: data.stats.expiring, expiryDays: data.stats.expiryDays })}</Text>
          <Button size="sm" variant="link" onPress={() => router.push('/pharmacy/expiring' as never)}>{t('Expiry list')}</Button>
        </Row>
      </Card>
    ) : null),
    guide: [
      { icon: Beaker, title: msg('Formula (salt)'), text: msg('Har dawai ka salt aur strength likhein — card par generic naam dikhta hai aur POS par salt se dhoond kar substitute milta hai.') },
      { icon: ShieldAlert, title: msg('Register wali dawai'), text: msg('Narcotic aur controlled dawai par laal "Register" lagta hai. POS par in ke liye doctor aur mareez ka naam poocha jata hai.') },
      { icon: CalendarX, title: msg('Batch aur expiry'), text: msg('Purchase me har batch ka number aur expiry likhein. POS pehle jaldi expire hone wala batch bechta hai.') },
    ],
  },
  editor,
  detail: {
    extra: { key: 'pharmacy-product-detail', load: (id) => medicinesApi.byProduct(id).catch(() => null) },
    badges: ({ extra }) => {
      const m = extra as PharmacyMedicine | null | undefined;
      if (!m) return [];
      return [
        ...(SCHEDULE_META[m.scheduleClass] ? [{ label: scheduleLabel(m.scheduleClass), tone: SCHEDULE_META[m.scheduleClass].tone }] : []),
        ...(inRegister(m) ? [{ label: t('Register'), tone: 'danger' as const }] : []),
        ...(m.requiresColdChain || m.isRefrigerated ? [{ label: t('Fridge'), tone: 'info' as const }] : []),
      ];
    },
    facts: ({ extra }) => {
      const m = extra as PharmacyMedicine | null | undefined;
      if (!m) return [];
      const rows: Array<[string, string | undefined]> = [
        [t('Formula'), genericOf(m) || undefined], [t('Shakal'), m.dosageForm], [t('Pack'), m.packSize], [t('Company'), m.manufacturer],
        [t('DRAP registration'), m.registrationNumber], [t('Rakhna'), t(STORAGE_META[m.storageCondition])],
        [t('Temperature'), m.minTemperature != null || m.maxTemperature != null ? t('{{value}}°C se {{value2}}°C', { value: m.minTemperature ?? '—', value2: m.maxTemperature ?? '—' }) : undefined],
        [t('Nuskha'), m.requiresPrescription ? t('Zaroori') : t('Nahi')],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    alerts: ({ extra, product }) => {
      const m = extra as PharmacyMedicine | null | undefined;
      if (!inRegister(m)) return null;
      return (
        <Card tone="danger">
          <Row gap={2}>
            <ShieldAlert size={18} color="#be123c" />
            <Text size="sm" weight="medium" style={{ flex: 1 }}>{t('Register wali dawai — har sale par doctor aur mareez ka naam likha jata hai')}</Text>
            <Button size="sm" variant="link" onPress={() => router.push(`/pharmacy/controlled-log?product=${product.id}` as never)}>{t('Register')}</Button>
          </Row>
        </Card>
      );
    },
    tabs: [
      {
        id: 'formula', label: msg('Formula'), icon: Beaker, when: ({ extra }) => !!extra,
        render: ({ extra, product }) => {
          const m = extra as PharmacyMedicine;
          return (
            <View style={{ gap: 12 }}>
              <Card flush title={t('Formula aur istemal')}>
                <ListRow dense title={t('Generic')} trailing={<Text weight="medium">{genericOf(m) || t('Likha nahi')}</Text>} />
                <ListRow dense title={t('Kis bimari me')} trailing={<Text>{m.indication || '—'}</Text>} />
                <ListRow dense title={t('Rakhne ki hidayat')} trailing={<Text>{m.storageInstructions || '—'}</Text>} />
              </Card>
              <Substitutes productId={product.id} />
            </View>
          );
        },
      },
    ],
    stockChips: [1, 10, 30, 100],
  },
});
