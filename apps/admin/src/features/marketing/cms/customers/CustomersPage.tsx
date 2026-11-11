/**
 * Website customers and testimonials. "Real only": a
 * customer can be shown on the site only after recorded consent (scope,
 * date, evidence), and a testimonial can be published only when its
 * customer has QUOTE consent and is public. The API enforces both; the UI
 * disables the actions and says why.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Download, Eye, Lightbulb, Plus, Quote, ShieldCheck } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import {
  CONSENT_SCOPES, createCustomerBodySchema, customerConsentBodySchema,
  type AdminCustomer, type ConsentScope, type CreateCustomerBody,
} from '../contract/cms-contract';
import { adminTenantsApi } from '../../../../api/admin-tenants.api';
import { errorMessage, formatPkt, pktDateInput, pktDateToIso, zodFieldErrors, type FieldErrors } from '../dashboard/shared/cms-http';
import { Chip, Drawer, EntryRefSelect, Field, Tabs, Toggle, btn, inputCls, useDebounced } from '../dashboard/shared/ui';
import { MediaPicker } from '../media/MediaPicker';
import { MediaThumb } from '../media/MediaBrowser';
import { customersApi } from './customers.api';
import { TestimonialsPanel } from './TestimonialsPanel';

export const SCOPE_LABELS: Record<ConsentScope, string> = {
  LOGO: 'Logo',
  NAME: 'Name',
  QUOTE: 'Quote',
  CASE_STUDY: 'Case study',
  PHOTO: 'Photo',
};

export function CustomersPage() {
  const guide = usePageGuide();
  const list = useListParams({ visible: 'ALL' });
  const { visible } = list.filters;
  const [open, setOpen] = useState<AdminCustomer | 'new' | null>(null);
  const [exporting, setExporting] = useState(false);
  const query = { q: list.debouncedSearch, public: (visible === 'ALL' ? '' : visible) as 'true' | 'false' | '' };

  const customers = useQuery({
    queryKey: ['cms-customers', query, list.page, list.limit],
    queryFn: () => customersApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  // Headline numbers for the whole directory, independent of the filters.
  const allCount = useQuery({ queryKey: ['cms-customers', 'count', 'all'], queryFn: () => customersApi.list({ limit: 1 }), staleTime: 60_000 });
  const liveCount = useQuery({ queryKey: ['cms-customers', 'count', 'public'], queryFn: () => customersApi.list({ public: 'true', limit: 1 }), staleTime: 60_000 });
  const rows = customers.data?.items ?? [];
  const total = allCount.data?.meta.total ?? 0;
  const live = liveCount.data?.meta.total ?? 0;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => customersApi.list({ ...query, page, limit: 100 }));
      downloadCsv<AdminCustomer>('website-customers', all, [
        { label: 'Name', value: (c) => c.name },
        { label: 'Website', value: (c) => c.website },
        { label: 'Consent', value: (c) => c.consentScope.join(' ') },
        { label: 'Shown on site', value: (c) => (c.isPublic ? 'Yes' : 'No') },
        { label: 'Testimonials', value: (c) => c.testimonialsCount },
      ]);
      toast.success(`${all.length} customers exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell>
      <PageHero
        title="Customers and testimonials"
        chip={customers.data ? `${customers.data.meta.total} shown` : undefined}
        busy={customers.isFetching}
        loading={allCount.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={exporting} onClick={exportCsv}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroPrimaryButton} onClick={() => setOpen('new')}><Plus className="h-4 w-4" /> New customer</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={[
          { label: 'Customers', value: total },
          { label: 'Shown on the site', value: live },
          { label: 'Hidden', value: Math.max(0, total - live), hint: 'No consent yet, or switched off' },
        ]}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search customer name" />}
        chips={visible !== 'ALL' ? <FilterChip onRemove={() => list.setFilter('visible', 'ALL')}>{visible === 'true' ? 'On the site' : 'Not on the site'}</FilterChip> : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Eye} label="On the site" value={visible} active={visible !== 'ALL'} onChange={(v) => list.setFilter('visible', v)}
          options={[{ value: 'ALL', label: 'All customers' }, { value: 'true', label: 'On the site' }, { value: 'false', label: 'Not on the site' }]} />
      </FilterBar>

      <ListCard
        loading={customers.isLoading}
        empty={customers.isError || !rows.length}
        emptyIcon={<Building2 className="h-6 w-6" />}
        emptyTitle={customers.isError ? 'Customers did not load' : 'No customers yet'}
        emptyText={customers.isError ? errorMessage(customers.error) : 'Add a customer, then record their consent before showing them on the site.'}
        page={list.page} limit={list.limit} total={customers.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="44rem">
          <THead><Tr><Th>Customer</Th><Th>Consent</Th><Th>Site</Th><Th align="right">Quotes</Th></Tr></THead>
          <TBody>
            {rows.map((c) => (
              <Tr key={c.id} interactive onClick={() => setOpen(c)}>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {c.logo ? <MediaThumb media={c.logo} className="object-contain" /> : <Building2 className="m-2 h-5 w-5 text-slate-400" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      {c.website && <p className="text-[0.75rem] text-slate-500">{c.website}</p>}
                    </div>
                  </div>
                </Td>
                <Td>
                  {c.consentScope.length ? (
                    <div className="flex flex-wrap gap-1">{c.consentScope.map((s) => <Chip key={s} tone="emerald">{SCOPE_LABELS[s]}</Chip>)}</div>
                  ) : <Chip tone="amber">No consent</Chip>}
                </Td>
                <Td>{c.isPublic ? <Chip tone="emerald">Shown</Chip> : <Chip>Hidden</Chip>}</Td>
                <Td align="right" className="tabular-nums">{c.testimonialsCount}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {open && <CustomerDrawer customer={open === 'new' ? null : open} onClose={() => setOpen(null)} onSaved={setOpen} />}

      {guide.isOpen && (
        <PageGuide
          title="Customers and testimonials"
          description="Real customers only, with written permission. Without consent nothing appears on the site."
          flowTitle="Showing a customer on the site"
          flow={[
            { label: 'Add customer', hint: 'Name, logo, city', icon: Building2, color: '#4f46e5' },
            { label: 'Record consent', hint: 'Scope, date, evidence', icon: ShieldCheck, color: '#d97706' },
            { label: 'Show on site', hint: 'Switch on', icon: Eye, color: '#0284c7' },
            { label: 'Add quotes', hint: 'Needs Quote consent', icon: Quote, color: '#059669' },
          ]}
          steps={[
            { icon: ShieldCheck, color: '#d97706', title: 'Consent first', text: 'Choose what they allowed (logo, name, quote…), the date, and where the proof is kept.' },
            { icon: Eye, color: '#0284c7', title: 'Show on the site', text: 'The switch works only after consent is recorded.' },
            { icon: Quote, color: '#059669', title: 'Testimonials', text: 'A quote can be published only when the customer allowed quotes and is shown on the site.' },
          ]}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function CustomerDrawer({ customer, onClose, onSaved }: { customer: AdminCustomer | null; onClose: () => void; onSaved: (c: AdminCustomer) => void }) {
  const [tab, setTab] = useState<'details' | 'consent' | 'quotes'>('details');
  return (
    <Drawer open onClose={onClose} title={customer?.name ?? 'New customer'}>
      {customer && (
        <Tabs
          tabs={[{ key: 'details', label: 'Details' }, { key: 'consent', label: 'Consent' }, { key: 'quotes', label: `Testimonials (${customer.testimonialsCount})` }] as const}
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
    onSuccess: (c) => { toast.success('Customer saved'); qc.invalidateQueries({ queryKey: ['cms-customers'] }); onSaved(c); },
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
      <Field label="Business name" required error={errors.name}><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Slug" error={errors.slug} hint="Leave empty to build it from the name"><input className={inputCls} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
      <Field label="Logo" error={errors.logoId}><MediaPicker value={f.logoId} media={customer?.logo} kinds={['LOGO']} onChange={(id) => setF({ ...f, logoId: id })} /></Field>
      <Field label="City (city page)" error={errors.cityEntryId}><EntryRefSelect value={f.cityEntryId} types={['CITY']} placeholder="Search for a city…" onChange={(id) => setF({ ...f, cityEntryId: id })} /></Field>
      <Field label="Industry" error={errors.industryEntryId}><EntryRefSelect value={f.industryEntryId} types={['INDUSTRY']} placeholder="Search for an industry…" onChange={(id) => setF({ ...f, industryEntryId: id })} /></Field>
      <Field label="Website" error={errors.website}><input className={inputCls} value={f.website} placeholder="https://…" onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
      <Field label="Nafaa shop" error={errors.tenantId} hint="If this customer uses the Nafaa app"><TenantSelect value={f.tenantId} onChange={(id) => setF({ ...f, tenantId: id })} /></Field>
      <Field label="Notes (admins only)" error={errors.notes}><textarea className={inputCls} rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <div className="flex justify-end">
        <button className={btn.primary} disabled={save.isPending} onClick={onSave}>{save.isPending ? 'Saving…' : 'Save'}</button>
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
      <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
        <code className="text-xs">{value}</code>
        <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => onChange(null)}>Remove</button>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <input className={inputCls} value={q} placeholder="Shop name (2+ letters)…" onChange={(e) => setQ(e.target.value)} />
      {dq.length >= 2 && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
          {data?.items.length ? (
            data.items.map((t) => (
              <button key={t.id} type="button" className="flex w-full justify-between px-3 py-1.5 text-left text-sm hover:bg-brand-50" onClick={() => { onChange(t.id); setQ(''); }}>
                <span>{t.name}</span>
                <span className="text-xs text-slate-500">{t.slug}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-1.5 text-xs text-slate-500">Nothing found</p>
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
    onSuccess: (c) => { setErrors({}); toast.success('Consent recorded'); done(c); },
    onError: (e: unknown) => {
      const fe = (e as { fieldErrors?: FieldErrors }).fieldErrors;
      if (fe) return setErrors(fe);
      toast.error(errorMessage(e));
    },
  });
  const visibility = useMutation({
    mutationFn: (isPublic: boolean) => customersApi.visibility(customer.id, isPublic),
    onSuccess: (c) => { toast.success(c.isPublic ? 'Now shown on the site' : 'Removed from the site'); done(c); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => customersApi.remove(customer.id),
    onSuccess: () => { toast.success('Customer deleted'); qc.invalidateQueries({ queryKey: ['cms-customers'] }); onDeleted(); },
    onError: (e) => toast.error(errorMessage(e, 'This customer is used in a live case study')),
  });

  const hasConsent = customer.consentScope.length > 0 && !!customer.consentAt;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-50 p-3 text-sm">
        {hasConsent ? (
          <p className="flex items-start gap-2 text-slate-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-brand-600" />
            <span>
              Consent given on {formatPkt(customer.consentAt, false)}. Verified: {formatPkt(customer.verifiedAt)}
              {customer.verifiedById && <span className="text-slate-500"> ({customer.verifiedById})</span>}
            </span>
          </p>
        ) : (
          <p className="text-amber-800">No consent recorded yet. This customer's name, logo or quote cannot appear on the site.</p>
        )}
      </div>

      <Field label="What they allowed" required error={errors.scope}>
        <div className="flex flex-wrap gap-4 pt-1">
          {CONSENT_SCOPES.map((s) => (
            <Toggle key={s} label={SCOPE_LABELS[s]} checked={scope.includes(s)} onChange={(on) => setScope(on ? [...scope, s] : scope.filter((x) => x !== s))} />
          ))}
        </div>
      </Field>
      <Field label="Consent date" required error={errors.consentAt}><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Evidence" required error={errors.evidence} hint="How consent was given and where the proof is kept (for example: WhatsApp message 12 Oct, screenshot in Drive)">
        <textarea className={inputCls} rows={3} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <button className={btn.primary} disabled={consent.isPending} onClick={() => consent.mutate()}>Save consent</button>
      </div>

      <div className="rounded-xl border border-slate-200 p-3">
        <Toggle
          checked={customer.isPublic}
          disabled={!hasConsent || visibility.isPending}
          onChange={(v) => visibility.mutate(v)}
          label="Show on the site"
        />
        {!hasConsent && <p className="mt-1 text-xs text-slate-500">Record consent first.</p>}
      </div>

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button className={btn.danger} disabled={remove.isPending} onClick={async () => (await confirmDialog({ title: 'Delete this customer and their testimonials?', yes: 'Delete', danger: true })) && remove.mutate()}>Delete customer</button>
      </div>
    </div>
  );
}
