'use client';

/**
 * Zakat on business wealth island. Zakatable assets (cash, bank, stock for
 * sale, udhaar likely to be recovered, gold and silver) minus debts due now,
 * compared with the nisab. The nisab metal is the visitor's choice (silver
 * or gold, see facts.ts for the weights and sources) and the rate per tola
 * is always typed by the visitor: the site never shows a metal rate.
 */
import { useMemo, useState } from 'react';
import { ZAKAT } from './facts';
import { parseAmount, percent, plain, round2, rupees } from './format';
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, SourceNote, ToolFrame, useToolUsed } from './kit';

type Metal = 'silver' | 'gold';

const n = (raw: string) => Math.max(parseAmount(raw) ?? 0, 0);

export function zakatDue(assets: number, debts: number, nisab: number): { net: number; due: number; above: boolean } {
  const net = Math.max(assets - debts, 0);
  const above = nisab > 0 && net >= nisab;
  return { net: round2(net), due: above ? round2((net * ZAKAT.ratePercent) / 100) : 0, above };
}

export default function ZakatCalculator() {
  const used = useToolUsed('zakat-calculator');
  const [cash, setCash] = useState('');
  const [bank, setBank] = useState('');
  const [stock, setStock] = useState('');
  const [receivable, setReceivable] = useState('');
  const [gold, setGold] = useState('');
  const [otherAssets, setOtherAssets] = useState('');
  const [payable, setPayable] = useState('');
  const [debts, setDebts] = useState('');
  const [metal, setMetal] = useState<Metal>('silver');
  const [rate, setRate] = useState('');

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };

  const assets = n(cash) + n(bank) + n(stock) + n(receivable) + n(gold) + n(otherAssets);
  const liabilities = n(payable) + n(debts);
  const nisabTola = ZAKAT.nisabTola[metal];
  const nisab = n(rate) * nisabTola;
  const r = useMemo(() => zakatDue(assets, liabilities, nisab), [assets, liabilities, nisab]);

  return (
    <ToolFrame label="Zakat calculator">
      <InputsPanel className="space-y-6">
        <div>
          <h3 className="text-h4 text-fg-strong">What the business owns</h3>
          <p className="mt-1 text-small text-fg-subtle">Values on your zakat date.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Cash in galla and in hand" prefix="Rs" value={cash} onChange={touch(setCash)} placeholder="0" />
            <Field label="Bank, JazzCash, Easypaisa" prefix="Rs" value={bank} onChange={touch(setBank)} placeholder="0" />
            <Field label="Stock for sale" prefix="Rs" value={stock} onChange={touch(setStock)} placeholder="0" hint="Many scholars value it at today's sale value. Ask yours." />
            <Field label="Udhaar you expect to recover" prefix="Rs" value={receivable} onChange={touch(setReceivable)} placeholder="0" />
            <Field label="Gold and silver (value)" prefix="Rs" value={gold} onChange={touch(setGold)} placeholder="0" />
            <Field label="Other zakatable assets" prefix="Rs" value={otherAssets} onChange={touch(setOtherAssets)} placeholder="0" hint="Shop fittings, machines and the building are usually not included." />
          </div>
        </div>
        <div>
          <h3 className="text-h4 text-fg-strong">What it owes now</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Supplier bills due" prefix="Rs" value={payable} onChange={touch(setPayable)} placeholder="0" />
            <Field label="Other debts due now" prefix="Rs" value={debts} onChange={touch(setDebts)} placeholder="0" hint="Rent, salaries or loan instalments already due." />
          </div>
        </div>
        <div className="space-y-4">
          <Segmented
            legend="Nisab measured in"
            value={metal}
            onChange={touch(setMetal)}
            options={[
              { value: 'silver', label: `Silver (${plain(ZAKAT.nisabTola.silver)} tola)` },
              { value: 'gold', label: `Gold (${plain(ZAKAT.nisabTola.gold)} tola)` },
            ]}
          />
          <Field
            label={`Today's ${metal} rate per tola`}
            prefix="Rs"
            value={rate}
            onChange={touch(setRate)}
            placeholder="Type the market rate"
            hint="Use your local sarafa market rate for the day."
            className="sm:max-w-[50%]"
          />
        </div>
      </InputsPanel>

      <ResultPanel>
        <BigResult
          label="Zakat due"
          value={rupees(r.due)}
          note={
            nisab <= 0
              ? `Enter the ${metal} rate to check the nisab`
              : r.above
                ? `${percent(ZAKAT.ratePercent, 1)} of ${rupees(r.net)}`
                : 'Net wealth is below the nisab'
          }
        />
        <Breakdown
          className="mt-6"
          rows={[
            { label: 'Zakatable assets', value: rupees(round2(assets)) },
            { label: 'Debts due now', value: `-${rupees(round2(liabilities))}` },
            { label: 'Net zakatable wealth', value: rupees(r.net), strong: true },
            { label: `Nisab (${plain(nisabTola)} tola ${metal})`, value: nisab > 0 ? rupees(round2(nisab)) : '—' },
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">
          Zakat = {percent(ZAKAT.ratePercent, 1)} of net zakatable wealth held for a lunar year, when it is at or above the nisab. Scholars differ on details such as
          the nisab metal and how to value stock, so confirm with your own scholar.
        </p>
        <SourceNote source={ZAKAT.source} />
      </ResultPanel>
    </ToolFrame>
  );
}
