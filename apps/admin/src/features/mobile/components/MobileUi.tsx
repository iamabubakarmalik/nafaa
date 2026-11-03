/** Building blocks shared by the Mobile app pages. */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Smartphone, X } from 'lucide-react';
import {
  adminMobileApi, type Audience, type Lang, type LocalizedText, type MobileTarget, type TenantOption,
} from '@/api/admin-mobile.api';
import { cn } from '@/lib/cn';

/** Chart and split colors; validated for color-blind separation on white. */
export const SERIES = ['#4f46e5', '#0d9488', '#d97706', '#db2777', '#0284c7'];
export const PLATFORM_LABEL: Record<string, string> = { ios: 'iOS', android: 'Android' };
/** GROCERY → Grocery, AUTO_PARTS → Auto parts. */
export const industryLabel = (s: string | null | undefined) =>
  !s ? '—' : (s.charAt(0) + s.slice(1).toLowerCase()).replace(/_/g, ' ');

export const LANGUAGE_LABEL: Record<string, string> = { en: 'English', ur: 'Urdu', roman: 'Roman Urdu', unknown: 'Not set' };

export function MobileHero({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-600 p-6 text-white shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            <Smartphone className="h-3.5 w-3.5" /> Mobile app
          </div>
          <h2 className="mt-3 text-3xl font-bold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/85">{subtitle}</p>
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: 'teal' | 'amber' | 'rose' }) {
  const toneCls = tone === 'teal'
    ? 'bg-gradient-to-br from-teal-600 to-cyan-700 text-white border-transparent'
    : tone === 'amber' ? 'bg-amber-50 border-amber-200' : tone === 'rose' ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200';
  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', toneCls)}>
      <div className={cn('text-xs', tone === 'teal' ? 'text-white/80' : 'text-slate-500')}>{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {hint && <div className={cn('mt-0.5 text-xs', tone === 'teal' ? 'text-white/75' : 'text-slate-500')}>{hint}</div>}
    </div>
  );
}

export function Card({ title, subtitle, action, children, className }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-bold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition disabled:opacity-50', checked ? 'bg-teal-600' : 'bg-slate-300')}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'teal' | 'amber' | 'rose' | 'indigo' | 'emerald' }) {
  const map = {
    slate: 'bg-slate-100 text-slate-600', teal: 'bg-teal-50 text-teal-700', amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700', indigo: 'bg-admin-50 text-admin-700', emerald: 'bg-emerald-50 text-emerald-700',
  };
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', map[tone])}>{children}</span>;
}

export const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
export const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

const LANGS: { key: Lang; label: string; dir?: 'rtl' }[] = [
  { key: 'en', label: 'English' },
  { key: 'roman', label: 'Roman Urdu' },
  { key: 'ur', label: 'اردو', dir: 'rtl' },
];

