import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  MessageCircle, Phone, Mail, Package, CreditCard, Truck,
  User, HelpCircle, Send, Plus, ChevronRight, Clock,
} from 'lucide-react';
import { supportApi } from '../api/support.api';
import { Button, Card, Input, Badge, EmptyState } from '@/ui';
import { timeAgo } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const CATEGORY_ICONS: Record<string, any> = {
  ORDER: Package, PAYMENT: CreditCard, DELIVERY: Truck,
  PRODUCT: Package, ACCOUNT: User, OTHER: HelpCircle,
};

export default function SupportPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    category: 'ORDER',
    message: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  });

  const { data: home } = useQuery({ queryKey: ['support-home'], queryFn: supportApi.home });
  const { data: tickets } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => supportApi.listTickets({ limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: () => supportApi.createTicket(form),
    onSuccess: (t: any) => {
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      qc.invalidateQueries({ queryKey: ['support-home'] });
      toast.success('Ticket created!');
      setShowNewTicket(false);
      setForm({ subject: '', category: 'ORDER', message: '', priority: 'MEDIUM' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <>
      <Helmet><title>Help & Support — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-content flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-brand-600" />
            Help & Support
          </h1>
          <p className="text-sm text-content-muted mt-0.5">
            Get help with orders, payments, and account
          </p>
        </div>

        {/* Contact methods */}
        {home?.contactMethods && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {home.contactMethods.map((c: any) => {
              const icons: Record<string, any> = {
                chat: MessageCircle, phone: Phone, whatsapp: MessageCircle, email: Mail,
              };
              const Icon = icons[c.type] || MessageCircle;
              const isLink = c.value && (c.type === 'phone' || c.type === 'whatsapp' || c.type === 'email');
              const href = c.type === 'phone' ? `tel:${c.value}`
                : c.type === 'whatsapp' ? `https://wa.me/${c.value.replace(/\D/g, '')}`
                  : c.type === 'email' ? `mailto:${c.value}` : undefined;
              const Wrapper: any = isLink ? 'a' : 'div';
              return (
                <Wrapper
                  key={c.type}
                  href={href}
                  target={c.type === 'whatsapp' ? '_blank' : undefined}
                  rel="noreferrer"
                  className="block"
                >
                  <Card className="p-3 text-center hover:shadow-soft-lg transition cursor-pointer">
                    <div className="h-11 w-11 mx-auto rounded-xl bg-gradient-brand flex items-center justify-center mb-2">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-2xs font-black">{c.label}</div>
                    {c.value && <div className="text-3xs text-content-muted mt-0.5 truncate">{c.value}</div>}
                  </Card>
                </Wrapper>
              );
            })}
          </div>
        )}

        {/* Create ticket button */}
        {!showNewTicket && (
          <Button
            variant="gradient"
            size="lg"
            fullWidth
            leftIcon={<Plus className="h-5 w-5" />}
            onClick={() => setShowNewTicket(true)}
          >
            Create new ticket
          </Button>
        )}

        {/* New ticket form */}
        {showNewTicket && (
          <Card className="p-5 space-y-4 animate-slide-down">
            <h3 className="font-black text-lg">New support ticket</h3>

            {/* Category */}
            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                Category
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['ORDER', 'PAYMENT', 'DELIVERY', 'PRODUCT', 'ACCOUNT', 'OTHER'].map((c) => {
                  const Icon = CATEGORY_ICONS[c];
                  const active = form.category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, category: c })}
                      className={cn(
                        'h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition',
                        active
                          ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40'
                          : 'border-border bg-surface hover:border-brand-300',
                      )}
                    >
                      <Icon className={cn('h-4 w-4', active ? 'text-brand-600' : 'text-content-muted')} />
                      <span className={cn('text-2xs font-black', active ? 'text-brand-600' : 'text-content-muted')}>
                        {c}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Subject"
              placeholder="Brief summary of your issue"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />

            <div>
              <label className="block text-sm font-bold text-content mb-1.5">Message</label>
              <textarea
                placeholder="Describe your issue in detail..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={5}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none"
              />
            </div>

            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                Priority
              </div>
              <div className="flex gap-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={cn(
                      'flex-1 h-10 rounded-xl border-2 text-2xs font-black transition',
                      form.priority === p
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 text-brand-700'
                        : 'border-border bg-surface',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="lg" fullWidth onClick={() => setShowNewTicket(false)}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                size="lg"
                fullWidth
                disabled={!form.subject || !form.message}
                loading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
                leftIcon={<Send className="h-4 w-4" />}
              >
                Submit
              </Button>
            </div>
          </Card>
        )}

        {/* Existing tickets */}
        {tickets && tickets.items?.length > 0 && (
          <div>
            <h3 className="text-xs font-black text-content-subtle uppercase tracking-wider mb-2 px-1">
              My tickets ({tickets.counts?.all || tickets.items.length})
            </h3>
            <div className="space-y-2">
              {tickets.items.map((t: any) => (
                <Link key={t.id} to={`/support/tickets/${t.id}`}>
                  <Card className="p-4 hover:shadow-soft-lg transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xs font-black text-content-subtle">#{t.ticketNumber}</span>
                          <Badge
                            variant={t.status === 'RESOLVED' ? 'success' : t.status === 'CLOSED' ? 'default' : 'info'}
                            size="sm"
                          >
                            {t.status}
                          </Badge>
                          {t.priority === 'HIGH' && <Badge variant="warning" size="sm">HIGH</Badge>}
                          {t.priority === 'URGENT' && <Badge variant="danger" size="sm">URGENT</Badge>}
                        </div>
                        <div className="font-black text-content text-sm">{t.subject}</div>
                        <div className="text-2xs text-content-muted mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(t.createdAt)} · {t._count?.messages || 0} messages
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-content-subtle" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
