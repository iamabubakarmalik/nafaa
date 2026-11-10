/**
 * Optional "kind" select for a category, shown only in industries that use kinds.
 */

import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { useCategoryKinds } from '../lib/kinds';

export function KindSelect({ value, onChange, className }: { value: string | null | undefined; onChange: (kind: string | null) => void; className?: string }) {
  const kinds = useCategoryKinds();
  if (!kinds) return null;
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-[0.8125rem] font-semibold text-slate-800">{t('Kis qisam ka maal (marzi)')}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500">
        <option value="">{t('Kuch aur / chunna nahi')}</option>
        {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
      </select>
      <span className="mt-1 block text-[0.75rem] text-slate-500">{t('Is category ke products isi qisam ke maane jate hain (sub-category bhi)')}</span>
    </label>
  );
}