/** One text in the three app languages. English is required; empty translations fall back to English. */
export function LocalizedField({ label, value, onChange, multiline, maxLength, placeholder }: {
  label: string; value: LocalizedText; onChange: (v: LocalizedText) => void; multiline?: boolean; maxLength?: number; placeholder?: string;
}) {
  const [lang, setLang] = useState<Lang>('en');
  const current = LANGS.find((l) => l.key === lang)!;
  const text = value[lang] ?? '';
  const set = (t: string) => onChange({ ...value, [lang]: t });
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-slate-600">{label}</span>
        <div className="inline-flex flex-shrink-0 rounded-lg bg-slate-100 p-0.5">
          {LANGS.map((l) => (
            <button key={l.key} type="button" onClick={() => setLang(l.key)}
              title={l.key !== 'en' && !(value[l.key] ?? '').trim() ? 'Not translated: English is shown' : undefined}
              className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold transition',
                lang === l.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
              {l.label}
              {l.key !== 'en' && (value[l.key] ?? '').trim() ? <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> : null}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea value={text} dir={current.dir} maxLength={maxLength} rows={3} onChange={(e) => set(e.target.value)}
          placeholder={lang === 'en' ? placeholder : `Leave empty to show the English text`}
          className={cn(inputCls, 'h-auto py-2', current.dir === 'rtl' && 'text-right')} />
      ) : (
        <input value={text} dir={current.dir} maxLength={maxLength} onChange={(e) => set(e.target.value)}
          placeholder={lang === 'en' ? placeholder : `Leave empty to show the English text`}
          className={cn(inputCls, current.dir === 'rtl' && 'text-right')} />
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition',
        active ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
      {children}
    </button>
  );
}

const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Audience + platform + version range picker used by announcements and push. */
export function TargetPicker({ value, onChange }: { value: MobileTarget; onChange: (t: MobileTarget) => void }) {
  const { data: targets } = useQuery({ queryKey: ['admin-mobile-targets'], queryFn: adminMobileApi.targets, staleTime: 60_000 });
  const set = (patch: Partial<MobileTarget>) => onChange({ ...value, ...patch });
  const audiences: { key: Audience; label: string }[] = [
    { key: 'all', label: 'Everyone' }, { key: 'plan', label: 'Plan' }, { key: 'industry', label: 'Industry' }, { key: 'tenant', label: 'Businesses' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <span className={labelCls}>Who</span>
        <div className="flex flex-wrap gap-2">
          {audiences.map((a) => <Chip key={a.key} active={value.audience === a.key} onClick={() => set({ audience: a.key })}>{a.label}</Chip>)}
        </div>
      </div>

      {value.audience === 'plan' && (
        <div className="flex flex-wrap gap-2">
          {(targets?.plans ?? []).map((p) => (
            <Chip key={p.slug} active={value.planSlugs.includes(p.slug)} onClick={() => set({ planSlugs: toggleIn(value.planSlugs, p.slug) })}>{p.name}</Chip>
          ))}
        </div>
      )}

      {value.audience === 'industry' && (
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {(targets?.industries ?? []).map((i) => (
            <Chip key={i.key} active={value.industries.includes(i.key)} onClick={() => set({ industries: toggleIn(value.industries, i.key) })}>
              {industryLabel(i.key)} <span className="opacity-60">· {i.tenants}</span>
            </Chip>
          ))}
        </div>
      )}

      {value.audience === 'tenant' && <TenantPicker ids={value.tenantIds} onChange={(tenantIds) => set({ tenantIds })} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <span className={labelCls}>Platform</span>
          <div className="flex gap-2">
            <Chip active={!value.platforms.length} onClick={() => set({ platforms: [] })}>Both</Chip>
            {['android', 'ios'].map((p) => (
              <Chip key={p} active={value.platforms.length === 1 && value.platforms[0] === p} onClick={() => set({ platforms: [p] })}>{PLATFORM_LABEL[p]}</Chip>
            ))}
          </div>
        </div>
        <label>
          <span className={labelCls}>From version</span>
          <input value={value.minVersion ?? ''} onChange={(e) => set({ minVersion: e.target.value.trim() || null })} placeholder="Any" className={inputCls} list="mobile-versions" />
        </label>
        <label>
          <span className={labelCls}>Up to version</span>
          <input value={value.maxVersion ?? ''} onChange={(e) => set({ maxVersion: e.target.value.trim() || null })} placeholder="Any" className={inputCls} list="mobile-versions" />
        </label>
        <datalist id="mobile-versions">{(targets?.versions ?? []).map((v) => <option key={v.version} value={v.version} />)}</datalist>
      </div>
    </div>
  );
}

function TenantPicker({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const t = setTimeout(() => setTerm(q), 250); return () => clearTimeout(t); }, [q]);
  const { data: results = [] } = useQuery({ queryKey: ['admin-mobile-tenant-search', term], queryFn: () => adminMobileApi.searchTenants(term), enabled: term.length > 0 });
  const { data: picked = [] } = useQuery({ queryKey: ['admin-mobile-tenant-names', ids], queryFn: () => adminMobileApi.tenantNames(ids), enabled: ids.length > 0 });
  const names = useMemo(() => new Map<string, TenantOption>(picked.map((p) => [p.id, p])), [picked]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            {names.get(id)?.name ?? id.slice(0, 8)}
            <button type="button" onClick={() => onChange(ids.filter((x) => x !== id))} aria-label="Remove"><X className="h-3 w-3" /></button>
          </span>
        ))}
        {!ids.length && <span className="text-xs text-slate-500">No business picked yet.</span>}
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search business by name" className={cn(inputCls, 'pl-9')} />
      </label>
      {term && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
          {results.length === 0 ? <div className="p-3 text-xs text-slate-500">No match.</div> : results.map((t) => (
            <button key={t.id} type="button" disabled={ids.includes(t.id)}
              onClick={() => { onChange([...ids, t.id]); setQ(''); }}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50 disabled:opacity-40">
              <span className="font-medium text-slate-800">{t.name}</span>
              <span className="text-xs text-slate-500">{t.businessType ?? '—'} · {t.devices ?? 0} devices</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Short description of a target for lists. */
export function describeTarget(t: MobileTarget): string {
  const who = t.audience === 'all' ? 'Everyone'
    : t.audience === 'plan' ? `Plan: ${t.planSlugs.join(', ') || '—'}`
    : t.audience === 'industry' ? `Industry: ${t.industries.map(industryLabel).join(', ') || '—'}`
    : `${t.tenantIds.length} business${t.tenantIds.length === 1 ? '' : 'es'}`;
  const parts = [who];
  if (t.platforms.length) parts.push(t.platforms.map((p) => PLATFORM_LABEL[p] ?? p).join(' + '));
  if (t.minVersion || t.maxVersion) parts.push(`v${t.minVersion ?? '0'} – ${t.maxVersion ?? 'latest'}`);
  return parts.join(' · ');
}

/** Horizontal share bars: one row per category with its count and share. */
export function ShareBars({ rows, color = SERIES[0], format }: { rows: { key: string; devices: number }[]; color?: string; format?: (k: string) => string }) {
  const total = rows.reduce((s, r) => s + r.devices, 0) || 1;
  if (!rows.length) return <div className="py-6 text-center text-sm text-slate-500">No devices yet.</div>;
  return (
    <div className="space-y-2.5">
      {rows.slice(0, 8).map((r) => {
        const pct = Math.round((r.devices / total) * 100);
        return (
          <div key={r.key} title={`${format ? format(r.key) : r.key}: ${r.devices.toLocaleString()} devices (${pct}%)`}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{format ? format(r.key) : r.key}</span>
              <span className="tabular-nums text-slate-500">{r.devices.toLocaleString()} · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
