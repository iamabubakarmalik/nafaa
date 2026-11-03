/**
 * Today's metal rates (web MetalRatesPage). The shop types the 24K rate (per
 * tola as the market quotes it, or per gram); 22K, 21K and 18K follow from
 * their purity and can be changed. Buying rate for old gold is the selling
 * rate less a percent. Every bill and every piece price uses these rates.
 * History of past rates opens from the top bar. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Coins, History, Percent, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { GOLD_KARATS, PURITY_FACTOR, buyRateOf, derivedRate, fromPerGram, metalOf, perGramFrom, r2, TOLA, type Purity } from '@nafaa/core/industries/jewelry';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Card, ChipGroup, FormSection, FormTemplate, HeroText, IconButton, ListRow, PageHero, Row, Segmented, Sheet, SkeletonRows, StatTile, Text, toast, useTheme } from '@/design';
import { OfflineNote, useDeskOnline } from '@/industries/_shared/deskKit';
import { NumberInput } from '@/modules/inventory/components/fields';
import { metalRatesApi, type MetalRate } from '../api';
import { KEYS, dayTime, purityLabel, refreshJewelry } from '../meta';

const SILVER: Purity = 'SILVER_999';
const ALL: Purity[] = [...GOLD_KARATS, SILVER];

export function MetalRatesScreen() {
  const th = useTheme();
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { online, guard } = useDeskOnline('jewelryDesk');
  const [unit, setUnit] = useState<'tola' | 'gram'>('tola');
  const [base, setBase] = useState<number | null>(null);
  const [own, setOwn] = useState<Partial<Record<Purity, number | null>>>({});
  const [silver, setSilver] = useState<number | null>(null);
  const [cutPct, setCutPct] = useState<number | null>(2);
  const [history, setHistory] = useState(false);
  const [filter, setFilter] = useState('');
  const [filled, setFilled] = useState(false);

  const currentQ = useQuery({ queryKey: [KEYS.rates, 'current'], queryFn: metalRatesApi.current, staleTime: 60_000 });
  const historyQ = useQuery({ queryKey: [KEYS.rates, 'history', filter], queryFn: () => metalRatesApi.history({ limit: 100, ...(filter && { purity: filter, metalType: metalOf(filter) }) }), enabled: history || !filled });
  const current = useMemo(() => new Map((currentQ.data ?? []).map((r) => [r.purity as string, r])), [currentQ.data]);
  const previous = useMemo(() => {
    const m = new Map<string, MetalRate>();
    for (const r of historyQ.data ?? []) if (!r.isActive && !m.has(r.purity)) m.set(r.purity, r);
    return m;
  }, [historyQ.data]);
  const latest = (currentQ.data ?? []).reduce<string | null>((a, r) => (!a || r.effectiveDate > a ? r.effectiveDate : a), null);

  useEffect(() => {
    if (!currentQ.data || filled) return;
    setFilled(true);
    const k24 = current.get('KARAT_24');
    if (k24) setBase(fromPerGram(k24.ratePerGram, unit));
    const s = current.get(SILVER);
    if (s) setSilver(fromPerGram(s.ratePerGram, unit));
    const k22 = current.get('KARAT_22');
    if (k22?.buyRate && k22.ratePerGram) setCutPct(r2((1 - k22.buyRate / k22.ratePerGram) * 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ.data]);

  const baseGram = perGramFrom(base ?? 0, unit);
  const derived = (p: Purity) => {
    const typed = own[p];
    return typed ? perGramFrom(typed, unit) : derivedRate(p, baseGram);
  };
  const rows = [
    ...GOLD_KARATS.map((p) => ({ purity: p, gram: r2(derived(p)) })),
    ...((silver ?? 0) > 0 ? [{ purity: SILVER, gram: r2(perGramFrom(silver ?? 0, unit)) }] : []),
  ].filter((r) => r.gram > 0);
  const cut = Math.min(Math.max(cutPct ?? 0, 0), 20);

  const switchUnit = (u: 'tola' | 'gram') => {
    if (base) setBase(fromPerGram(baseGram, u));
    if (silver) setSilver(fromPerGram(perGramFrom(silver, unit), u));
    setOwn({});
    setUnit(u);
  };

  const save = useMutation({
    mutationFn: () => metalRatesApi.bulk(rows.map((r) => ({ metalType: metalOf(r.purity), purity: r.purity, ratePerGram: r.gram, buyRate: buyRateOf(r.gram, cut), source: 'Dukaan' }))),
    onSuccess: () => { refreshJewelry([KEYS.rates, 'metal-rates-current']); setOwn({}); toast.success(t('Aaj ka rate save ho gaya — POS par naya rate lagega')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Rate save nahi hua'))),
  });
  const submit = () => guard(() => {
    if (!canEdit) { toast.error(t('Rate badalne ki permission nahi')); return; }
    if (!(baseGram > 0)) { toast.error(t('24K ka rate likhein')); return; }
    save.mutate();
  });

  const stale = latest ? (Date.now() - new Date(latest).getTime()) / 86_400_000 >= 1 : true;
  const rateOf = (p: Purity) => current.get(p);

  return (
    <>
      <FormTemplate title={t('Aaj ka rate')} onSave={submit} saving={save.isPending} saveLabel={t('Rate save karein')} saveDisabled={!canEdit || !(baseGram > 0)}
        actions={<IconButton icon={History} label={t('Purane rate')} onPress={() => setHistory(true)} />}>
        <PageHero title={t('Sona · chandi')} chip={latest ? dayTime(latest) : t('Abhi koi rate nahi')} stats={[
          { label: t('24K fi tola'), value: <HeroText size="xl" weight="bold" ltr>{rateOf('KARAT_24') ? formatMoney(rateOf('KARAT_24')!.ratePerGram * TOLA) : '—'}</HeroText> },
          { label: t('22K fi tola'), value: <HeroText size="xl" weight="bold" ltr>{rateOf('KARAT_22') ? formatMoney(rateOf('KARAT_22')!.ratePerGram * TOLA) : '—'}</HeroText> },
          { label: t('Chandi fi tola'), value: <HeroText size="xl" weight="bold" ltr>{rateOf(SILVER) ? formatMoney(rateOf(SILVER)!.ratePerGram * TOLA) : '—'}</HeroText> },
        ]} />
        {stale && !!latest && <Card tone="warning"><Text size="sm">{t('Rate purana hai — aaj update karein')}</Text></Card>}
        <OfflineNote feature="jewelryDesk" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {ALL.map((p) => {
            const r = rateOf(p);
            const prev = previous.get(p);
            const diff = r && prev ? r2(r.ratePerGram - prev.ratePerGram) : 0;
            return (
              <StatTile key={p} style={{ width: '48.5%' }} icon={diff < 0 ? TrendingDown : TrendingUp} tone={p === SILVER ? 'neutral' : 'warning'} label={t('{{purity}} fi gram', { purity: purityLabel(p) })}
                loading={currentQ.isLoading} value={r ? <Amount value={r.ratePerGram} size="lg" weight="bold" /> : '—'}
                hint={!r ? t('Set nahi') : diff ? `${diff > 0 ? '+' : ''}${formatMoney(diff)}` : t('Tola {{value}}', { value: formatMoney(r.ratePerGram * TOLA) })} />
            );
          })}
        </View>

        <FormSection title={t('Aaj ka rate likhein')}>
          <Segmented value={unit} onChange={switchUnit} options={[{ value: 'tola', label: t('Fi tola') }, { value: 'gram', label: t('Fi gram') }]} />
          <NumberInput label={t('24K sona — fi {{unit}}', { unit: unit === 'tola' ? t('tola') : t('gram') })} value={base} size="lg" prefix="Rs"
            onChangeValue={(v) => { setBase(v); setOwn({}); }} placeholder={unit === 'tola' ? '355000' : '30450'}
            hint={t('Sarafa market ka rate. Neeche ke karat isi se bante hain — chahein to badal dein.')} />
          <Row gap={2} align="start">
            {GOLD_KARATS.slice(1).map((p) => (
              <View key={p} style={{ flex: 1 }}>
                <NumberInput label={purityLabel(p)} value={own[p] ?? (baseGram ? fromPerGram(derived(p), unit) : null)} prefix="Rs"
                  onChangeValue={(v) => setOwn({ ...own, [p]: v })} hint={t('{{value}}% khalis', { value: Math.round((PURITY_FACTOR[p] ?? 0) * 1000) / 10 })} />
              </View>
            ))}
          </Row>
          <NumberInput label={t('Chandi — fi {{unit}}', { unit: unit === 'tola' ? t('tola') : t('gram') })} value={silver} prefix="Rs" onChangeValue={setSilver} placeholder={t('Ikhtiyari')} />
          <NumberInput label={t('Purana sona kitna kam par khareedein')} value={cutPct} icon={Percent} onChangeValue={setCutPct}
            hint={t('Khareed rate = bechne ka rate − {{cut}}% (kaat alag se exchange par)', { cut })} />
        </FormSection>

        <FormSection title={t('Save hone wale rate')}>
          {rows.length === 0 ? <Text size="sm" tone="muted">{t('24K ka rate likhein')}</Text> : (
            <Card flush>
              {rows.map((r, i) => (
                <ListRow key={r.purity} dense divider={i < rows.length - 1} icon={Coins} iconTone={r.purity === SILVER ? 'neutral' : 'warning'} title={purityLabel(r.purity)}
                  subtitle={t('{{tola}}/tola · khareed {{buy}}/g', { tola: formatMoney(r.gram * TOLA), buy: formatMoney(buyRateOf(r.gram, cut)) })}
                  trailing={<Amount value={r.gram} weight="bold" />} />
              ))}
            </Card>
          )}
          {!canEdit && <Text size="xs" tone="muted">{t('Rate badalne ke liye "Products edit" ki permission chahiye.')}</Text>}
          {!online && <Text size="xs" tone="muted">{t('Rate sirf internet ke saath save hota hai.')}</Text>}
        </FormSection>
      </FormTemplate>

      <Sheet open={history} onClose={() => setHistory(false)} title={t('Purane rate')} description={t('Purane bill usi din ke rate par hain')} height={0.85}>
        <View style={{ gap: th.space(3) }}>
          <ChipGroup value={filter} onChange={setFilter} options={[{ value: '', label: t('Sab karat') }, ...ALL.map((p) => ({ value: p as string, label: purityLabel(p) }))]} />
          {historyQ.isLoading ? <SkeletonRows count={5} /> : !historyQ.data?.length ? <Text size="sm" tone="muted">{t('Abhi koi rate nahi')}</Text> : (
            <Card flush>
              {historyQ.data.map((r, i) => (
                <ListRow key={r.id} dense divider={i < historyQ.data!.length - 1} title={`${purityLabel(r.purity)} · ${formatMoney(r.ratePerGram)}/g`}
                  subtitle={`${dayTime(r.effectiveDate)} · ${t('tola')} ${formatMoney(r.ratePerTola ?? r.ratePerGram * TOLA)}${r.buyRate ? ` · ${t('khareed')} ${formatMoney(r.buyRate)}` : ''}`}
                  trailing={r.isActive ? <Text size="xs" tone="success" weight="semibold">{t('Aaj ka')}</Text> : undefined} />
              ))}
            </Card>
          )}
        </View>
      </Sheet>
    </>
  );
}
