/** One customer as a card (grid) or a table row, with balance, visits and quick actions. */

import { Link } from 'react-router-dom';
import { Check, Crown, MessageCircle, Pencil, Phone } from 'lucide-react';
import { Avatar } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { DirectoryCustomer } from '../api';
import { reminderText, thanksText, toneFor, loadTemplates, waLink } from '../messages';
import { t } from '@core/i18n';

export const ago = (days: number | null) =>
  days === null ? t('kabhi nahi') : days === 0 ? 'aaj' : days === 1 ? 'kal' : days < 30 ? t('{{days}} din pehle', { days }) : days < 365 ? t('{{value}} mahine pehle', { value: Math.floor(days / 30) }) : t('{{value}} saal pehle', { value: Math.floor(days / 365) });

export function waFor(c: DirectoryCustomer, shop: string) {
  const text = c.balance > 0.009 ? reminderText(loadTemplates()[toneFor(c.dueDays)], c, shop) : thanksText(c, shop);
  return waLink(c.phone, text);
}

export function BalanceChip({ c, money }: { c: DirectoryCustomer; money: (n: number) => string }) {
  if (c.balance > 0.009) {
    return (
      <span className={cn('inline-flex items-baseline gap-1 rounded-lg px-2 py-0.5 text-[0.8125rem] font-bold tabular-nums', c.overLimit ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700')}>
        {money(c.balance)}<span className="text-[0.625rem] font-semibold uppercase opacity-80">{t('baqi')}</span>
      </span>
    );
  }
  if (c.balance < -0.009) return <span className="rounded-lg bg-success-50 px-2 py-0.5 text-[0.8125rem] font-bold tabular-nums text-success-700">{money(-c.balance)} <span className="text-[0.625rem] font-semibold uppercase">{t('advance')}</span></span>;
  return <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[0.75rem] font-semibold text-slate-500">{t('Hisaab saaf')}</span>;
}

function Select({ on, onToggle, className }: { on: boolean; onToggle: () => void; className?: string }) {
  return (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }} aria-pressed={on} aria-label={t('Chunein')}
      className={cn('flex h-6 w-6 items-center justify-center rounded-md border-2 transition', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-brand-500', className)}>
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </button>
  );
}

interface Props {
  c: DirectoryCustomer; money: (n: number) => string; shop: string;
  selected: boolean; selecting: boolean; onToggle: () => void; canEdit: boolean;
}

export function CustomerCard({ c, money, shop, selected, selecting, onToggle, canEdit }: Props) {
  const wa = waFor(c, shop);
  const limitPct = c.creditLimit > 0 ? Math.min(100, (Math.max(0, c.balance) / c.creditLimit) * 100) : null;
  return (
    <article data-nav-row className={cn('group relative flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-lg',
      selected ? 'ring-2 ring-brand-500' : c.overLimit ? 'ring-rose-200' : 'ring-slate-200/80', !c.isActive && 'opacity-70')}>
      <Select on={selected} onToggle={onToggle} className={cn('absolute end-3 top-3', !selecting && !selected && 'opacity-0 group-hover:opacity-100 focus:opacity-100')} />
      <Link to={`/customers/${c.id}`} className="flex items-center gap-3 pe-7">
        <span className="relative">
          <Avatar name={c.name} url={c.avatarUrl ?? undefined} size={44} />
          {c.isVip && <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-amber-950 ring-2 ring-white"><Crown className="h-3 w-3" /></span>}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[0.9375rem] font-semibold text-slate-900 group-hover:text-brand-700">{c.name}</span>
          <span className="block truncate text-[0.75rem] text-slate-500">{c.phone ?? t('Phone nahi')}{c.city ? ` · ${c.city}` : ''}</span>
        </span>
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <BalanceChip c={c} money={money} />
        {c.balance > 0.009 && c.dueDays !== null && <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', c.dueDays >= 30 ? 'bg-rose-50 text-rose-700' : c.dueDays >= 7 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600')}>{t('{{dueDays}} din purana', { dueDays: c.dueDays })}</span>}
        {!c.isActive && <span className="rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase text-white">{t('Band')}</span>}
        {c.loyaltyPoints > 0 && <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-violet-700">{t('{{loyaltyPoints}} points', { loyaltyPoints: c.loyaltyPoints })}</span>}
      </div>
      {limitPct !== null && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', limitPct >= 100 ? 'bg-rose-500' : limitPct >= 75 ? 'bg-amber-400' : 'bg-success-500')} style={{ width: `${limitPct}%` }} /></div>
          <p className="mt-0.5 text-[0.6875rem] text-slate-500">{t('Had {{creditLimit}}{{value}}', { creditLimit: money(c.creditLimit), value: c.overLimit ? t(' — paar ho gayi') : '' })}</p>
        </div>
      )}
      {c.period && (c.period.spent > 0 || c.period.credit > 0 || c.period.paid > 0) && (
        <p className="mt-2 rounded-lg bg-brand-50 px-2 py-1 text-[0.6875rem] text-brand-800">
          {t('Is period mein: {{value}}{{value2}}{{value3}}', { value: c.period.visits > 0 ? t('{{spent}} · {{visits}} bill', { spent: money(c.period.spent), visits: c.period.visits }) : '', value2: c.period.credit > 0 ? t(' · udhaar {{credit}}', { credit: money(c.period.credit) }) : '', value3: c.period.paid > 0 ? t(' · diya {{paid}}', { paid: money(c.period.paid) }) : '' })}
        </p>
      )}
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
        <div><dt className="text-[0.6875rem] text-slate-500">{t('Aaya')}</dt><dd className="text-[0.875rem] font-bold tabular-nums text-slate-900">{c.visits}</dd></div>
        <div><dt className="text-[0.6875rem] text-slate-500">{t('Khareeda')}</dt><dd className="truncate text-[0.875rem] font-bold tabular-nums text-slate-900">{money(c.spent)}</dd></div>
        <div><dt className="text-[0.6875rem] text-slate-500">{t('Aakhri')}</dt><dd className={cn('truncate text-[0.8125rem] font-semibold', (c.daysSinceVisit ?? 0) > 60 ? 'text-amber-700' : 'text-slate-700')}>{ago(c.daysSinceVisit)}</dd></div>
      </dl>
      <div className="mt-3 flex items-center gap-1">
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" className={cn('inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-[0.8125rem] font-semibold transition', c.balance > 0.009 ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-success-50 text-success-700 hover:bg-success-100')}>
            <MessageCircle className="h-4 w-4" />{c.balance > 0.009 ? t('Yaad dilayein') : t('WhatsApp')}
          </a>
        ) : <Link to={`/customers/${c.id}`} className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-slate-100 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-200">{t('Dekhein')}</Link>}
        {c.phone && <a href={`tel:${c.phone}`} title={t('Call')} aria-label={t('Call')} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><Phone className="h-4 w-4" /></a>}
        {canEdit && <Link to={`/customers/${c.id}/edit`} title={t('Badlein')} aria-label={t('Badlein')} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></Link>}
      </div>
    </article>
  );
}

