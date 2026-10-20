'use client';

/**
 * Gold price calculator island. The visitor types today's rate (the site
 * never shows a live or assumed rate), the karat and the weight in tola,
 * masha and ratti or in grams, then wastage, making charges and tax. The
 * bill is built the way jewellers price it: gold value + wastage + making,
 * then tax where it applies.
 */
import { useMemo, useState } from 'react';
import { GOLD } from './facts';
import { parseAmount, percent, plain, round2, rupees } from './format';
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, ToolFrame, useToolUsed } from './kit';

type RateUnit = 'tola' | '10g';
type RateBasis = '24' | 'selected';
type WeightUnit = 'tola' | 'gram';
type MakingMode = 'percent' | 'perTola' | 'perGram' | 'fixed';

const n = (raw: string) => Math.max(parseAmount(raw) ?? 0, 0);

export function tolaFrom(tola: number, masha: number, ratti: number): number {
  return tola + masha / GOLD.mashaPerTola + ratti / (GOLD.mashaPerTola * GOLD.rattiPerMasha);
}

export default function GoldRateCalculator() {
  const used = useToolUsed('gold-rate-calculator');
  const [rate, setRate] = useState('');
  const [rateUnit, setRateUnit] = useState<RateUnit>('tola');
  const [basis, setBasis] = useState<RateBasis>('24');
  const [karat, setKarat] = useState<string>('22');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('tola');
  const [tola, setTola] = useState('');
  const [masha, setMasha] = useState('');
  const [ratti, setRatti] = useState('');
  const [grams, setGrams] = useState('');
  const [wastage, setWastage] = useState('');
  const [makingMode, setMakingMode] = useState<MakingMode>('percent');
  const [making, setMaking] = useState('');
  const [tax, setTax] = useState('');

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };

  const r = useMemo(() => {
    const k = Number(karat);
    const quoted = n(rate);
    const perTolaQuoted = rateUnit === 'tola' ? quoted : (quoted / 10) * GOLD.gramsPerTola;
    const perTola = basis === '24' ? (perTolaQuoted * k) / 24 : perTolaQuoted;
    const weightTola = weightUnit === 'tola' ? tolaFrom(n(tola), n(masha), n(ratti)) : n(grams) / GOLD.gramsPerTola;
    const weightGrams = weightTola * GOLD.gramsPerTola;
    const goldValue = weightTola * perTola;
    const wastageValue = (goldValue * n(wastage)) / 100;
    const m = n(making);
    const makingValue =
      makingMode === 'percent' ? (goldValue * m) / 100 : makingMode === 'perTola' ? m * weightTola : makingMode === 'perGram' ? m * weightGrams : m;
    const beforeTax = goldValue + wastageValue + makingValue;
    const taxValue = (beforeTax * n(tax)) / 100;
    return {
      perTola: round2(perTola),
      perGram: round2(perTola / GOLD.gramsPerTola),
      weightTola,
      weightGrams,
      goldValue: round2(goldValue),
      wastageValue: round2(wastageValue),
      makingValue: round2(makingValue),
      taxValue: round2(taxValue),
      total: round2(beforeTax + taxValue),
      ready: quoted > 0 && weightTola > 0,
    };
  }, [rate, rateUnit, basis, karat, weightUnit, tola, masha, ratti, grams, wastage, makingMode, making, tax]);

  return (
    <ToolFrame label="Gold price calculator">
      <InputsPanel className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Field label="Today's gold rate" prefix="Rs" value={rate} onChange={touch(setRate)} placeholder="Type the rate" hint="Use the day's rate from your local sarafa market." />
          <Segmented
            legend="Rate is per"
            value={rateUnit}
            onChange={touch(setRateUnit)}
            options={[
              { value: 'tola', label: 'Tola' },
              { value: '10g', label: '10 grams' },
            ]}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Segmented
            legend="Karat of the piece"
            value={karat}
            onChange={touch(setKarat)}
            options={GOLD.karats.map((k) => ({ value: String(k), label: `${k}K` }))}
          />
          <Segmented
            legend="The rate you typed is for"
            value={basis}
            onChange={touch(setBasis)}
            options={[
              { value: '24', label: '24K' },
              { value: 'selected', label: `${karat}K` },
            ]}
          />
        </div>

        <div className="space-y-3">
          <Segmented
            legend="Weight"
            value={weightUnit}
            onChange={touch(setWeightUnit)}
            options={[
              { value: 'tola', label: 'Tola · masha · ratti' },
              { value: 'gram', label: 'Grams' },
            ]}
          />
          {weightUnit === 'tola' ? (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tola" value={tola} onChange={touch(setTola)} placeholder="0" />
              <Field label="Masha" value={masha} onChange={touch(setMasha)} placeholder="0" />
              <Field label="Ratti" value={ratti} onChange={touch(setRatti)} placeholder="0" />
            </div>
          ) : (
            <Field label="Grams" hideLabel suffix="g" value={grams} onChange={touch(setGrams)} placeholder="0" />
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Wastage (kaat)" suffix="%" value={wastage} onChange={touch(setWastage)} placeholder="0" hint="Share of the gold value added for gold lost in making." />
          <Field label="Tax" suffix="%" value={tax} onChange={touch(setTax)} placeholder="0" hint="Leave 0 if no tax applies to this sale." />
        </div>
        <div className="space-y-3">
          <Segmented
            legend="Making charges (mazdoori)"
            value={makingMode}
            onChange={touch(setMakingMode)}
            options={[
              { value: 'percent', label: '% of gold' },
              { value: 'perTola', label: 'Per tola' },
              { value: 'perGram', label: 'Per gram' },
              { value: 'fixed', label: 'Fixed' },
            ]}
          />
          <Field
            label="Making charges"
            hideLabel
            prefix={makingMode === 'percent' ? undefined : 'Rs'}
            suffix={makingMode === 'percent' ? '%' : undefined}
            value={making}
            onChange={touch(setMaking)}
            placeholder="0"
          />
        </div>
      </InputsPanel>

      <ResultPanel>
        <BigResult
          label="Total price"
          value={r.ready ? rupees(r.total) : 'Rs 0'}
          note={r.ready ? `${plain(round2(r.weightGrams))} g of ${karat}K at ${rupees(r.perTola)} per tola` : 'Enter the rate and the weight'}
        />
        <Breakdown
          className="mt-6"
          rows={[
            { label: `${karat}K rate per tola`, value: r.ready ? rupees(r.perTola) : '—' },
            { label: `${karat}K rate per gram`, value: r.ready ? rupees(r.perGram) : '—' },
            { label: 'Gold value', value: r.ready ? rupees(r.goldValue) : '—' },
            { label: `Wastage${n(wastage) ? ` (${percent(n(wastage))})` : ''}`, value: r.ready ? rupees(r.wastageValue) : '—' },
            { label: 'Making charges', value: r.ready ? rupees(r.makingValue) : '—' },
            { label: `Tax${n(tax) ? ` (${percent(n(tax))})` : ''}`, value: r.ready ? rupees(r.taxValue) : '—' },
            { label: 'Total', value: r.ready ? rupees(r.total) : '—', strong: true },
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">
          1 tola = {plain(GOLD.gramsPerTola)} g = {GOLD.mashaPerTola} masha; 1 masha = {GOLD.rattiPerMasha} ratti. A {karat}K piece is {karat}/24 gold
          {karat === '24' ? '.' : `, so its rate is ${karat}/24 of the 24K rate.`}
        </p>
      </ResultPanel>
    </ToolFrame>
  );
}
