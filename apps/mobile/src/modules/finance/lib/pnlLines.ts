/**
 * The lines of the statement, in order, with how to read each one. The
 * screen, the monthly and branch columns and the PDF all walk this one list,
 * so they always agree. Same lines and wording as the web statement.
 */

import type { ExpenseCategoryRef, PnlStatement } from '@nafaa/core/finance';
import { hasTranslation, msg, t } from '@/core/i18n';
import type { PnlDetailKind } from '../api/pnl';

/** Names the server fills in itself ("Bina category") are translated here; shop-made names stay as typed. */
export const serverName = (name: string) => (hasTranslation(name) ? t(name) : name);

export type LineKind = 'head' | 'item' | 'sub' | 'total' | 'grand' | 'ratio';

export interface PnlLine {
  id: string;
  label: string;
  hint?: string;
  kind: LineKind;
  value: (s: PnlStatement) => number | null;
  minus?: boolean;
  cost?: boolean;
  upIsGood?: boolean;
  drill?: { kind: PnlDetailKind; categoryId?: string };
  to?: string;
  optional?: boolean;
}

export interface PnlConfig { cogs: string; cogsHint: string }

const BASE: PnlConfig = { cogs: msg('Maal ki cost (COGS)'), cogsHint: msg('Jo maal bika, wo kitne ka khareeda tha') };
const BY_INDUSTRY: Record<string, Partial<PnlConfig>> = {
  pharmacy: { cogs: msg('Dawaiyon ki cost') },
  restaurant: { cogs: msg('Khane ki cost (food cost)'), cogsHint: msg('Recipe ke hisaab se saaman ki cost') },
  bakery: { cogs: msg('Maal aur saaman ki cost'), cogsHint: msg('Recipe ya product par likhi cost') },
  mobile: { cogs: msg('Phones aur parts ki cost') },
  electronics: { cogs: msg('Maal ki cost (serial war)') },
  appliances: { cogs: msg('Maal ki cost (serial war)') },
  garments: { cogs: msg('Kapre ki cost') },
  shoe: { cogs: msg('Jooton ki cost') },
  carpet: { cogs: msg('Carpet ki cost (sq ft)') },
  agri: { cogs: msg('Beej aur khaad ki cost') },
  salon: { cogs: msg('Products ki cost') },
  'services-biz': { cogs: msg('Parts ki cost') },
  clinic: { cogs: msg('Dawai / saaman ki cost') },
  jewelry: { cogs: msg('Sone / maal ki cost') },
  meat: { cogs: msg('Gosht ki cost (kg)') },
  dairy: { cogs: msg('Doodh / maal ki cost') },
};
export const pnlConfigFor = (industry?: string): PnlConfig => ({ ...BASE, ...(industry ? BY_INDUSTRY[industry] : undefined) });

const head = (id: string, label: string): PnlLine => ({ id, label, kind: 'head', value: () => null });

