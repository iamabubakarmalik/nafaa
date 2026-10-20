/**
 * Settings → Entity facts: the company facts used by Organization JSON-LD,
 * llms.txt and {{fact:...}} tokens. Only real, provable facts go here.
 * The aside shows the API's rendered llms.txt and Organization JSON-LD.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import type { EntitySettings, Office } from '../contract/cms-contract';
import { errorMessage, type FieldErrors } from '../dashboard/shared/cms-http';
import { Card, EntryRefSelect, Field, Toggle, btn, inputCls } from '../dashboard/shared/ui';
import { settingsApi } from './settings.api';
import { RowList, SettingSection, opt, splitLines, splitList } from './SettingSection';

/** Owner-approved wording (ARCH 1). The evidence reference must still be filled in. */
const FBR_PRA_TEXT = 'FBR & PRA approved POS integrator';

interface ComplianceRow { key: string; text: string; evidenceRef: string }

export function EntitySettingsTab({ value }: { value: EntitySettings | null }) {
  const [s, setS] = useState({
    brandName: value?.brandName ?? 'Nafaa',
    legalName: value?.legalName ?? '',
    disambiguatingDescription: value?.disambiguatingDescription ?? '',
    description: value?.description ?? '',
    foundingDate: value?.foundingDate ?? '',
    founderIds: value?.founderIds ?? [],
    offices: value?.offices ?? [],
    email: value?.contact?.email ?? '',
    phone: value?.contact?.phone ?? '',
    compliance: Object.entries(value?.compliance ?? {}).map<ComplianceRow>(([key, v]) => ({ key, ...v })),
    platforms: (value?.platforms ?? []).join(', '),
    languages: (value?.languages ?? []).join(', '),
    sameAs: (value?.sameAs ?? []).join('\n'),
    wikidataId: value?.wikidataId ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (p: Partial<typeof s>) => setS({ ...s, ...p });

  const build = (): unknown => ({
    brandName: s.brandName,
    legalName: opt(s.legalName),
    disambiguatingDescription: s.disambiguatingDescription,
    description: s.description,
    foundingDate: opt(s.foundingDate),
    founderIds: s.founderIds.filter(Boolean),
    offices: s.offices.map((o) => ({ ...o, postalCode: opt(o.postalCode), phone: opt(o.phone) })),
    contact: { email: opt(s.email), phone: opt(s.phone) },
    compliance: Object.fromEntries(s.compliance.filter((c) => c.key.trim()).map((c) => [c.key.trim(), { text: c.text, evidenceRef: c.evidenceRef }])),
    platforms: splitList(s.platforms),
    languages: splitList(s.languages),
    sameAs: splitLines(s.sameAs),
    wikidataId: opt(s.wikidataId),
  });

  const hasFbrPra = s.compliance.some((c) => c.key === 'fbrPra');

  return (
    <SettingSection
      settingKey="entity"
      title="Entity facts"
      description="Company ke sachay facts. Google, AI search aur schema yahin se parhte hain. Jo baat sabit na ho, khali chhorein."
      buildValue={build}
      onErrors={setErrors}
      aside={<LlmsPreview />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand naam" required error={errors.brandName}><input className={inputCls} value={s.brandName} onChange={(e) => set({ brandName: e.target.value })} /></Field>
        <Field label="Legal naam" error={errors.legalName} hint="Registered company ka naam"><input className={inputCls} value={s.legalName} onChange={(e) => set({ legalName: e.target.value })} /></Field>
      </div>
      <Field label="Pehchan (disambiguation)" required error={errors.disambiguatingDescription} hint='Misal: "Nafaa (nafaa.pk), Pakistani POS and business software; not NAFA Funds"'>
        <input className={inputCls} value={s.disambiguatingDescription} maxLength={300} onChange={(e) => set({ disambiguatingDescription: e.target.value })} />
      </Field>
      <Field label="Description" required error={errors.description}>
        <textarea className={inputCls} rows={3} maxLength={1000} value={s.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Founding date" error={errors.foundingDate} hint="YYYY, YYYY-MM ya YYYY-MM-DD"><input className={inputCls} value={s.foundingDate} onChange={(e) => set({ foundingDate: e.target.value })} /></Field>
        <Field label="Email" error={errors['contact.email']}><input className={inputCls} value={s.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Phone" error={errors['contact.phone']}><input className={inputCls} value={s.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Founders (Person pages)</h3>
        <RowList<string>
          rows={s.founderIds}
          onChange={(founderIds) => set({ founderIds })}
          addLabel="Founder"
          make={() => ''}
          empty="Koi founder nahi chuna."
          render={(id, _set, i) => (
            <EntryRefSelect
              value={id || null}
              types={['PERSON']}
              placeholder="Person page dhoondein…"
              onChange={(next) => set({ founderIds: s.founderIds.map((x, k) => (k === i ? next ?? '' : x)) })}
            />
          )}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Offices</h3>
        <p className="mb-2 text-xs text-neutral-500">Sirf asal daftar. Ghar ka pata ya farzi pata mat daalein.</p>
        <RowList<Office>
          rows={s.offices}
          onChange={(offices) => set({ offices })}
          addLabel="Office"
          make={() => ({ label: '', street: '', city: '', region: '', country: 'PK', isHq: false })}
          render={(o, setO, i) => (
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inputCls} placeholder="Label (misal: Lahore office)" value={o.label} onChange={(e) => setO({ label: e.target.value })} />
              <input className={inputCls} placeholder="Street" value={o.street} onChange={(e) => setO({ street: e.target.value })} />
              <input className={inputCls} placeholder="City" value={o.city} onChange={(e) => setO({ city: e.target.value })} />
              <input className={inputCls} placeholder="Province" value={o.region} onChange={(e) => setO({ region: e.target.value })} />
              <input className={inputCls} placeholder="Postal code" value={o.postalCode ?? ''} onChange={(e) => setO({ postalCode: e.target.value })} />
              <input className={inputCls} placeholder="Phone" value={o.phone ?? ''} onChange={(e) => setO({ phone: e.target.value })} />
              <Toggle checked={o.isHq} onChange={(v) => setO({ isHq: v })} label="Head office" />
              {Object.entries(errors).filter(([k]) => k.startsWith(`offices.${i}.`)).map(([k, v]) => <p key={k} className="text-xs text-rose-600">{k.split('.').pop()}: {v}</p>)}
            </div>
          )}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Compliance statements</h3>
          {!hasFbrPra && (
            <button type="button" className="text-xs text-emerald-700 hover:underline" onClick={() => set({ compliance: [...s.compliance, { key: 'fbrPra', text: FBR_PRA_TEXT, evidenceRef: '' }] })}>
              + FBR & PRA wording
            </button>
          )}
        </div>
        <p className="mb-2 text-xs text-neutral-500">Har statement ke sath saboot ka hawala zaroori hai (letter, licence number, ya file kahan rakhi hai). Pages par {'{{fact:compliance.<key>}}'} se lagta hai.</p>
        <RowList<ComplianceRow>
          rows={s.compliance}
          onChange={(compliance) => set({ compliance })}
          addLabel="Statement"
          make={() => ({ key: '', text: '', evidenceRef: '' })}
          render={(c, setC) => (
            <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
              <input className={inputCls} placeholder="key (fbrPra)" value={c.key} onChange={(e) => setC({ key: e.target.value })} />
              <input className={inputCls} placeholder="Statement" value={c.text} onChange={(e) => setC({ text: e.target.value })} />
              <span className="text-xs text-neutral-500 sm:pt-2">Saboot</span>
              <input className={inputCls} placeholder="Saboot ka hawala (zaroori)" value={c.evidenceRef} onChange={(e) => setC({ evidenceRef: e.target.value })} />
              {errors[`compliance.${c.key}.evidenceRef`] && <p className="text-xs text-rose-600 sm:col-span-2">{errors[`compliance.${c.key}.evidenceRef`]}</p>}
            </div>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Platforms" error={errors.platforms} hint="Comma se alag: Web, Android, Windows"><input className={inputCls} value={s.platforms} onChange={(e) => set({ platforms: e.target.value })} /></Field>
        <Field label="Zabanein" error={errors.languages} hint="Comma se alag: English, Urdu"><input className={inputCls} value={s.languages} onChange={(e) => set({ languages: e.target.value })} /></Field>
      </div>
      <Field label="sameAs links" error={errors.sameAs ?? Object.entries(errors).find(([k]) => k.startsWith('sameAs.'))?.[1]} hint="Har line me ek URL. Sirf apne asal profiles.">
        <textarea className={inputCls} rows={3} value={s.sameAs} onChange={(e) => set({ sameAs: e.target.value })} />
      </Field>
      <Field label="Wikidata ID" error={errors.wikidataId} hint="Misal: Q12345 (sirf agar mojood ho)"><input className={inputCls} value={s.wikidataId} onChange={(e) => set({ wikidataId: e.target.value })} /></Field>
    </SettingSection>
  );
}

function LlmsPreview() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ['cms-llms-preview'], queryFn: settingsApi.llmsPreview });
  return (
    <Card
      title="Preview: llms.txt + Organization"
      actions={<button className={btn.icon} onClick={() => refetch()} aria-label="Refresh"><RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button>}
    >
      {isLoading ? (
        <p className="text-sm text-neutral-500">Load ho raha hai…</p>
      ) : isError ? (
        <p className="text-sm text-neutral-500">{errorMessage(error, 'Preview nahi bana')}</p>
      ) : (
        <div className="space-y-3">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-[11px] text-neutral-700">{data?.llmsTxt}</pre>
          <pre className="max-h-80 overflow-auto rounded-lg bg-neutral-900 p-3 text-[11px] text-emerald-200">{JSON.stringify(data?.organizationJsonLd, null, 2)}</pre>
        </div>
      )}
      <p className="mt-2 text-xs text-neutral-500">Save ke baad refresh karein.</p>
    </Card>
  );
}
