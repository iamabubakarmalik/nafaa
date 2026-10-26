'use client';

/**
 * Zakat on business wealth island. Zakatable assets (cash, bank, stock for
 * sale, udhaar likely to be recovered, gold and silver) minus debts due now,
 * compared with the nisab. The nisab metal is the visitor's choice (silver
 * or gold, see facts.ts for the weights and sources) and the rate per tola
 * is always typed by the visitor: the site never shows a metal rate.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { ZAKAT } from './facts';
import { parseAmount, percent, plain, round2, rupees } from './format';
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, SourceNote, ToolFrame, pick, useToolUsed } from './kit';

type Metal = 'silver' | 'gold';

const n = (raw: string) => Math.max(parseAmount(raw) ?? 0, 0);

export function zakatDue(assets: number, debts: number, nisab: number): { net: number; due: number; above: boolean } {
  const net = Math.max(assets - debts, 0);
  const above = nisab > 0 && net >= nisab;
  return { net: round2(net), due: above ? round2((net * ZAKAT.ratePercent) / 100) : 0, above };
}

const en = {
  frame: 'Zakat calculator',
  owns: 'What the business owns',
  ownsSub: 'Values on your zakat date.',
  cash: 'Cash in galla and in hand',
  bank: 'Bank, JazzCash, Easypaisa',
  stock: 'Stock for sale',
  stockHint: "Many scholars value it at today's sale value. Ask yours.",
  receivable: 'Udhaar you expect to recover',
  gold: 'Gold and silver (value)',
  other: 'Other zakatable assets',
  otherHint: 'Shop fittings, machines and the building are usually not included.',
  owes: 'What it owes now',
  payable: 'Supplier bills due',
  debts: 'Other debts due now',
  debtsHint: 'Rent, salaries or loan instalments already due.',
  nisabLegend: 'Nisab measured in',
  silverOpt: (tola: string) => `Silver (${tola} tola)`,
  goldOpt: (tola: string) => `Gold (${tola} tola)`,
  rateLabel: (metal: Metal) => `Today's ${metal} rate per tola`,
  ratePlaceholder: 'Type the market rate',
  rateHint: 'Use your local sarafa market rate for the day.',
  big: 'Zakat due',
  enterRate: (metal: Metal) => `Enter the ${metal} rate to check the nisab`,
  ofNet: (p: string, r: string) => `${p} of ${r}`,
  below: 'Net wealth is below the nisab',
  rowAssets: 'Zakatable assets',
  rowDebts: 'Debts due now',
  rowNet: 'Net zakatable wealth',
  rowNisab: (tola: string, metal: Metal) => `Nisab (${tola} tola ${metal})`,
  footnote: (p: string): ReactNode => (
    <>
      Zakat = {p} of net zakatable wealth held for a lunar year, when it is at or above the nisab. Scholars differ on details such as the nisab metal and how to
      value stock, so confirm with your own scholar.
    </>
  ),
};

const METAL_UR: Record<Metal, { name: string; of: string }> = {
  silver: { name: 'چاندی', of: 'چاندی' },
  gold: { name: 'سونا', of: 'سونے' },
};

const STRINGS: { en: typeof en; ur: typeof en } = {
  en,
  ur: {
    frame: 'زکوٰۃ کیلکولیٹر',
    owns: 'کاروبار کے پاس کیا ہے',
    ownsSub: 'اپنی زکوٰۃ کی تاریخ والے دن کی مالیت لکھیں۔',
    cash: 'گلے میں اور ہاتھ میں کیش',
    bank: 'بینک، JazzCash، Easypaisa',
    stock: 'بیچنے والا اسٹاک',
    stockHint: 'بہت سے علما اسے آج کی سیل کی قیمت پر گنتے ہیں۔ اپنے عالم سے پوچھیں۔',
    receivable: 'وہ ادھار جو واپس ملنے کی امید ہے',
    gold: 'سونا اور چاندی (مالیت)',
    other: 'باقی زکوٰۃ والے اثاثے',
    otherHint: 'دکان کا فرنیچر، مشینیں اور عمارت عام طور پر شامل نہیں ہوتیں۔',
    owes: 'ابھی کیا دینا ہے',
    payable: 'سپلائر کے واجب بل',
    debts: 'باقی قرض جو ابھی دینا ہے',
    debtsHint: 'کرایہ، تنخواہیں یا قرض کی قسطیں جو دینی بنتی ہیں۔',
    nisabLegend: 'نصاب کس سے ناپیں',
    silverOpt: (tola) => `چاندی (${tola} تولہ)`,
    goldOpt: (tola) => `سونا (${tola} تولہ)`,
    rateLabel: (metal) => `آج ${METAL_UR[metal].of} کا فی تولہ ریٹ`,
    ratePlaceholder: 'بازار کا ریٹ لکھیں',
    rateHint: 'اپنے مقامی صرافہ بازار کا آج کا ریٹ لیں۔',
    big: 'زکوٰۃ واجب',
    enterRate: (metal) => `نصاب چیک کرنے کے لیے ${METAL_UR[metal].of} کا ریٹ لکھیں`,
    ofNet: (p, r) => `${r} کا ${p}`,
    below: 'خالص مال نصاب سے کم ہے',
    rowAssets: 'زکوٰۃ والے اثاثے',
    rowDebts: 'ابھی واجب قرض',
    rowNet: 'زکوٰۃ والا خالص مال',
    rowNisab: (tola, metal) => `نصاب (${tola} تولہ ${METAL_UR[metal].name})`,
    footnote: (p) => (
      <>
        زکوٰۃ = خالص زکوٰۃ والے مال کا {p}، جب یہ مال ایک قمری سال آپ کے پاس رہے اور نصاب کے برابر یا اس سے زیادہ ہو۔ نصاب کس دھات سے ناپیں اور اسٹاک کی قیمت کیسے
        لگائیں، اس پر علما کی رائے الگ الگ ہے، اس لیے اپنے عالم سے پوچھ لیں۔
      </>
    ),
  },
};

export default function ZakatCalculator({ locale }: { locale?: string }) {
  const t = pick(STRINGS, locale);
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
    <ToolFrame label={t.frame}>
      <InputsPanel className="space-y-6">
        <div>
          <h3 className="text-h4 text-fg-strong">{t.owns}</h3>
          <p className="mt-1 text-small text-fg-subtle">{t.ownsSub}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label={t.cash} prefix="Rs" value={cash} onChange={touch(setCash)} placeholder="0" />
            <Field label={t.bank} prefix="Rs" value={bank} onChange={touch(setBank)} placeholder="0" />
            <Field label={t.stock} prefix="Rs" value={stock} onChange={touch(setStock)} placeholder="0" hint={t.stockHint} />
            <Field label={t.receivable} prefix="Rs" value={receivable} onChange={touch(setReceivable)} placeholder="0" />
            <Field label={t.gold} prefix="Rs" value={gold} onChange={touch(setGold)} placeholder="0" />
            <Field label={t.other} prefix="Rs" value={otherAssets} onChange={touch(setOtherAssets)} placeholder="0" hint={t.otherHint} />
          </div>
        </div>
        <div>
          <h3 className="text-h4 text-fg-strong">{t.owes}</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label={t.payable} prefix="Rs" value={payable} onChange={touch(setPayable)} placeholder="0" />
            <Field label={t.debts} prefix="Rs" value={debts} onChange={touch(setDebts)} placeholder="0" hint={t.debtsHint} />
          </div>
        </div>
        <div className="space-y-4">
          <Segmented
            legend={t.nisabLegend}
            value={metal}
            onChange={touch(setMetal)}
            options={[
              { value: 'silver', label: t.silverOpt(plain(ZAKAT.nisabTola.silver)) },
              { value: 'gold', label: t.goldOpt(plain(ZAKAT.nisabTola.gold)) },
            ]}
          />
          <Field
            label={t.rateLabel(metal)}
            prefix="Rs"
            value={rate}
            onChange={touch(setRate)}
            placeholder={t.ratePlaceholder}
            hint={t.rateHint}
            className="sm:max-w-[50%]"
          />
        </div>
      </InputsPanel>

      <ResultPanel>
        <BigResult
          label={t.big}
          value={rupees(r.due)}
          note={
            nisab <= 0
              ? t.enterRate(metal)
              : r.above
                ? t.ofNet(percent(ZAKAT.ratePercent, 1), rupees(r.net))
                : t.below
          }
        />
        <Breakdown
          className="mt-6"
          rows={[
            { label: t.rowAssets, value: rupees(round2(assets)) },
            { label: t.rowDebts, value: `-${rupees(round2(liabilities))}` },
            { label: t.rowNet, value: rupees(r.net), strong: true },
            { label: t.rowNisab(plain(nisabTola), metal), value: nisab > 0 ? rupees(round2(nisab)) : '—' },
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">{t.footnote(percent(ZAKAT.ratePercent, 1))}</p>
        <SourceNote source={ZAKAT.source} locale={locale} />
      </ResultPanel>
    </ToolFrame>
  );
}
