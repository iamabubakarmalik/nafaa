/**
 * Settings → Pricing display. Prices, trial days, limits and which features a
 * plan includes all come from the Plan table (Admin → Plans) and are shown
 * read-only. Only display text is edited here: per-plan tagline, highlight
 * and CTA, plus the labels for the Plan feature flags.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { PLAN_FEATURE_KEYS, type PlanFeatureKey, type PricingSettings } from '../contract/cms-contract';
import { adminPlansApi } from '../../../../api/admin-plans.api';
import { formatPKRFull } from '../../../../lib/format';
import { errorMessage, type FieldErrors } from '../dashboard/shared/cms-http';
import { Chip, Field, Toggle, inputCls } from '../dashboard/shared/ui';
import { SettingSection, opt } from './SettingSection';

type PlanDisplay = PricingSettings['plans'][string];

export function PricingSettingsTab({ value }: { value: PricingSettings | null }) {
  const plans = useQuery({ queryKey: ['admin-plans'], queryFn: adminPlansApi.list });
  const [display, setDisplay] = useState<Record<string, PlanDisplay>>(value?.plans ?? {});
  const [labels, setLabels] = useState<Partial<Record<PlanFeatureKey, string>>>(value?.featureLabels ?? {});
  const [notes, setNotes] = useState(value?.notes ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});

  const setPlan = (slug: string, p: Partial<PlanDisplay>) => setDisplay({ ...display, [slug]: { ...display[slug], ...p } });

  const build = (): unknown => ({
    plans: Object.fromEntries(
      Object.entries(display).map(([slug, d]) => [
        slug,
        { tagline: opt(d.tagline), highlight: d.highlight || undefined, ctaLabel: opt(d.ctaLabel), ctaHref: opt(d.ctaHref) },
      ]),
    ),
    featureLabels: Object.fromEntries(Object.entries(labels).filter(([, v]) => v && v.trim()).map(([k, v]) => [k, v!.trim()])),
    notes: opt(notes),
  });

  const sorted = [...(plans.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <SettingSection
      settingKey="pricing"
      title="Pricing display"
      description={
        <>
          Qeematein, trial aur plan me kya shamil hai, sab <Link to="/plans" className="text-emerald-700 hover:underline">Admin → Plans</Link> se aata hai. Yahan sirf dikhane ka text badlein.
        </>
      }
      buildValue={build}
      onErrors={setErrors}
    >
      {plans.isLoading ? (
        <p className="text-sm text-neutral-500">Plans load ho rahe hain…</p>
      ) : plans.isError ? (
        <p className="text-sm text-rose-600">{errorMessage(plans.error)}</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => {
            const d = display[p.slug] ?? {};
            const free = p.priceMonthly === 0;
            return (
              <div key={p.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-neutral-900">{p.name}</span>
                  <Chip>{p.slug}</Chip>
                  <span className="text-sm text-neutral-700">{formatPKRFull(p.priceMonthly)}/mahina</span>
                  {p.trialDays > 0 && <Chip tone="blue">{p.trialDays} din trial</Chip>}
                  {!p.isActive && <Chip tone="rose">Inactive</Chip>}
                  {!p.isPublic && <Chip tone="amber">Public nahi (site par nahi dikhega)</Chip>}
                  <Link to="/plans" className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                    Plan badlein <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Tagline" error={errors[`plans.${p.slug}.tagline`]}>
                    <input className={inputCls} maxLength={120} value={d.tagline ?? ''} placeholder={free && p.trialDays > 0 ? `${p.trialDays} din Free Trial` : ''} onChange={(e) => setPlan(p.slug, { tagline: e.target.value })} />
                  </Field>
                  <Field label="Button text" error={errors[`plans.${p.slug}.ctaLabel`]}>
                    <input className={inputCls} maxLength={40} value={d.ctaLabel ?? ''} onChange={(e) => setPlan(p.slug, { ctaLabel: e.target.value })} />
                  </Field>
                  <Field label="Button link" error={errors[`plans.${p.slug}.ctaHref`]} hint="signup, demo, whatsapp, /path ya https://…">
                    <input className={inputCls} value={d.ctaHref ?? ''} onChange={(e) => setPlan(p.slug, { ctaHref: e.target.value })} />
                  </Field>
                  <div className="pt-7">
                    <Toggle checked={!!d.highlight} onChange={(v) => setPlan(p.slug, { highlight: v })} label="Highlight (sab se mashhoor)" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">Feature labels</h3>
        <p className="mb-3 text-xs text-neutral-500">Plan ke har feature ka naam jo pricing table me dikhe ga. Kaunsa plan kya deta hai, woh Plans se aata hai.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PLAN_FEATURE_KEYS.map((k) => (
            <Field key={k} label={<code className="text-xs">{k}</code>} error={errors[`featureLabels.${k}`]}>
              <input className={inputCls} maxLength={80} value={labels[k] ?? ''} onChange={(e) => setLabels({ ...labels, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
      </div>

      <Field label="Neeche note" error={errors.notes} hint="Misal: GST ki tafseel. Qeemat yahan mat likhein, {{price:…}} token istemal karein.">
        <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </SettingSection>
  );
}