export function CustomerRow({ c, money, shop, selected, onToggle, canEdit }: Props) {
  const wa = waFor(c, shop);
  return (
    <tr data-nav-row className={cn('group transition hover:bg-slate-50/80', selected && 'bg-brand-50/50', !c.isActive && 'opacity-70')}>
      <td className="w-10 py-2.5 ps-4"><Select on={selected} onToggle={onToggle} /></td>
      <td className="py-2.5 pe-3">
        <Link to={`/customers/${c.id}`} className="flex min-w-0 items-center gap-3">
          <Avatar name={c.name} url={c.avatarUrl ?? undefined} size={36} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5"><span className="truncate text-[0.875rem] font-semibold text-slate-900 group-hover:text-brand-700">{c.name}</span>{c.isVip && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}</span>
            <span className="block truncate text-[0.75rem] text-slate-500">{c.phone ?? '—'}</span>
          </span>
        </Link>
      </td>
      <td className="px-3 py-2.5 text-[0.8125rem] text-slate-600">{c.city ?? '—'}</td>
      <td className="px-3 py-2.5 text-end text-[0.8125rem] tabular-nums">{c.visits}</td>
      <td className="px-3 py-2.5 text-end text-[0.8125rem] font-semibold tabular-nums">{money(c.spent)}</td>
      <td className="px-3 py-2.5 text-end text-[0.8125rem] tabular-nums text-slate-600">{c.visits ? money(c.average) : '—'}</td>
      <td className={cn('px-3 py-2.5 text-[0.8125rem]', (c.daysSinceVisit ?? 0) > 60 ? 'text-amber-700' : 'text-slate-600')}>{ago(c.daysSinceVisit)}</td>
      <td className="px-3 py-2.5 text-end">
        <BalanceChip c={c} money={money} />
        {c.balance > 0.009 && c.dueDays !== null && <span className="block text-[0.6875rem] text-slate-500">{t('{{dueDays}} din purana', { dueDays: c.dueDays })}</span>}
      </td>
      <td className="py-2.5 pe-3">
        <div className="flex items-center justify-end gap-0.5">
          {wa && <a href={wa} target="_blank" rel="noreferrer" title={t('WhatsApp')} aria-label={t('WhatsApp')} className="flex h-9 w-9 items-center justify-center rounded-xl text-success-700 hover:bg-success-50"><MessageCircle className="h-4 w-4" /></a>}
          {c.phone && <a href={`tel:${c.phone}`} title={t('Call')} aria-label={t('Call')} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><Phone className="h-4 w-4" /></a>}
          {canEdit && <Link to={`/customers/${c.id}/edit`} title={t('Badlein')} aria-label={t('Badlein')} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></Link>}
        </div>
      </td>
    </tr>
  );
}