export function buildLines(cfg: PnlConfig, categories: ExpenseCategoryRef[], staff: boolean, statements: PnlStatement[] = []): PnlLine[] {
  const cat = (id: string) => (s: PnlStatement) => s.expenses.categories.find((c) => c.id === id)?.amount ?? 0;
  const split = (s: PnlStatement) => s.profitSplit ?? null;
  const all: PnlLine[] = [
    head('h-rev', t('Sale (revenue)')),
    { id: 'gross', label: t('Total sale (list rate par)'), hint: t('Har cheez ka poora rate × quantity, discount se pehle'), kind: 'item', value: (s) => s.revenue.gross, upIsGood: true },
    { id: 'discount', label: t('Discount'), hint: t('Item, bill, code aur loyalty points ka discount'), kind: 'item', minus: true, value: (s) => s.revenue.discount, upIsGood: false },
    { id: 'd-manual', label: t('Haath se diya (item + bill)'), kind: 'sub', value: (s) => s.revenue.manualDiscount },
    { id: 'd-code', label: t('Discount code'), kind: 'sub', value: (s) => s.revenue.codeDiscount },
    { id: 'd-loyalty', label: t('Loyalty points'), kind: 'sub', value: (s) => s.revenue.loyaltyDiscount },
    { id: 'service', label: t('Service / delivery charges'), hint: t('Bill par lage charges jo dukaan ke paas rahe'), kind: 'item', value: (s) => s.revenue.serviceCharges, upIsGood: true },
    { id: 'sales', label: t('Bills ki kul amount'), hint: t('Void ke ilawa saare bill'), kind: 'total', value: (s) => s.revenue.sales, upIsGood: true },
    { id: 'returns', label: t('Maal wapas (returns)'), hint: t('Is period me wapas hua maal, chahe bill pehle ka ho'), kind: 'item', minus: true, value: (s) => s.revenue.returns, upIsGood: false, to: '/returns' },
    { id: 'net', label: t('Net sale'), hint: t('Asal kamai: bills minus return'), kind: 'grand', value: (s) => s.revenue.net, upIsGood: true },

    head('h-cogs', t(cfg.cogs)),
    { id: 'c-saved', label: t('Sale par likhi cost'), hint: t('Har bill par bikte waqt save hui cost'), kind: 'item', cost: true, value: (s) => s.cogs?.saved ?? null, upIsGood: false },
    { id: 'c-est', label: t('Andaza (cost nahi likhi thi)'), hint: t('Jin lines par cost 0 thi, un ki product ki aaj ki cost'), kind: 'item', cost: true, value: (s) => s.cogs?.estimated ?? null, upIsGood: false },
    { id: 'c-ret', label: t('Wapas aaye maal ki cost'), hint: t('Return par maal ki cost cost se nikal jati hai'), kind: 'item', cost: true, minus: true, value: (s) => s.cogs?.returned ?? null },
    { id: 'cogs', label: t(cfg.cogs), hint: t(cfg.cogsHint), kind: 'total', cost: true, minus: true, value: (s) => s.cogs?.total ?? null, upIsGood: false },
    { id: 'bill-profit', label: t('Bill ka profit'), hint: t('Net sale minus maal ki cost — is period ke saare bill'), kind: 'total', cost: true, value: (s) => split(s)?.billProfit ?? s.grossProfit, upIsGood: true },
    { id: 'k-in-hand', label: t('Is me haath mein aaya'), hint: t('Cash/online wala hissa aur khate ka jo paisa aa gaya'), kind: 'sub', cost: true, optional: true, value: (s) => (split(s) ? split(s)!.realised - split(s)!.fromOlderBills : null) },
    { id: 'k-pending', label: t('Udhaar mein profit — abhi aana hai'), hint: t('Khate par baqi bills ka profit; paisa aane par haath mein aayega'), kind: 'sub', cost: true, optional: true, value: (s) => split(s)?.pending ?? null, drill: { kind: 'credit' } },
    { id: 'k-off', label: t('Udhaar maaf kiya'), kind: 'sub', cost: true, optional: true, value: (s) => split(s)?.writtenOff ?? null },
    { id: 'k-older', label: t('Pehle ke udhaar se aaya profit'), hint: t('Purane bills ka profit jo is period me wasool hua'), kind: 'sub', cost: true, optional: true, value: (s) => split(s)?.fromOlderBills ?? null },
    { id: 'gross-profit', label: t('Gross profit'), hint: t('Settings → Reports: "Paisa milne par" = haath mein aaya profit; "Bill bante hi" = bill ka profit'), kind: 'grand', cost: true, value: (s) => s.grossProfit, upIsGood: true },
    { id: 'gross-margin', label: t('Gross margin'), hint: t('Har 100 ki sale me maal ke baad kitna bacha'), kind: 'ratio', cost: true, value: (s) => s.grossMargin, upIsGood: true },

    head('h-exp', t('Kharchay (operating)')),
    ...categories.map((c): PnlLine => ({ id: `e-${c.id}`, label: serverName(c.name), kind: 'item', value: cat(c.id), upIsGood: false, drill: { kind: 'expense', categoryId: c.id } })),
    ...(staff ? [
      { id: 'salaries', label: t('Tankhwah (salary)'), hint: t('Staff ko di gayi tankhwah'), kind: 'item', value: (s) => s.expenses.salaries, upIsGood: false, drill: { kind: 'staff' } },
      { id: 'commission', label: t('Commission'), hint: t('Staff ko diya gaya commission'), kind: 'item', value: (s) => s.expenses.commission, upIsGood: false, drill: { kind: 'staff' } },
    ] as PnlLine[] : []),
    { id: 'opex', label: t('Kul kharchay'), kind: 'total', minus: true, value: (s) => s.expenses.total, upIsGood: false, to: '/expenses' },
    { id: 'operating', label: t('Kaarobari profit'), hint: t('Gross profit minus kharchay'), kind: 'total', cost: true, value: (s) => s.operatingProfit, upIsGood: true },

    head('h-stock', t('Stock nuksan aur faida')),
    { id: 'w-damage', label: t('Damage / expiry'), hint: t('Damage likha gaya, expiry, return par kharab nikla maal bhi'), kind: 'item', cost: true, value: (s) => s.writeOffs?.damage ?? null, upIsGood: false, drill: { kind: 'writeoff' } },
    { id: 'w-loss', label: t('Chori / shortage'), kind: 'item', cost: true, value: (s) => s.writeOffs?.loss ?? null, upIsGood: false, drill: { kind: 'writeoff' } },
    { id: 'w-short', label: t('Ginti me kam / dukaan mein istemal'), kind: 'item', cost: true, value: (s) => s.writeOffs?.countedShort ?? null, upIsGood: false, drill: { kind: 'writeoff' } },
    { id: 'stock-loss', label: t('Stock nuksan'), hint: t('Profit se minus'), kind: 'total', cost: true, value: (s) => (s.writeOffs ? s.writeOffs.stockLoss ?? s.writeOffs.damage + s.writeOffs.loss + s.writeOffs.countedShort : null), upIsGood: false },
    { id: 'w-found', label: t('Stock faida'), hint: t('Audit mein zyada nikla, free/bonus maal mila — profit mein plus'), kind: 'item', cost: true, value: (s) => s.writeOffs?.stockGain ?? s.writeOffs?.found ?? null, upIsGood: true, drill: { kind: 'writeoff' } },
    { id: 'w-correction', label: t('Galti theek ki (profit par asar nahi)'), hint: t('Sirf stock ki ginti theek hui; profit me shamil nahi'), kind: 'sub', cost: true, optional: true, value: (s) => s.writeOffs?.correction ?? null },
    { id: 'writeoffs', label: t('Stock ka net nuksan'), hint: t('Stock nuksan minus stock faida'), kind: 'total', cost: true, minus: true, value: (s) => s.writeOffs?.net ?? null, upIsGood: false, to: '/stock-adjustments' },

    head('h-other', t('Doosri aamdani')),
    { id: 'income', label: t('Company incentive, claim, kiraya waghera'), hint: t('Doosri aamdani ke page par likhi gayi'), kind: 'item', value: (s) => s.otherIncome.income ?? 0, upIsGood: true, drill: { kind: 'income' }, to: '/income' },
    { id: 'booking', label: t('Booking advance jo wapas nahi hua'), hint: t('Cancel ya waqt guzri booking ka rakha gaya advance'), kind: 'item', value: (s) => s.otherIncome.bookingKept, upIsGood: true, drill: { kind: 'booking' } },
    { id: 'other-total', label: t('Kul doosri aamdani'), kind: 'total', value: (s) => s.otherIncome.total, upIsGood: true },

    { id: 'net-profit', label: t('Net profit'), hint: t('Sab kuch ghata kar jo bacha'), kind: 'grand', cost: true, value: (s) => s.netProfit, upIsGood: true },
    { id: 'net-margin', label: t('Net margin'), hint: t('Har 100 ki sale me aakhir me kitna bacha'), kind: 'ratio', cost: true, value: (s) => s.netMargin, upIsGood: true },
  ];
  return all.filter((l) => !l.optional || statements.some((s) => Math.abs(l.value(s) ?? 0) >= 0.005));
}

export const CHANNEL_LABELS: Record<string, string> = {
  POS: 'Counter (POS)', WEBSITE: 'Website', DARAZ: 'Daraz', FOODPANDA: 'Foodpanda', SHOPIFY: 'Shopify', MARKETPLACE: 'Nafaa marketplace',
};
