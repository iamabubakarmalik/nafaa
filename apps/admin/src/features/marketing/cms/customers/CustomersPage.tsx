/**
 * Website → Customers & testimonials (ARCH 13 screen 6). "Real only": a
 * customer can be shown on the site only after recorded consent (scope,
 * date, evidence), and a testimonial can be published only when its
 * customer has QUOTE consent and is public. The API enforces both; the UI
 * disables the actions and says why.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Plus, ShieldCheck } from 'lucide-react';
import {
  CONSENT_SCOPES, createCustomerBodySchema, customerConsentBodySchema,
  type AdminCustomer, type ConsentScope, type CreateCustomerBody,
} from '../contract/cms-contract';
import { adminTenantsApi } from '../../../../api/admin-tenants.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { DataTable } from '../../_shared/components/DataTable';
import { errorMessage, formatPkt, pktDateInput, pktDateToIso, zodFieldErrors, type FieldErrors } from '../dashboard/shared/cms-http';
import { Chip, Drawer, EntryRefSelect, Field, Pager, SearchInput, Tabs, Toggle, Toolbar, btn, inputCls, selectCls, useDebounced } from '../dashboard/shared/ui';
import { MediaPicker } from '../media/MediaPicker';
import { MediaThumb } from '../media/MediaBrowser';
import { customersApi } from './customers.api';
import { TestimonialsPanel } from './TestimonialsPanel';

export const SCOPE_LABELS: Record<ConsentScope, string> = {
  LOGO: 'Logo',
  NAME: 'Naam',
  QUOTE: 'Quote',
  CASE_STUDY: 'Case study',
  PHOTO: 'Photo',
};

export function CustomersPage() {
  const [q, setQ] = useState('');
  const [isPublic, setIsPublic] = useState<'true' | 'false' | ''>('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AdminCustomer | 'new' | null>(null);
  const dq = useDebounced(q);

  const list = useQuery({
    queryKey: ['cms-customers', { dq, isPublic, page }],
    queryFn: () => customersApi.list({ q: dq, public: isPublic, page, limit: 30 }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers & testimonials"
        subtitle="Sirf asal customers, likhit ijazat ke sath. Ijazat ke baghair site par kuch nahi dikhta."
        actions={<button className={btn.primary} onClick={() => setOpen('new')}><Plus className="h-4 w-4" /> Naya customer</button>}
      />
      <Toolbar>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Naam dhoondein…" />
        <select className={selectCls} value={isPublic} onChange={(e) => { setIsPublic(e.target.value as 'true' | 'false' | ''); setPage(1); }}>
          <option value="">Sab</option>
          <option value="true">Site par</option>
          <option value="false">Site par nahi</option>
        </select>
      </Toolbar>
      <DataTable<AdminCustomer>
        loading={list.isLoading}
        data={list.data?.items ?? []}
        keyExtractor={(c) => c.id}
        onRowClick={setOpen}
        empty={<div className="p-8 text-center text-sm text-neutral-500">{list.isError ? errorMessage(list.error) : 'Abhi koi customer nahi.'}</div>}
        columns={[
          {
            key: 'name',
            header: 'Customer',
            render: (c) => (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {c.logo ? <MediaThumb media={c.logo} className="object-contain" /> : <Building2 className="m-2 h-5 w-5 text-neutral-400" />}
                </div>
                <div>
                  <p className="font-medium text-neutral-900">{c.name}</p>
                  {c.website && <p className="text-xs text-neutral-500">{c.website}</p>}
                </div>
              </div>
            ),
          },
          {
            key: 'consent',
            header: 'Ijazat',
            render: (c) =>
              c.consentScope.length ? (
                <div className="flex flex-wrap gap-1">{c.consentScope.map((s) => <Chip key={s} tone="emerald">{SCOPE_LABELS[s]}</Chip>)}</div>
              ) : (
                <Chip tone="amber">Ijazat nahi</Chip>
              ),
          },
          { key: 'isPublic', header: 'Site', render: (c) => (c.isPublic ? <Chip tone="emerald">Dikh raha hai</Chip> : <Chip>Chhupa</Chip>) },
          { key: 'testimonialsCount', header: 'Quotes', render: (c) => <span className="text-xs">{c.testimonialsCount}</span> },
        ]}
      />
      <Pager meta={list.data?.meta} onPage={setPage} />
      {open && <CustomerDrawer customer={open === 'new' ? null : open} onClose={() => setOpen(null)} onSaved={setOpen} />}
    </div>
  );
}

function CustomerDrawer({ customer, onClose, onSaved }: { customer: AdminCustomer | null; onClose: () => void; onSaved: (c: AdminCustomer) => void }) {
  const [tab, setTab] = useState<'details' | 'consent' | 'quotes'>('details');
  return (
    <Drawer open onClose={onClose} title={customer?.name ?? 'Naya customer'}>
      {customer && (
        <Tabs
          tabs={[{ key: 'details', label: 'Details' }, { key: 'consent', label: 'Ijazat' }, { key: 'quotes', label: `Testimonials (${customer.testimonialsCount})` }] as const}
          value={tab}
          onChange={setTab}
        />
      )}
      {(!customer || tab === 'details') && <CustomerDetails customer={customer} onSaved={onSaved} />}
      {customer && tab === 'consent' && <ConsentPanel customer={customer} onSaved={onSaved} onDeleted={onClose} />}
      {customer && tab === 'quotes' && <TestimonialsPanel customer={customer} />}
    </Drawer>
  );
}

function CustomerDetails({ customer, onSaved }: { customer: AdminCustomer | null; onSaved: (c: AdminCustomer) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: '', slug: '', logoId: null as string | null, cityEntryId: null as string | null, industryEntryId: null as string | null,
    website: '', tenantId: null as string | null, notes: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setF({
      name: customer?.name ?? '',
      slug: customer?.slug ?? '',
      logoId: customer?.logoId ?? null,
      cityEntryId: customer?.cityEntryId ?? null,
      industryEntryId: customer?.industryEntryId ?? null,
      website: customer?.website ?? '',
      tenantId: customer?.tenantId ?? null,
      notes: customer?.notes ?? '',
    });
  }, [customer?.id]);

  const save = useMutation({
    mutationFn: (body: CreateCustomerBody) => (customer ? customersApi.update(customer.id, body) : customersApi.create(body)),
    onSuccess: (c) => { toast.success('Customer save ho gaya'); qc.invalidateQueries({ queryKey: ['cms-customers'] }); onSaved(c); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const onSave = () => {
    const parsed = createCustomerBodySchema.safeParse({
      name: f.name,
      slug: f.slug.trim() || undefined,
      logoId: f.logoId,
      cityEntryId: f.cityEntryId,
      industryEntryId: f.industryEntryId,
      website: f.website.trim() || null,
      tenantId: f.tenantId,
      notes: f.notes.trim() || null,
    });
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error));
    setErrors({});
    save.mutate(parsed.data);
  };

  return (
    <div className="space-y-4">
      <Field label="Business ka naam" required error={errors.name}><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Slug" error={errors.slug} hint="Khali ho to naam se ban jaye ga"><input className={inputCls} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
      <Field label="Logo" error={errors.logoId}><MediaPicker value={f.logoId} media={customer?.logo} kinds={['LOGO']} onChange={(id) => setF({ ...f, logoId: id })} /></Field>
      <Field label="Shehar (City page)" error={errors.cityEntryId}><EntryRefSelect value={f.cityEntryId} types={['CITY']} placeholder="Shehar dhoondein…" onChange={(id) => setF({ ...f, cityEntryId: id })} /></Field>
      <Field label="Industry" error={errors.industryEntryId}><EntryRefSelect value={f.industryEntryId} types={['INDUSTRY']} placeholder="Industry dhoondein…" onChange={(id) => setF({ ...f, industryEntryId: id })} /></Field>
      <Field label="Website" error={errors.website}><input className={inputCls} value={f.website} placeholder="https://…" onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
      <Field label="Nafaa app ki dukaan (tenant)" error={errors.tenantId} hint="Agar ye customer app istemal karta hai"><TenantSelect value={f.tenantId} onChange={(id) => setF({ ...f, tenantId: id })} /></Field>
      <Field label="Notes (sirf admin)" error={errors.notes}><textarea className={inputCls} rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <div className="flex justify-end">
        <button className={btn.primary} disabled={save.isPending} onClick={onSave}>{save.isPending ? 'Save ho raha hai…' : 'Save'}</button>
      </div>
    </div>
  );
}

function TenantSelect({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data } = useQuery({ queryKey: ['cms-tenant-search', dq], queryFn: () => adminTenantsApi.list({ search: dq, limit: 8 }), enabled: dq.length >= 2 });
  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm">
        <code className="text-xs">{value}</code>
        <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => onChange(null)}>Hatayein</button>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <input className={inputCls} value={q} placeholder="Dukaan ka naam (2+ huroof)…" onChange={(e) => setQ(e.target.value)} />
      {dq.length >= 2 && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200">
          {data?.items.length ? (
            data.items.map((t) => (
              <button key={t.id} type="button" className="flex w-full justify-between px-3 py-1.5 text-left text-sm hover:bg-emerald-50" onClick={() => { onChange(t.id); setQ(''); }}>
                <span>{t.name}</span>
                <span className="text-xs text-neutral-500">{t.slug}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-1.5 text-xs text-neutral-500">Kuch nahi mila</p>
          )}
        </div>
      )}
    </div>
  );
}

function ConsentPanel({ customer, onSaved, onDeleted }: { customer: AdminCustomer; onSaved: (c: AdminCustomer) => void; onDeleted: () => void }) {
  const qc = useQueryClient();
  const [scope, setScope] = useState<ConsentScope[]>(customer.consentScope);
  const [date, setDate] = useState(pktDateInput(customer.consentAt));
  const [evidence, setEvidence] = useState(customer.consentEvidence ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});

  const done = (c: AdminCustomer) => {
    qc.invalidateQueries({ queryKey: ['cms-customers'] });
    qc.invalidateQueries({ queryKey: ['cms-testimonials'] });
    onSaved(c);
  };

  const consent = useMutation({
    mutationFn: () => {
      const parsed = customerConsentBodySchema.safeParse({ scope, consentAt: date ? pktDateToIso(date) : '', evidence });
      if (!parsed.success) throw { fieldErrors: zodFieldErrors(parsed.error) };
      return customersApi.consent(customer.id, parsed.data);
    },
    onSuccess: (c) => { setErrors({}); toast.success('Ijazat record ho gayi'); done(c); },
    onError: (e: unknown) => {
      const fe = (e as { fieldErrors?: FieldErrors }).fieldErrors;
      if (fe) return setErrors(fe);
      toast.error(errorMessage(e));
    },
  });
  const visibility = useMutation({
    mutationFn: (isPublic: boolean) => customersApi.visibility(customer.id, isPublic),
    onSuccess: (c) => { toast.success(c.isPublic ? 'Ab site par dikhe ga' : 'Site se hata diya'); done(c); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => customersApi.remove(customer.id),
    onSuccess: () => { toast.success('Customer delete ho gaya'); qc.invalidateQueries({ queryKey: ['cms-customers'] }); onDeleted(); },
    onError: (e) => toast.error(errorMessage(e, 'Ye customer kisi live case study me hai')),
  });

  const hasConsent = customer.consentScope.length > 0 && !!customer.consentAt;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-neutral-50 p-3 text-sm">
        {hasConsent ? (
          <p className="flex items-start gap-2 text-neutral-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
            <span>
              Ijazat {formatPkt(customer.consentAt, false)} ko mili. Verify: {formatPkt(customer.verifiedAt)}
              {customer.verifiedById && <span className="text-neutral-500"> ({customer.verifiedById})</span>}
            </span>
          </p>
        ) : (
          <p className="text-amber-800">Abhi ijazat record nahi. Is customer ka naam, logo ya quote site par nahi aa sakta.</p>
        )}
      </div>

      <Field label="Kis cheez ki ijazat hai" required error={errors.scope}>
        <div className="flex flex-wrap gap-4 pt-1">
          {CONSENT_SCOPES.map((s) => (
            <Toggle key={s} label={SCOPE_LABELS[s]} checked={scope.includes(s)} onChange={(on) => setScope(on ? [...scope, s] : scope.filter((x) => x !== s))} />
          ))}
        </div>
      </Field>
      <Field label="Ijazat ki tareekh" required error={errors.consentAt}><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Saboot" required error={errors.evidence} hint="Ijazat kaise mili aur saboot kahan rakha hai (misal: WhatsApp message 12 Oct, screenshot Drive me)">
        <textarea className={inputCls} rows={3} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <button className={btn.primary} disabled={consent.isPending} onClick={() => consent.mutate()}>Ijazat save karein</button>
      </div>

      <div className="rounded-xl border border-neutral-200 p-3">
        <Toggle
          checked={customer.isPublic}
          disabled={!hasConsent || visibility.isPending}
          onChange={(v) => visibility.mutate(v)}
          label="Site par dikhayein"
        />
        {!hasConsent && <p className="mt-1 text-xs text-neutral-500">Pehle ijazat record karein.</p>}
      </div>

      <div className="flex justify-end border-t border-neutral-100 pt-4">
        <button className={btn.danger} disabled={remove.isPending} onClick={() => confirm('Ye customer aur iske testimonials delete karein?') && remove.mutate()}>Customer delete</button>
      </div>
    </div>
  );
}
