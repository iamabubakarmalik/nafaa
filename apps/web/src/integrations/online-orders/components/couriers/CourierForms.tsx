import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Lock, Zap } from 'lucide-react';
import { apiErrorMessage, couriersApi, type CourierAccount, type CourierSettingField } from '../../api/online-orders.api';
import { Btn, Field, SettingRow, inputCls } from '../ui/kit';
import { cn } from '@core/lib/cn';

export const COURIERS_KEY = ['courier-accounts'];

/** Courier ka "logo" — naam ke pehle harf, courier ke rang me */
export function CourierLogo({ c, size = 40 }: { c: Pick<CourierAccount, 'name' | 'color'>; size?: number }) {
  const initials = c.name.replace(/[^A-Za-z& ]/g, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg font-semibold"
      style={{ width: size, height: size, backgroundColor: `${c.color}1a`, color: c.color, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

/**
 * Connect: qadam + khane (courier ke hisaab se) → "Check karke jorein".
 * Nafaa courier se usi waqt check karta hai — ghalat key save nahi hoti.
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
      <ol className="space-y-1.5 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
        {(c.connect?.steps ?? []).map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
        {c.connect?.portalUrl && (
          <li className="pl-7">
            <a href={c.connect.portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-400">
              {c.name} portal kholein <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </li>
        )}
      </ol>
      <div className={cn('grid gap-3', fields.length > 1 && 'sm:grid-cols-2')}>
        {fields.map((f) => (
          <Field key={f.key} label={<>{f.label}{f.optional && <span className="font-normal text-slate-400"> (optional)</span>}</>} help={f.help}>
            {f.options ? (
              <select value={vals[f.key] ?? f.options[0]?.value ?? ''} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} className={inputCls}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
            <input
              type={f.secret ? 'password' : 'text'} autoComplete="off" spellCheck={false}
              value={vals[f.key] ?? ''} placeholder={f.placeholder}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !missing) connect.mutate(); }}
              className={cn(inputCls, f.secret && 'font-mono')}
            />
            )}
          </Field>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500"><Lock className="h-3.5 w-3.5" /> Keys encrypted save hoti hain · sirf malik / manager</span>
        <Btn variant="primary" loading={connect.isPending} disabled={missing} onClick={() => connect.mutate()} icon={<Zap className="h-4 w-4" />}>
          {c.connected ? 'Nayi key check karke lagayein' : 'Check karke jorein'}
        </Btn>
      </div>
    </div>
  );
}

/** Settings — courier ki list se khud banta hai (pickup, origin city, service, wazan…) */
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

  if (!defs.length) return <p className="text-[13px] text-slate-500">Is courier ki koi setting nahi.</p>;

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {defs.map((d) => (
        <SettingRow key={d.key} title={<>{d.label}{d.required && <span className="text-rose-600"> *</span>}</>} help={d.help}
          control={<SettingControl d={d} value={c.settings?.[d.key]} opts={opts} loading={isLoading} onSave={(v) => save.mutate({ [d.key]: v })} />} />
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
      <select value={current} disabled={loading && d.type !== 'select'} onChange={(e) => onSave(e.target.value || null)} className={cn(inputCls, 'w-60')}>
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
      className={cn(inputCls, d.type === 'number' ? 'w-24' : 'w-60')}
    />
  );
}
