/**
 * Settings → SEO defaults, Analytics and Industry groups.
 */
import { useState } from 'react';
import {
  CMS_ENTRY_TYPES, DEFAULT_ANALYTICS_SETTINGS, DEFAULT_OFFICIAL_DOMAINS, DEFAULT_QUALITY_GATES, DEFAULT_TITLE_PATTERNS, ENTRY_TYPE_META,
  TITLE_PATTERN_PLACEHOLDERS,
  type AnalyticsSettings, type CmsEntryType, type IndustryGroups, type SeoSettings,
} from '../contract/cms-contract';
import type { FieldErrors } from '../dashboard/shared/cms-http';
import { Field, Toggle, inputCls } from '../dashboard/shared/ui';
import { RowList, SettingSection, opt, splitLines } from './SettingSection';

// ─── SEO ───

interface GateRow { minWords: string; minFaqs: string; similarityMax: string }

export function SeoSettingsTab({ value }: { value: SeoSettings | null }) {
  const [template, setTemplate] = useState(value?.titleTemplate ?? '%s | Nafaa');
  const [patterns, setPatterns] = useState<{ key: string; pattern: string }[]>(
    Object.entries(value?.titlePatterns ?? {}).map(([key, pattern]) => ({ key, pattern: pattern ?? '' })),
  );
  const [gates, setGates] = useState<Partial<Record<CmsEntryType, GateRow>>>(
    Object.fromEntries(
      Object.entries(value?.qualityGates ?? {}).map(([t, g]) => [t, { minWords: String(g?.minWords ?? ''), minFaqs: g?.minFaqs != null ? String(g.minFaqs) : '', similarityMax: g?.similarityMax != null ? String(g.similarityMax) : '' }]),
    ),
  );
  const [domains, setDomains] = useState((value?.officialDomains ?? [...DEFAULT_OFFICIAL_DOMAINS]).join('\n'));
  const [indexNowKey, setIndexNowKey] = useState(value?.indexNowKey ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});

  const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
  const build = (): unknown => ({
    titleTemplate: template,
    titlePatterns: Object.fromEntries(patterns.filter((p) => p.key.trim() && p.pattern.trim()).map((p) => [p.key.trim(), p.pattern.trim()])),
    qualityGates: Object.fromEntries(
      Object.entries(gates)
        .filter(([, g]) => g && g.minWords.trim() !== '')
        .map(([t, g]) => [t, { minWords: Number(g!.minWords), minFaqs: num(g!.minFaqs), similarityMax: num(g!.similarityMax) }]),
    ),
    officialDomains: splitLines(domains).map((d) => d.toLowerCase()),
    indexNowKey: opt(indexNowKey),
  });

  const setGate = (t: CmsEntryType, p: Partial<GateRow>) =>
    setGates({ ...gates, [t]: { minWords: '', minFaqs: '', similarityMax: '', ...gates[t], ...p } });

  return (
    <SettingSection settingKey="seo" title="SEO defaults" description="Title ka dhancha, har page type ki kam se kam lambai (quality gate) aur official sources." buildValue={build} onErrors={setErrors}>
      <Field label="Title template" required error={errors.titleTemplate} hint="%s ki jagah page ka title aata hai">
        <input className={inputCls} value={template} onChange={(e) => setTemplate(e.target.value)} />
      </Field>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">Title patterns</h3>
        <p className="mb-2 text-xs text-neutral-500">
          Key: page type (INDUSTRY) ya PAGE:home. Placeholders: {TITLE_PATTERN_PLACEHOLDERS.map((p) => `{${p}}`).join(', ')}, {'{data.field}'}. Khali chhorein to default lagta hai.
        </p>
        <RowList
          rows={patterns}
          onChange={setPatterns}
          addLabel="Pattern"
          make={() => ({ key: '', pattern: '' })}
          render={(row, setRow) => (
            <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
              <input className={inputCls} list="cms-title-pattern-keys" placeholder="INDUSTRY" value={row.key} onChange={(e) => setRow({ key: e.target.value })} />
              <div>
                <input className={inputCls} value={row.pattern} placeholder={DEFAULT_TITLE_PATTERNS[row.key as keyof typeof DEFAULT_TITLE_PATTERNS] ?? ''} onChange={(e) => setRow({ pattern: e.target.value })} />
                {errors[`titlePatterns.${row.key}`] && <p className="text-xs text-rose-600">{errors[`titlePatterns.${row.key}`]}</p>}
              </div>
            </div>
          )}
        />
        <datalist id="cms-title-pattern-keys">
          {Object.keys(DEFAULT_TITLE_PATTERNS).map((k) => <option key={k} value={k} />)}
        </datalist>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">Quality gates</h3>
        <p className="mb-2 text-xs text-neutral-500">Is se kam words wala page publish ho sakta hai lekin noindex rahe ga aur sitemap me nahi aaye ga. Khali = default.</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500">
                <th className="py-1 pr-2">Type</th><th className="px-2">Min words</th><th className="px-2">Min FAQs</th><th className="px-2">Similarity max (0-1)</th>
              </tr>
            </thead>
            <tbody>
              {CMS_ENTRY_TYPES.map((t) => {
                const d = DEFAULT_QUALITY_GATES[t];
                const g = gates[t];
                return (
                  <tr key={t} className="border-t border-neutral-100">
                    <td className="py-1 pr-2 text-neutral-700">{ENTRY_TYPE_META[t].label}</td>
                    <td className="px-2 py-1"><input type="number" min={0} className={inputCls + ' w-24'} placeholder={d ? String(d.minWords) : ''} value={g?.minWords ?? ''} onChange={(e) => setGate(t, { minWords: e.target.value })} /></td>
                    <td className="px-2 py-1"><input type="number" min={0} className={inputCls + ' w-20'} placeholder={d?.minFaqs != null ? String(d.minFaqs) : ''} value={g?.minFaqs ?? ''} onChange={(e) => setGate(t, { minFaqs: e.target.value })} /></td>
                    <td className="px-2 py-1"><input type="number" min={0} max={1} step={0.05} className={inputCls + ' w-24'} placeholder={d?.similarityMax != null ? String(d.similarityMax) : ''} value={g?.similarityMax ?? ''} onChange={(e) => setGate(t, { similarityMax: e.target.value })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {Object.entries(errors).filter(([k]) => k.startsWith('qualityGates.')).map(([k, v]) => <p key={k} className="text-xs text-rose-600">{k}: {v}</p>)}
      </div>

      <Field label="Official domains" error={errors.officialDomains ?? Object.entries(errors).find(([k]) => k.startsWith('officialDomains.'))?.[1]} hint="Har line me ek domain. Compliance pages ke sources inhi se hone chahiyein.">
        <textarea className={inputCls} rows={5} value={domains} onChange={(e) => setDomains(e.target.value)} />
      </Field>
      <Field label="IndexNow key" error={errors.indexNowKey} hint="8-128 huroof (a-z, A-Z, 0-9, -)">
        <input className={inputCls} value={indexNowKey} onChange={(e) => setIndexNowKey(e.target.value)} />
      </Field>
    </SettingSection>
  );
}

// ─── Analytics ───

export function AnalyticsSettingsTab({ value }: { value: AnalyticsSettings | null }) {
  const v = value ?? DEFAULT_ANALYTICS_SETTINGS;
  const [gtmId, setGtmId] = useState(v.gtmId ?? '');
  const [clarityId, setClarityId] = useState(v.clarityId ?? '');
  const [samplePct, setSamplePct] = useState(String(Math.round(v.claritySample * 100)));
  const [allowPlatformStats, setAllow] = useState(v.allowPlatformStats);
  const [errors, setErrors] = useState<FieldErrors>({});

  const build = (): unknown => ({
    gtmId: opt(gtmId),
    clarityId: opt(clarityId),
    claritySample: Number(samplePct) / 100,
    allowPlatformStats,
  });

  return (
    <SettingSection settingKey="analytics" title="Analytics" description="Website par lagne wale tracking tools. Visitors ki consent ke baad hi chalte hain." buildValue={build} onErrors={setErrors}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="GTM ID" error={errors.gtmId} hint="GTM-XXXXXXX"><input className={inputCls} value={gtmId} onChange={(e) => setGtmId(e.target.value)} /></Field>
        <Field label="Clarity ID" error={errors.clarityId}><input className={inputCls} value={clarityId} onChange={(e) => setClarityId(e.target.value)} /></Field>
        <Field label="Clarity sample (%)" error={errors.claritySample} hint="Kitne fisad visits record hon"><input type="number" min={0} max={100} className={inputCls} value={samplePct} onChange={(e) => setSamplePct(e.target.value)} /></Field>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <Toggle checked={allowPlatformStats} onChange={setAllow} label="Platform ke asal numbers site par dikhane ki ijazat (misal: 30 din ke bills)" />
        <p className="mt-1 text-xs text-amber-800">Default band hai. Sirf owner ki manzoori ke baad on karein.</p>
      </div>
    </SettingSection>
  );
}

// ─── Industry groups ───

export function IndustryGroupsTab({ value }: { value: IndustryGroups | null }) {
  const [rows, setRows] = useState((value ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder).map(({ key, label }) => ({ key, label })));
  const [errors, setErrors] = useState<FieldErrors>({});
  const build = (): unknown => rows.map((r, i) => ({ key: r.key.trim(), label: r.label, sortOrder: (i + 1) * 10 }));

  return (
    <SettingSection settingKey="industry-groups" title="Industry groups" description="Industries ke groups aur unki tarteeb (mega menu aur industries page)." buildValue={build} onErrors={setErrors}>
      <RowList
        rows={rows}
        onChange={setRows}
        addLabel="Group"
        make={() => ({ key: '', label: '' })}
        empty="Koi group nahi."
        render={(row, setRow, i) => (
          <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
            <div>
              <input className={inputCls} placeholder="key (retail)" value={row.key} onChange={(e) => setRow({ key: e.target.value.toLowerCase() })} />
              {errors[`${i}.key`] && <p className="text-xs text-rose-600">{errors[`${i}.key`]}</p>}
            </div>
            <div>
              <input className={inputCls} placeholder="Label (Retail & Grocery)" value={row.label} onChange={(e) => setRow({ label: e.target.value })} />
              {errors[`${i}.label`] && <p className="text-xs text-rose-600">{errors[`${i}.label`]}</p>}
            </div>
          </div>
        )}
      />
    </SettingSection>
  );
}
