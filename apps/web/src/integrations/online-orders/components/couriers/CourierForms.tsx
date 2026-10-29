import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Lock, Zap } from 'lucide-react';
import { apiErrorMessage, couriersApi, type CourierAccount, type CourierSettingField } from '../../api/online-orders.api';
import { cn } from '@core/lib/cn';
import { Button, controlClass, Field } from '@/design-system/components';
import { BrandLogo, brandForCourier } from '@/assets/brands/BrandLogo';

export const COURIERS_KEY = ['courier-accounts'];

/** Courier logo (real logo or brand lettermark), by courier code. */
export function CourierLogo({ c, size = 40 }: { c: Pick<CourierAccount, 'code' | 'name'>; size?: number }) {
  return <BrandLogo name={brandForCourier(c.code)} size={size} title={c.name} />;
}

/**
 * Connect: the courier's own fields, then "Check karke jorein". The API
 * checks the details with the courier at once, so wrong ones are not saved.
 * The step-by-step guide sits next to this form (courierGuides).
 */
export function ConnectForm({ c, onDone }: { c: CourierAccount; onDone?: () => void }) {
  const qc = useQueryClient();
  const [vals, setVals] = useState<Record<string, string>>({});
  const fields = c.connect?.credentials ?? [];

  const connect = useMutation({
    mutationFn: () => couriersApi.connect(c.code, { credentials: Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, v.trim()])) }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: COURIERS_KEY });
      qc.invalidateQueries({ queryKey: ['courier-options', c.code] });
      toast.success(`${c.name} jur gaya ✓`, { description: `${r.cities} shehar me delivery` });
      setVals({});
      onDone?.();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const missing = fields.some((f) => !f.optional && !(vals[f.key] ?? '').trim());

  return (
    <div className="space-y-4">
      {c.connect?.portalUrl && (
        <a href={c.connect.portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">
          {c.name} portal kholein <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <div className={cn('grid gap-3', fields.length > 1 && 'sm:grid-cols-2')}>
        {fields.map((f) => (
          <Field key={f.key} label={<>{f.label}{f.optional && <span className="font-normal text-slate-400"> (optional)</span>}</>} hint={f.help}>
            {(id) => (f.options ? (
              <select id={id} value={vals[f.key] ?? f.options[0]?.value ?? ''} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem]')}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
            <input
              id={id} type={f.secret ? 'password' : 'text'} autoComplete="off" spellCheck={false}
              value={vals[f.key] ?? ''} placeholder={f.placeholder}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !missing) connect.mutate(); }}
              className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem]', f.secret && 'font-mono')}
            />
            ))}
          </Field>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Lock className="h-3.5 w-3.5" /> Keys encrypted save hoti hain · sirf malik / manager</span>
        <Button size="sm" variant="primary" loading={connect.isPending} disabled={missing} onClick={() => connect.mutate()} leftIcon={<Zap className="h-4 w-4" />}>
          {c.connected ? 'Nayi key check karke lagayein' : 'Check karke jorein'}
        </Button>
      </div>
    </div>
  );
}

/** Booking settings, built from the courier's own field list (pickup, origin city, service, weight…). */
export function CourierSettingsForm({ c }: { c: CourierAccount }) {
  const qc = useQueryClient();
  const defs = c.connect?.settings ?? [];
  const needsOptions = defs.some((d) => d.type === 'pickup' || d.type === 'origin-city' || d.type === 'service');
  const { data: opts, isLoading } = useQuery({
    queryKey: ['courier-options', c.code],
    queryFn: () => couriersApi.options(c.code),
    enabled: needsOptions && c.connected,
    staleTime: 30 * 60_000,
  });

  const save = useMutation({
    mutationFn: (settings: Record<string, unknown>) => couriersApi.update(c.code, { settings: settings as any }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COURIERS_KEY });
      // Shehar badla to us ke areas / pickup dobara (Call Courier)
      qc.invalidateQueries({ queryKey: ['courier-options', c.code] });
      toast.success('Save ho gaya');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (!defs.length) return <p className="text-[0.8125rem] text-slate-500">Is courier ki koi setting nahi.</p>;

  return (
    <div className="divide-y divide-slate-100">
      {defs.map((d) => (
        <div key={d.key} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1 basis-56"><p className="text-sm font-medium text-slate-800">{<>{d.label}{d.required && <span className="text-rose-600"> *</span>}</>}</p>{d.help && <p className="mt-0.5 text-xs text-slate-500">{d.help}</p>}</div>
          <div className="max-w-full shrink-0"><SettingControl d={d} value={c.settings?.[d.key]} opts={opts} loading={isLoading} onSave={(v) => save.mutate({ [d.key]: v })} /></div></div>
      ))}
    </div>
  );
}

function SettingControl({ d, value, opts, loading, onSave }: {
  d: CourierSettingField;
  value: unknown;
  opts?: { cities: { id: string; name: string }[]; pickupAddresses: { code: string; address: string; city?: string | null }[]; services: { code: string; name: string }[] };
  loading: boolean;
  onSave: (v: string | number | null) => void;
}) {
  const [draft, setDraft] = useState(value === null || value === undefined ? '' : String(value));
  const current = value === null || value === undefined ? '' : String(value);

  if (d.type === 'pickup' || d.type === 'origin-city' || d.type === 'service' || d.type === 'select') {
    const list = d.type === 'pickup'
      ? (opts?.pickupAddresses ?? []).map((a) => ({ value: a.code, label: `${a.address}${a.city ? ` — ${a.city}` : ''}` }))
      : d.type === 'origin-city' ? (opts?.cities ?? []).map((x) => ({ value: x.id, label: x.name }))
        : d.type === 'service' ? (opts?.services ?? []).map((x) => ({ value: x.code, label: x.name }))
          : d.options ?? [];
    return (
      <select value={current} disabled={loading && d.type !== 'select'} onChange={(e) => onSave(e.target.value || null)} className={cn(controlClass(), 'h-9 w-60 max-w-full px-3 text-[0.8125rem]')}>
        <option value="">{loading && d.type !== 'select' ? 'Aa raha hai…' : d.placeholder ?? 'Default'}</option>
        {current && !list.some((o) => o.value === current) && <option value={current}>{current}</option>}
        {list.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <input
      type={d.type === 'number' ? 'number' : 'text'} step={d.type === 'number' ? '0.1' : undefined} min={d.type === 'number' ? '0.01' : undefined}
      value={draft} placeholder={d.placeholder ?? '(khali)'} maxLength={200}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== current && onSave(draft === '' ? null : d.type === 'number' ? Number(draft) : draft)}
      className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem]', d.type === 'number' ? 'w-24' : 'w-60 max-w-full')}
    />
  );
}
