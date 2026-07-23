import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MessageCircle, Plus, Phone, Mail, MessageSquare, HelpCircle,
  ChevronRight, Clock, CheckCircle2, X, Send,
} from 'lucide-react';
import { supportApi } from '../api/support.api';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Textarea } from '@shared/ui/Textarea';
import { Modal } from '@shared/ui/Modal';
import { EmptyState } from '@shared/ui/EmptyState';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { Badge } from '@shared/ui/Badge';
import { cn } from '@lib/cn';

const FAQ_ITEMS = [
  {
    q: 'Order kaise track karain?',
    a: 'Orders tab pe jaen aur active order pe click karein — real-time tracking milegi.',
  },
  {
    q: 'Refund kitne din mein milta hai?',
    a: 'JazzCash/Easypaisa/Card mein 3-5 din, COD orders mein wallet mein 24 hours.',
  },
  {
    q: 'Bargain kaise karain?',
    a: 'Product pe "Bargain" badge dekhen → offer bhejen → shop owner accept/counter karega.',
  },
  {
    q: 'Group Buy kya hai?',
    a: 'Multiple customers milkar khareedain — minimum quantity puri hone pe sab ko discount milta hai.',
  },
  {
    q: 'Delivery kitni jaldi aati hai?',
    a: 'Shop ke area pe depend karta hai — nazdeek dukanein 30 min mein deliver karti hain.',
  },
  {
    q: 'Payment safe hai?',
    a: 'Bilkul! 256-bit encryption, JazzCash/Easypaisa verified, COD option bhi hai.',
  },
];

const STATUS_CONFIG: Record<string, { color: any; icon: any; label: string }> = {
  OPEN:        { color: 'warning', icon: Clock,        label: 'Open' },
  IN_PROGRESS: { color: 'info',    icon: MessageCircle, label: 'In Progress' },
  RESOLVED:    { color: 'success', icon: CheckCircle2, label: 'Resolved' },
  CLOSED:      { color: 'default', icon: X,            label: 'Closed' },
};

export default function SupportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ subject: '', message: '', category: 'OTHER' });
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['market-support-tickets'],
    queryFn: supportApi.listTickets,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => supportApi.createTicket(data),
    onSuccess: (data: any) => {
      toast.success('Ticket create ho gaya! 💬', {
        description: 'Team jaldi hi reply karegi',
      });
      queryClient.invalidateQueries({ queryKey: ['market-support-tickets'] });
      setModalOpen(false);
      setFormData({ subject: '', message: '', category: 'OTHER' });
      navigate(`/support/${data.id}`);
    },
  });

  return (
    <div className="pb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-brand-600" />
            Help & Support
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Hum aap ki madad ke liye hazir hain</p>
        </div>
      </div>

      {/* Quick Contact Cards */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="tel:+92-3-1111-NAFAA"
          className="p-4 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 text-white shadow-brand hover:shadow-brand-lg transition-all"
        >
          <Phone className="h-6 w-6 mb-2" />
          <div className="font-extrabold text-sm">Call Us</div>
          <div className="text-[10px] opacity-90 font-bold mt-0.5">24/7 Support</div>
        </a>
        <a
          href="https://wa.me/923001111000"
          target="_blank"
          rel="noreferrer"
          className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md hover:shadow-lg transition-all"
        >
          <MessageSquare className="h-6 w-6 mb-2" />
          <div className="font-extrabold text-sm">WhatsApp</div>
          <div className="text-[10px] opacity-90 font-bold mt-0.5">Quick response</div>
        </a>
      </div>

      {/* Create Ticket CTA */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-dashed border-brand-300 dark:border-brand-800">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
            <MessageCircle className="h-5 w-5 text-brand-700 dark:text-brand-400" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-sm text-slate-900 dark:text-white">
              Ticket Banayen
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Detailed issue ke liye ticket create karein
            </div>
          </div>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setModalOpen(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            New
          </Button>
        </div>
      </div>

      {/* My Tickets */}
      <section>
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2">
          🎫 My Tickets
        </h2>
        {isLoading ? (
          <SkeletonCard />
        ) : !tickets?.length ? (
          <div className="text-center py-6 text-xs text-slate-500 font-bold">
            Koi ticket nahi banaya abhi
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t: any) => {
              const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.OPEN;
              const StatusIcon = cfg.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate(`/support/${t.id}`)}
                  className="w-full p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft hover:shadow-soft-lg transition text-left flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
                    <StatusIcon className="h-4 w-4 text-brand-700 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {t.subject}
                      </span>
                      <Badge variant={cfg.color} size="xs">{cfg.label}</Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      #{t.ticketNumber} · {new Date(t.createdAt).toLocaleDateString('en-PK')}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* FAQs */}
      <section>
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-brand-600" />
          Aksar Poochay Jane Wale Sawaal
        </h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              className="w-full p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-brand-300 transition text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {item.q}
                </span>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-slate-400 transition shrink-0',
                    expandedFaq === i && 'rotate-90',
                  )}
                />
              </div>
              {expandedFaq === i && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed animate-slide-down">
                  {item.a}
                </p>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Email fallback */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
        <Mail className="h-5 w-5 text-brand-600 mx-auto mb-1.5" />
        <div className="text-xs font-extrabold text-slate-900 dark:text-white">Email us</div>
        <a
          href="mailto:support@nafaa.pk"
          className="text-xs font-bold text-brand-700 dark:text-brand-400 hover:underline"
        >
          support@nafaa.pk
        </a>
      </div>

      {/* New Ticket Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Naya Ticket Banayen"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              variant="gradient"
              loading={createMutation.isPending}
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() => {
                if (formData.subject.trim().length < 5) return toast.error('Subject 5+ characters');
                if (formData.message.trim().length < 20) return toast.error('Message 20+ characters');
                createMutation.mutate(formData);
              }}
            >
              Submit
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-bold focus:outline-none focus:border-brand-500"
            >
              <option value="ORDER">Order Issue</option>
              <option value="DELIVERY">Delivery Problem</option>
              <option value="PAYMENT">Payment Issue</option>
              <option value="REFUND">Refund Request</option>
              <option value="ACCOUNT">Account Issue</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <Input
            label="Subject"
            placeholder="Kya masla hai?"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />
          <Textarea
            label="Details"
            placeholder="Pura issue detail mein likhein..."
            rows={5}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            required
          />
        </div>
      </Modal>
    </div>
  );
}
