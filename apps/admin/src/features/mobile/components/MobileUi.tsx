/** Building blocks shared by the Mobile app pages. */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Input, Segmented, Textarea } from '@/design-system/components';
import {
  adminMobileApi, type Audience, type Lang, type LocalizedText, type MobileTarget, type TenantOption,
} from '@/api/admin-mobile.api';
import { cn } from '@/lib/cn';
import { labelCls, SERIES } from '@/features/shared/kit';

export { Panel as Card, Pill, Toggle, inputCls, labelCls, SERIES } from '@/features/shared/kit';

export const PLATFORM_LABEL: Record<string, string> = { ios: 'iOS', android: 'Android' };
/** GROCERY → Grocery, AUTO_PARTS → Auto parts. */
export const industryLabel = (s: string | null | undefined) =>
  !s ? '—' : (s.charAt(0) + s.slice(1).toLowerCase()).replace(/_/g, ' ');

export const LANGUAGE_LABEL: Record<string, string> = { en: 'English', ur: 'Urdu', roman: 'Roman Urdu', unknown: 'Not set' };

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
        <span className="truncate text-[0.75rem] font-medium text-slate-600">{label}</span>
        <Segmented value={lang} onChange={setLang} label={`${label} language`} className="shrink-0"
          items={LANGS.map((l) => ({
            value: l.key,
            label: <span title={l.key !== 'en' && !(value[l.key] ?? '').trim() ? 'Not translated: English is shown' : undefined}>{l.label}{l.key !== 'en' && (value[l.key] ?? '').trim() ? ' •' : ''}</span>,
          }))} />
      </div>
      {multiline ? (
        <Textarea value={text} dir={current.dir} maxLength={maxLength} rows={3} onChange={(e) => set(e.target.value)} aria-label={label}
          placeholder={lang === 'en' ? placeholder : 'Leave empty to show the English text'} className={cn(current.dir === 'rtl' && 'text-right')} />
      ) : (
        <Input value={text} dir={current.dir} maxLength={maxLength} onChange={(e) => set(e.target.value)} aria-label={label}
          placeholder={lang === 'en' ? placeholder : 'Leave empty to show the English text'} className={cn(current.dir === 'rtl' && 'text-right')} />
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition',
        active ? 'border-brand-600 bg-brand-600 text-brand-fg' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
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
        <Input label="From version" value={value.minVersion ?? ''} onChange={(e) => set({ minVersion: e.target.value.trim() || null })} placeholder="Any" list="mobile-versions" />
        <Input label="Up to version" value={value.maxVersion ?? ''} onChange={(e) => set({ maxVersion: e.target.value.trim() || null })} placeholder="Any" list="mobile-versions" />
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
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
            {names.get(id)?.name ?? id.slice(0, 8)}
            <button type="button" onClick={() => onChange(ids.filter((x) => x !== id))} aria-label="Remove"><X className="h-3 w-3" /></button>
          </span>
        ))}
        {!ids.length && <span className="text-xs text-slate-500">No business picked yet.</span>}
      </div>
      <Input leftIcon={<Search className="h-4 w-4" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search business by name" aria-label="Search business" />
      {term && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
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
