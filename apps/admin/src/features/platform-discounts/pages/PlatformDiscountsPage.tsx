/**
 * Promo codes: platform-wide discount codes shops can use when they pay for
 * a plan. Create, edit, switch on or off, and delete. The list is searched,
 * filtered and paged on the server.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgePercent, CalendarClock, Edit, Lightbulb, Plus, Receipt, Tag, Ticket, Trash2, Users } from 'lucide-react';
import {
  Badge, Button, FilterBar, FilterChip, FilterMenu, Input, Modal, PageHero, PageShell, SearchField, Segmented, Switch, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminPlatformDiscountsApi, type PlatformDiscount, type UpsertPlatformDiscountPayload } from '@/api/admin-platform-discounts.api';
import { formatDate, formatPKR } from '@/lib/format';
import { ListCard, StatusBadge, useListParams } from '@/ui';

const num = (n: number) => n.toLocaleString('en-PK');
const BLANK: UpsertPlatformDiscountPayload = { code: '', description: '', type: 'PERCENTAGE', value: 0, scope: 'ANY', minPurchase: 0, isActive: true };
const STATUS = [{ value: 'ALL', label: 'All codes' }, { value: 'active', label: 'Active' }, { value: 'off', label: 'Switched off' }, { value: 'expired', label: 'Expired' }];

const isExpired = (d: PlatformDiscount) => !!d.validUntil && new Date(d.validUntil).getTime() < Date.now();

export default function PlatformDiscountsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const list = useListParams({ status: 'ALL' }, { limit: 25 });
  const { status } = list.filters;
  const [form, setForm] = useState<UpsertPlatformDiscountPayload | null>(null);
  const [editing, setEditing] = useState<PlatformDiscount | null>(null);

  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : status };
  const codes = useQuery({
    queryKey: ['admin', 'promo-codes', query, list.page, list.limit],
    queryFn: () => adminPlatformDiscountsApi.listPaged({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'promo-codes', 'stats'], queryFn: adminPlatformDiscountsApi.stats, staleTime: 30_000 });
  const s = stats.data;
  const rows = codes.data?.items ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Something went wrong');
  const toggle = useMutation({ mutationFn: (d: PlatformDiscount) => adminPlatformDiscountsApi.update(d.id, { isActive: !d.isActive }), onSuccess: refresh, onError: fail });
  const remove = useMutation({ mutationFn: adminPlatformDiscountsApi.remove, onSuccess: () => { toast.success('Code deleted'); refresh(); }, onError: fail });

  const openNew = () => { setEditing(null); setForm({ ...BLANK }); };
  const openEdit = (d: PlatformDiscount) => {
    setEditing(d);
    setForm({
      code: d.code, description: d.description ?? '', type: d.type, value: d.value, scope: d.scope, minPurchase: d.minPurchase,
      maxDiscount: d.maxDiscount ?? undefined, usageLimit: d.usageLimit ?? undefined, perTenantLimit: d.perTenantLimit ?? undefined,
      validFrom: d.validFrom ?? undefined, validUntil: d.validUntil ?? undefined, isActive: d.isActive,
    });
  };
  const onDelete = async (d: PlatformDiscount) => {
    if (await confirmDialog({ title: `Delete ${d.code}?`, text: 'Shops can no longer use this code.', yes: 'Delete', danger: true })) remove.mutate(d.id);
  };

  const chips = status !== 'ALL' ? [<FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{STATUS.find((o) => o.value === status)?.label}</FilterChip>] : [];

  return (
    <PageShell>
      <PageHero
        title="Promo codes"
        chip={s ? `${num(s.total)} codes` : undefined}
        busy={codes.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroPrimaryButton} onClick={openNew}><Plus className="h-4 w-4" /> New code</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Active codes', value: num(s.active), hint: `of ${num(s.total)}` },
          { label: 'Times used', value: num(s.totalUses) },
          { label: 'Expired', value: num(s.expired) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search code or description" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Show" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)} align="right" options={STATUS} />
      </FilterBar>

      <ListCard
        loading={codes.isLoading}
        empty={!rows.length}
        emptyIcon={<Ticket className="h-6 w-6" />}
        emptyTitle="No promo codes"
        emptyText="Create a code to give shops a discount on their plan."
        emptyAction={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>New code</Button>}
        page={list.page} limit={list.limit} total={codes.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="54rem">
          <THead><Tr><Th>Code</Th><Th>Discount</Th><Th align="right">Min purchase</Th><Th align="right">Used</Th><Th>Valid until</Th><Th>Status</Th><Th align="right"><span className="sr-only">Actions</span></Th></Tr></THead>
          <TBody>
            {rows.map((d) => {
              const expired = isExpired(d);
              return (
                <Tr key={d.id}>
                  <Td><div className="font-mono text-[0.9375rem] font-bold text-slate-900">{d.code}</div>{d.description && <div className="max-w-[16rem] truncate text-[0.75rem] text-slate-500">{d.description}</div>}</Td>
                  <Td className="font-semibold">{d.type === 'PERCENTAGE' ? `${d.value}% off` : `${formatPKR(d.value)} off`}{d.maxDiscount ? <div className="text-[0.75rem] font-normal text-slate-500">Up to {formatPKR(d.maxDiscount)}</div> : null}</Td>
                  <Td align="right">{d.minPurchase ? formatPKR(d.minPurchase) : <span className="text-slate-400">None</span>}</Td>
                  <Td align="right">{num(d.usageCount)}{d.usageLimit ? <span className="text-slate-400"> / {num(d.usageLimit)}</span> : ''}</Td>
                  <Td className="whitespace-nowrap">{d.validUntil ? formatDate(d.validUntil) : <span className="text-slate-400">No end date</span>}</Td>
                  <Td>{expired ? <StatusBadge value="EXPIRED" /> : d.isActive ? <StatusBadge value="ACTIVE" /> : <Badge>Switched off</Badge>}</Td>
                  <Td align="right">
                    <div className="inline-flex items-center gap-1">
                      <Switch size="sm" checked={d.isActive} onChange={() => toggle.mutate(d)} aria-label={d.isActive ? 'Switch off' : 'Switch on'} />
                      <button type="button" onClick={() => openEdit(d)} aria-label="Edit code" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Edit className="h-4 w-4" /></button>
                      <button type="button" onClick={() => onDelete(d)} aria-label="Delete code" className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </ListCard>

      {form && <CodeModal initial={form} editing={editing} onClose={() => setForm(null)} onSaved={refresh} />}

      {guide.isOpen && (
        <PageGuide
          title="Promo codes"
          description="Codes shops type in when they pay for a plan, to get money off."
          flowTitle="How a code is used"
          flow={[
            { label: 'You create a code', icon: Ticket, color: '#4f46e5' },
            { label: 'Shop enters it', hint: 'At checkout', icon: Receipt, color: '#0284c7' },
            { label: 'Discount applies', icon: BadgePercent, color: '#059669' },
            { label: 'Use count goes up', icon: Users, color: '#d97706' },
          ]}
          steps={[
            { icon: Plus, color: '#4f46e5', title: 'Create', text: 'Choose a percentage or a fixed amount, then add limits if you need them.' },
            { icon: CalendarClock, color: '#d97706', title: 'Limit', text: 'Set a minimum purchase, a total use limit and an end date.' },
            { icon: Edit, color: '#059669', title: 'Switch off', text: 'Use the switch to pause a code without deleting it.' },
          ]}
          tips={['A code cannot be renamed after it is created.', 'Deleting a code does not change plans that already used it.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function CodeModal({ initial, editing, onClose, onSaved }: { initial: UpsertPlatformDiscountPayload; editing: PlatformDiscount | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const set = (patch: Partial<UpsertPlatformDiscountPayload>) => setForm((f) => ({ ...f, ...patch }));
  const save = useMutation({
    mutationFn: () => (editing ? adminPlatformDiscountsApi.update(editing.id, form) : adminPlatformDiscountsApi.create(form)),
    onSuccess: () => { toast.success(editing ? 'Code updated' : 'Code created'); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not save the code'),
  });
  const submit = () => {
    if (!form.code.trim()) return toast.error('Enter a code');
    if (!form.value) return toast.error('Enter the discount value');
    if (form.type === 'PERCENTAGE' && form.value > 100) return toast.error('A percentage cannot be more than 100');
    save.mutate();
  };
  const optionalNumber = (v: string) => (v ? Number(v) : undefined);

  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${editing.code}` : 'New promo code'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={save.isPending}>{editing ? 'Save changes' : 'Create code'}</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Code" value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="LAUNCH50" disabled={!!editing} />
          <Input label="Description (optional)" value={form.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
        </div>
        <div>
          <div className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Type</div>
          <Segmented value={form.type} onChange={(type) => set({ type })} label="Discount type" items={[{ value: 'PERCENTAGE', label: 'Percentage' }, { value: 'FIXED_AMOUNT', label: 'Fixed amount' }]} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={form.type === 'PERCENTAGE' ? 'Percentage' : 'Amount (PKR)'} type="number" min={0} value={form.value || ''} onChange={(e) => set({ value: Number(e.target.value) })} />
          <Input label="Minimum purchase (PKR)" type="number" min={0} value={form.minPurchase ?? 0} onChange={(e) => set({ minPurchase: Number(e.target.value) })} />
          {form.type === 'PERCENTAGE' && <Input label="Biggest discount (PKR, optional)" type="number" min={0} value={form.maxDiscount ?? ''} onChange={(e) => set({ maxDiscount: optionalNumber(e.target.value) })} />}
          <Input label="Total use limit (optional)" type="number" min={1} value={form.usageLimit ?? ''} onChange={(e) => set({ usageLimit: optionalNumber(e.target.value) })} />
          <Input label="Uses per shop (optional)" type="number" min={1} value={form.perTenantLimit ?? ''} onChange={(e) => set({ perTenantLimit: optionalNumber(e.target.value) })} />
          <Input label="Valid until (optional)" type="date" value={form.validUntil?.slice(0, 10) ?? ''} onChange={(e) => set({ validUntil: e.target.value || undefined })} />
        </div>
        <Switch label="Active" description="Shops can use the code while it is on." checked={form.isActive ?? true} onChange={(e) => set({ isActive: e.target.checked })} />
      </div>
    </Modal>
  );
}
