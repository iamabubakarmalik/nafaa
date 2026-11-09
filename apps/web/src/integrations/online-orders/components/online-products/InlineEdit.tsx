/**
 * Click a number in the grid to change it in place: a small popup with one
 * field. Enter saves, Escape cancels, "Rule" clears the own value so the
 * channel's rule applies again.
 */

import { useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Popover } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { onlineProductsApi, type LinkPatch } from '../../api/online-products.api';
import { refreshOnlineProducts } from './meta';

export function InlineEdit({ mappingId, field, value, ruleHint, label, disabled, className, children }: {
  mappingId: string;
  field: 'priceOverride' | 'allocQty' | 'compareAtPrice';
  /** Current own value; null = the channel's rule. */
  value: number | null;
  /** What applies with no own value, e.g. "Rule: Rs 1,250". */
  ruleHint: string;
  label: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const qc = useQueryClient();
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const money = field !== 'allocQty';
  const save = useMutation({
    mutationFn: (v: number | null) => onlineProductsApi.updateLink(mappingId, { [field]: v } as LinkPatch),
    onSuccess: () => { refreshOnlineProducts(qc); setOpen(false); toast.success(t('Save ho gaya — channel par ja raha hai')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const num = Number(text);
  const ok = text === '' || (Number.isFinite(num) && (money ? num > 0 : num >= 0));
  const submit = () => { if (ok) save.mutate(text === '' ? null : num); };

  if (disabled) return <span className={className}>{children}</span>;
  // The popup is portalled but React events still bubble to the grid row; keep clicks here.
  return (
    <span onClick={(e) => e.stopPropagation()} className="contents">
      <button ref={ref} type="button" title={label}
        onClick={() => { setText(value === null || value === undefined ? '' : String(value)); setOpen((v) => !v); }}
        className={cn('-mx-1 rounded px-1 tabular-nums decoration-dotted underline-offset-2 transition hover:bg-slate-100 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', className)}>
        {children}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} align="start" width="w-60" label={label} closeOnScroll={false} className="p-3">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-2">
          <p className="text-[0.75rem] font-semibold text-slate-700">{label}</p>
          <Input autoFocus inputMode={money ? 'decimal' : 'numeric'} value={text} placeholder={ruleHint}
            onChange={(e) => setText(e.target.value.replace(money ? /[^\d.]/g : /\D/g, ''))}
            aria-label={label} error={ok ? undefined : t('Sahi number likhein')}
            rightIcon={<span className="text-[0.75rem] text-slate-500">{money ? 'Rs' : t('pcs')}</span>} />
          <p className="text-[0.6875rem] text-slate-500">{t('Khali = {{rule}}', { rule: ruleHint })}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            {value !== null && value !== undefined
              ? <Button type="button" size="xs" variant="ghost" disabled={save.isPending} onClick={() => save.mutate(null)}>{t('Rule par wapas')}</Button>
              : <span />}
            <Button type="submit" size="xs" loading={save.isPending} disabled={!ok}>{t('Save')}</Button>
          </div>
        </form>
      </Popover>
    </span>
  );
}
