/**
 * One Market support ticket: the conversation, a reply box (with internal
 * notes for staff), status and priority, and links to the customer, order
 * and shop. A reply notifies the customer.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, CircleAlert, MessageSquareText, Send, StickyNote } from 'lucide-react';
import { Button, Card, Checkbox, EmptyState, PageHero, PageShell, Select, Skeleton, Textarea, heroButton } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi, TICKET_STATUSES, type TicketDetail, type TicketStatus } from '@/api/admin-market.api';
import { DetailList } from '@/ui';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatPKRFull } from '@/lib/format';
import { cn } from '@/lib/cn';
import { GuideButton, MarketGuide, OrderStatusBadge, TicketStatusBadge, dateTime, ticketStatusLabel } from '../components/MarketUi';

export default function MarketTicketPage() {
  const { id = '' } = useParams();
  const guide = usePageGuide();
  const can = useCan();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const detail = useQuery({ queryKey: ['admin-market-ticket', id], queryFn: () => adminMarketApi.ticket(id), enabled: !!id, refetchInterval: 30_000 });
  const done = (d: TicketDetail) => {
    qc.setQueryData(['admin-market-ticket', id], d);
    void qc.invalidateQueries({ queryKey: ['admin-market-support'] });
  };
  const reply = useMutation({
    mutationFn: () => adminMarketApi.replyTicket(id, text.trim(), internal),
    onSuccess: (d) => { done(d); setText(''); toast.success(internal ? 'Note saved' : 'Reply sent'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const update = useMutation({
    mutationFn: (body: { status?: TicketStatus; priority?: string }) => adminMarketApi.updateTicket(id, body),
    onSuccess: (d) => { done(d); toast.success('Ticket updated'); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (detail.isError) {
    return (
      <PageShell>
        <PageHero title="Ticket" back="/market/support" />
        <EmptyState icon={<CircleAlert className="h-6 w-6" />} title="Ticket not found" action={<Link to="/market/support" className="font-semibold text-brand-700 hover:underline">Back to support</Link>} />
      </PageShell>
    );
  }
  const t = detail.data;
  if (!t) return <PageShell><PageHero title="Ticket" back="/market/support" loading /><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  const canManage = can('marketplace.manage');
  const closed = t.status === 'RESOLVED' || t.status === 'CLOSED';

  return (
    <PageShell>
      <PageHero
        title={t.subject}
        back="/market/support"
        chip={<TicketStatusBadge status={t.status} />}
        meta={<span>#{t.ticketNumber} · {t.customer.name}</span>}
        busy={detail.isFetching || reply.isPending || update.isPending}
        actions={
          <>
            {canManage && !closed && <button type="button" className={heroButton} onClick={() => update.mutate({ status: 'RESOLVED' })}><CheckCircle2 className="h-4 w-4" /> Resolve</button>}
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={[
          { label: 'Status', value: ticketStatusLabel(t.status) },
          { label: 'Priority', value: t.priority.charAt(0) + t.priority.slice(1).toLowerCase() },
          { label: 'Messages', value: String(t.messages.length) },
          { label: 'Opened', value: dateTime(t.createdAt) },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Conversation">
            <ol className="space-y-3">
              {t.messages.map((m) => {
                const mine = m.from === 'STAFF';
                const system = m.from === 'SYSTEM';
                return (
                  <li key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[0.8125rem]',
                      m.internal ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : mine ? 'bg-brand-50 text-slate-900' : system ? 'bg-slate-50 text-slate-500' : 'bg-slate-100 text-slate-900')}>
                      <div className="mb-0.5 text-[0.6875rem] font-medium text-slate-500">
                        {m.internal ? 'Internal note' : mine ? 'Nafaa' : system ? 'Automatic' : t.customer.name} · {dateTime(m.at)}
                      </div>
                      <div className="whitespace-pre-line">{m.text}</div>
                      {!!m.attachments.length && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.attachments.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-16 w-16 rounded-lg object-cover" /></a>)}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          {canManage && (
            <Card title={internal ? 'Internal note' : 'Reply to customer'} description={internal ? 'Only staff see this.' : 'The customer gets a notification in the Market app.'}>
              <Textarea rows={4} value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} placeholder={internal ? 'Note for the team…' : 'Write your reply…'} aria-label="Message" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <Checkbox checked={internal} onChange={(e) => setInternal(e.target.checked)} label="Internal note (not sent to the customer)" />
                <Button onClick={() => reply.mutate()} loading={reply.isPending} disabled={!text.trim()}>
                  {internal ? <StickyNote className="h-4 w-4" /> : <Send className="h-4 w-4" />} {internal ? 'Save note' : 'Send reply'}
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {canManage && (
            <Card title="Ticket">
              <div className="space-y-3">
                <Select label="Status" size="sm" value={t.status} onChange={(e) => update.mutate({ status: e.target.value as TicketStatus })}
                  options={TICKET_STATUSES.map((s) => ({ value: s, label: ticketStatusLabel(s) }))} />
                <Select label="Priority" size="sm" value={t.priority} onChange={(e) => update.mutate({ priority: e.target.value })}
                  options={['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() }))} />
              </div>
            </Card>
          )}
          <Card title="Customer">
            <DetailList items={[
              { label: 'Name', value: <Link to={`/market/customers/${t.customer.id}`} className="font-medium text-brand-700 hover:underline">{t.customer.name}</Link> },
              { label: 'Phone', value: t.customer.phone },
              { label: 'Email', value: t.customer.email },
              { label: 'Category', value: t.category },
              { label: 'Rating given', value: t.rating ? `${t.rating} / 5` : null, hidden: !t.rating },
            ]} />
          </Card>
          {(t.order || t.shop) && (
            <Card title="About">
              <DetailList items={[
                { label: 'Order', value: t.order ? <span className="inline-flex items-center gap-2"><Link to={`/market/orders/${t.order.id}`} className="font-medium text-brand-700 hover:underline">#{t.order.orderNumber}</Link><OrderStatusBadge status={t.order.status} /></span> : null, hidden: !t.order },
                { label: 'Order total', value: t.order ? formatPKRFull(t.order.total) : null, hidden: !t.order },
                { label: 'Shop', value: t.shop ? <Link to={`/market/shops/${t.shop.shopId}`} className="font-medium text-brand-700 hover:underline">{t.shop.name}</Link> : null, hidden: !t.shop },
              ]} />
            </Card>
          )}
        </div>
      </div>

      {guide.isOpen && (
        <MarketGuide
          search={false}
          title="Ticket"
          description="Answer one customer."
          flow={[
            { label: 'Read', hint: 'Conversation', icon: MessageSquareText, color: '#4f46e5' },
            { label: 'Reply', hint: 'Or internal note', icon: Send, color: '#0284c7' },
            { label: 'Resolve', hint: 'When fixed', icon: CheckCircle2, color: '#16a34a' },
          ]}
          steps={[
            { icon: MessageSquareText, color: '#4f46e5', title: 'Read the conversation', text: 'Open the linked order or shop if the ticket is about one.' },
            { icon: Send, color: '#0284c7', title: 'Reply simply', text: 'Customers read Roman Urdu or English. Keep it short and clear.' },
            { icon: StickyNote, color: '#d97706', title: 'Use internal notes', text: 'Tick internal note to leave context for the team without telling the customer.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
