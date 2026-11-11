/**
 * Settings → Site: name, URLs, signup/demo links, WhatsApp, logo, default
 * OG image and social links (only "verified" links reach the site).
 */
import { useState } from 'react';
import { KNOWN_LOCALES, SOCIAL_NETWORKS, type SiteSettings } from '../contract/cms-contract';
import type { FieldErrors } from '../dashboard/shared/cms-http';
import { Field, Toggle, inputCls, selectCls } from '../dashboard/shared/ui';
import { MediaPicker } from '../media/MediaPicker';
import { RowList, SettingSection, opt } from './SettingSection';

type Social = SiteSettings['social'][number];

export function SiteSettingsTab({ value }: { value: SiteSettings | null }) {
  const [s, setS] = useState({
    name: value?.name ?? 'Nafaa',
    baseUrl: value?.baseUrl ?? 'https://nafaa.pk',
    appUrl: value?.appUrl ?? '',
    signupUrl: value?.signupUrl ?? '',
    demoPath: value?.demoPath ?? '/demo',
    locales: value?.locales ?? ['en'],
    waOn: !!value?.whatsapp,
    waNumber: value?.whatsapp?.number ?? '',
    waMessage: value?.whatsapp?.message ?? '',
    logoMediaId: value?.logoMediaId ?? null,
    defaultOgMediaId: value?.defaultOgMediaId ?? null,
    social: value?.social ?? [],
    footerNote: value?.footerNote ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (p: Partial<typeof s>) => setS({ ...s, ...p });

  const build = (): unknown => ({
    name: s.name,
    baseUrl: s.baseUrl.trim(),
    appUrl: s.appUrl.trim(),
    signupUrl: s.signupUrl.trim(),
    demoPath: s.demoPath.trim(),
    locales: s.locales,
    whatsapp: s.waOn ? { number: s.waNumber.replace(/\D/g, ''), message: s.waMessage } : null,
    logoMediaId: s.logoMediaId ?? undefined,
    defaultOgMediaId: s.defaultOgMediaId ?? undefined,
    social: s.social.map((x) => ({ ...x, url: x.url.trim() })),
    footerNote: opt(s.footerNote),
  });

  return (
    <SettingSection settingKey="site" title="Site" description="The site name, links and contact. The signup and demo buttons link from here." buildValue={build} onErrors={setErrors}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Naam" required error={errors.name}><input className={inputCls} value={s.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Website URL" required error={errors.baseUrl}><input className={inputCls} value={s.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} /></Field>
        <Field label="App URL" required error={errors.appUrl} hint="Where shop owners sign in"><input className={inputCls} value={s.appUrl} placeholder="https://…" onChange={(e) => set({ appUrl: e.target.value })} /></Field>
        <Field label="Signup URL" required error={errors.signupUrl}><input className={inputCls} value={s.signupUrl} placeholder="https://…" onChange={(e) => set({ signupUrl: e.target.value })} /></Field>
        <Field label="Demo page path" required error={errors.demoPath}><input className={inputCls} value={s.demoPath} onChange={(e) => set({ demoPath: e.target.value })} /></Field>
        <Field label="Languages" error={errors.locales} hint="Urdu (ur) pages will come later">
          <div className="flex gap-4 pt-2">
            {KNOWN_LOCALES.map((l) => (
              <Toggle
                key={l}
                label={l === 'en' ? 'English (en)' : 'Urdu (ur)'}
                checked={s.locales.includes(l)}
                disabled={l === 'en'}
                onChange={(on) => set({ locales: on ? [...s.locales, l] : s.locales.filter((x) => x !== l) })}
              />
            ))}
          </div>
        </Field>
      </div>

      <div className="rounded-xl border border-slate-200 p-3">
        <Toggle checked={s.waOn} onChange={(v) => set({ waOn: v })} label="Show the WhatsApp button" />
        {s.waOn && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="WhatsApp number" required error={errors['whatsapp.number']} hint="Digits only, with the country code (92…)"><input className={inputCls} value={s.waNumber} onChange={(e) => set({ waNumber: e.target.value })} /></Field>
            <Field label="First message" error={errors['whatsapp.message']}><input className={inputCls} value={s.waMessage} onChange={(e) => set({ waMessage: e.target.value })} /></Field>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Logo" error={errors.logoMediaId}><MediaPicker value={s.logoMediaId} kinds={['LOGO']} onChange={(id) => set({ logoMediaId: id })} /></Field>
        <Field label="Default share image (OG)" error={errors.defaultOgMediaId} hint="1200×630 works best"><MediaPicker value={s.defaultOgMediaId} onChange={(id) => set({ defaultOgMediaId: id })} /></Field>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Social links</h3>
        <p className="mb-2 text-xs text-slate-500">Mark a link "verified" only after opening it yourself. Only verified links go to the site and schema.</p>
        <RowList<Social>
          rows={s.social}
          onChange={(social) => set({ social })}
          addLabel="Link"
          make={() => ({ network: 'facebook', url: '', verified: false })}
          render={(row, setRow, i) => (
            <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
              <select className={selectCls} value={row.network} onChange={(e) => setRow({ network: e.target.value as Social['network'] })}>
                {SOCIAL_NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <div>
                <input className={inputCls} value={row.url} placeholder="https://…" onChange={(e) => setRow({ url: e.target.value })} />
                {errors[`social.${i}.url`] && <p className="text-xs text-rose-600">{errors[`social.${i}.url`]}</p>}
              </div>
              <Toggle checked={row.verified} onChange={(v) => setRow({ verified: v })} label="Verified" />
            </div>
          )}
        />
      </div>

      <Field label="Footer note" error={errors.footerNote}><input className={inputCls} value={s.footerNote} maxLength={300} onChange={(e) => set({ footerNote: e.target.value })} /></Field>
    </SettingSection>
  );
}
