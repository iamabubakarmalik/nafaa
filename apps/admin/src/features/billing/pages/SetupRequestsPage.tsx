/**
 * Setup requests: Assisted setup and Full activation packages shops bought
 * (or got free with a yearly plan). The team calls the shop, delivers the
 * setup and marks it done with a short note.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Lightbulb, MessageCircle, Phone, Store, Wrench } from 'lucide-react';
import { Badge, Button, FilterBar, Modal, PageHero, PageShell, Segmented, Table, TBody, Td, Textarea, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminBillingCatalogApi, type SetupRequest } from '@/api/admin-billing-catalog.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatDateTime, formatPKRFull, formatRelative, num } from '@/lib/format';
import { ListCard, useListParams } from '@/ui';

const wa = (phone: string | null | undefined) => {
  const d = (phone ?? '').replace(/\D/g, '');
  const intl = d.startsWith('0') ? `92${d.slice(1)}` : d;
  return intl.length >= 11 ? `https://wa.me/${intl}` : null;
};

export default function SetupRequestsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('tenants.manage');
  const list = useListParams({ status: 'pending' });
  const { status } = list.filters;
  const [closing, setClosing] = useState<SetupRequest | null>(null);
  const [note, setNote] = useState('');

  const setups = useQuery({
    queryKey: ['admin', 'setups', status, list.page, list.limit],
    queryFn: () => adminBillingCatalogApi.setups({ status, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const done = useMutation({
    mutationFn: () => adminBillingCatalogApi.markSetupDone(closing!.id, note),
    onSuccess: () => { toast.success('Marked done'); setClosing(null); setNote(''); qc.invalidateQueries({ queryKey: ['admin', 'setups'] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const rows = setups.data?.items ?? [];

  return (
    <PageShell>
      <PageHero
        title="Setup requests"
        chip={setups.data ? `${num(setups.data.stats.open)} open` : undefined}
        busy={setups.isFetching}
        loading={setups.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={setups.data ? [
          { label: 'Waiting for the team', value: num(setups.data.stats.open) },
          { label: status === 'done' ? 'Done (this list)' : 'In this list', value: num(setups.data.meta.total) },
        ] : undefined}
      />

      <FilterBar>
        <Segmented label="Status" value={status} onChange={(v) => list.setFilter('status', v)} items={[{ value: 'pending', label: 'To do' }, { value: 'done', label: 'Done' }]} />
      </FilterBar>

      <ListCard
        loading={setups.isLoading}
        empty={!rows.length}
        emptyIcon={<Wrench className="h-6 w-6" />}
        emptyTitle={status === 'pending' ? 'No setups waiting' : 'Nothing done yet'}
        emptyText={status === 'pending' ? 'When a shop buys Assisted setup or Full activation it shows here.' : 'Finished setups show here with their notes.'}
        page={list.page} limit={list.limit} total={setups.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="54rem">
          <THead><Tr><Th>Shop</Th><Th>Package</Th><Th align="right">Paid</Th><Th>Bought</Th><Th>{status === 'done' ? 'Note' : 'Contact'}</Th><Th align="right"><span className="sr-only">Action</span></Th></Tr></THead>
          <TBody>
            {rows.map((r) => {
              const phone = r.shop.owner?.phone ?? r.shop.phone;
              const whatsapp = wa(phone);
              return (
                <Tr key={r.id}>
                  <Td className="max-w-[16rem]">
                    <Link to={`/tenants/${r.shop.id}`} className="flex items-center gap-1.5 font-semibold text-slate-900 hover:text-brand-700"><Store className="h-3.5 w-3.5 text-slate-400" />{r.shop.name}</Link>
                    <div className="truncate text-[0.75rem] text-slate-500">{r.shop.owner?.fullName ?? '—'}{r.shop.businessType ? ` · ${r.shop.businessType.toLowerCase()}` : ''}</div>
                  </Td>
                  <Td><Badge variant={r.service.key === 'full_activation' ? 'warning' : 'info'}>{r.service.name}</Badge></Td>
                  <Td align="right" className="tabular-nums">{r.paidAmount == null ? '—' : r.paidAmount === 0 ? <span className="text-emerald-700">Free (yearly)</span> : formatPKRFull(r.paidAmount)}{r.invoiceNumber && <div className="text-[0.6875rem] text-slate-400">{r.invoiceNumber}</div>}</Td>
                  <Td className="whitespace-nowrap text-[0.8125rem]" title={formatDateTime(r.boughtAt)}>{formatRelative(r.boughtAt)}</Td>
                  <Td className="max-w-[16rem] text-[0.8125rem]">
                    {status === 'done' ? <span className="text-slate-600">{r.doneNote || '—'}</span> : (
                      <div className="flex flex-wrap items-center gap-2">
                        {phone ? <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Phone className="h-3.5 w-3.5" />{phone}</a> : <span className="text-slate-400">No phone</span>}
                        {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>}
                      </div>
                    )}
                  </Td>
                  <Td align="right">
                    {status === 'pending' && canManage && <Button size="sm" variant="secondary" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setClosing(r)}>Mark done</Button>}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </ListCard>

      <Modal open={!!closing} onClose={() => setClosing(null)} title={`Setup done: ${closing?.shop.name ?? ''}`}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setClosing(null)}>Cancel</Button><Button loading={done.isPending} onClick={() => done.mutate()}>Mark done</Button></div>}>
        <Textarea label="What was done (optional)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 420 products added, 3 staff trained, printer set up" />
      </Modal>

      {guide.isOpen && (
        <PageGuide
          title="Setup requests"
          description="Paid setup packages the team has to deliver."
          flowTitle="From purchase to done"
          flow={[
            { label: 'Shop buys', hint: 'Or yearly plan', icon: Store, color: '#4f46e5' },
            { label: 'Shows here', hint: 'Admin is notified', icon: Wrench, color: '#d97706' },
            { label: 'Team calls', hint: 'Phone / WhatsApp', icon: Phone, color: '#0284c7' },
            { label: 'Mark done', icon: CheckCircle2, color: '#059669' },
          ]}
          steps={[
            { icon: Wrench, color: '#d97706', title: 'Assisted setup', text: 'Online call: up to 500 products, settings and staff training. Free with yearly plans when the offer is on.' },
            { icon: Store, color: '#4f46e5', title: 'Full activation', text: 'Visit the shop: all products and old data, printer and scanner, staff training, one month priority support.' },
            { icon: CheckCircle2, color: '#059669', title: 'Done', text: 'Write what was done so anyone can see it later on the shop’s page.' },
          ]}
          tips={['Prices and wording are in Add-ons. The yearly offer is in Billing settings.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
