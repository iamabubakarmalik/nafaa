import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  Gift, Sparkles, Heart, Cake, PartyPopper, Calendar,
  ArrowLeft, Send, Copy, CheckCircle2, DollarSign, Users,
} from 'lucide-react';
import { giftCardsApi } from '../api/gift-cards.api';
import { Button, Card, Input, Badge, EmptyState } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { toast } from 'sonner';
import { analytics } from '@/lib/analytics';
import { cn } from '@/lib/cn';

const DESIGNS = [
  { id: 'birthday', icon: Cake, label: 'Birthday', gradient: 'from-pink-500 via-rose-500 to-red-500', emoji: '🎂' },
  { id: 'wedding', icon: Heart, label: 'Wedding', gradient: 'from-rose-500 via-pink-500 to-purple-500', emoji: '💐' },
  { id: 'eid', icon: Sparkles, label: 'Eid Mubarak', gradient: 'from-emerald-500 via-teal-500 to-cyan-500', emoji: '🌙' },
  { id: 'party', icon: PartyPopper, label: 'Celebration', gradient: 'from-purple-500 via-pink-500 to-orange-500', emoji: '🎉' },
  { id: 'thank_you', icon: Heart, label: 'Thank you', gradient: 'from-amber-500 via-orange-500 to-red-500', emoji: '🙏' },
  { id: 'generic', icon: Gift, label: 'For anyone', gradient: 'from-brand-500 via-emerald-500 to-teal-500', emoji: '🎁' },
];

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

export default function GiftCardsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'buy' | 'received' | 'sent' | 'redeem'>('buy');
  const [design, setDesign] = useState(DESIGNS[0]);
  const [amount, setAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [form, setForm] = useState({
    recipientName: '',
    recipientPhone: '',
    message: '',
  });
  const [redeemCode, setRedeemCode] = useState('');

  const { data: received } = useQuery({
    queryKey: ['gift-cards-received'],
    queryFn: giftCardsApi.mine,
    enabled: tab === 'received',
  });

  const { data: sent } = useQuery({
    queryKey: ['gift-cards-sent'],
    queryFn: giftCardsApi.sent,
    enabled: tab === 'sent',
  });

  const purchaseMutation = useMutation({
    mutationFn: () => giftCardsApi.purchase({
      amount,
      recipientName: form.recipientName,
      recipientPhone: form.recipientPhone,
      message: form.message,
      designId: design.id,
    }),
    onSuccess: () => {
      analytics.track('gift_card_purchased', { amount, design: design.id });
      toast.success('Gift card purchased! 🎁');
      setForm({ recipientName: '', recipientPhone: '', message: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const redeemMutation = useMutation({
    mutationFn: () => giftCardsApi.redeem(redeemCode),
    onSuccess: (r) => {
      toast.success(`${formatPrice(r.amount)} added to your wallet! 🎉`);
      setRedeemCode('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Invalid code'),
  });

  return (
    <>
      <Helmet><title>Gift Cards — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        <Card className="p-6 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <Gift className="h-3.5 w-3.5" />
              Perfect gifts
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Nafaa Gift Cards</h1>
            <p className="text-white/90 text-sm md:text-base mt-1">
              Give the gift of choice — redeemable on 10,000+ shops
            </p>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-border">
          {([
            { key: 'buy',      label: '🎁 Buy',       badge: null },
            { key: 'received', label: '📬 Received',  badge: received?.length },
            { key: 'sent',     label: '📤 Sent',      badge: sent?.length },
            { key: 'redeem',   label: '💳 Redeem',    badge: null },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'shrink-0 px-4 py-3 text-sm font-black border-b-2 transition',
                tab === t.key
                  ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                  : 'border-transparent text-content-muted hover:text-content',
              )}
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <Badge variant="brand" size="sm" className="ml-1">{t.badge}</Badge>
              )}
            </button>
          ))}
        </div>

        {tab === 'buy' && (
          <div className="space-y-5">
            {/* Design picker */}
            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                Choose design
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DESIGNS.map((d) => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDesign(d)}
                      className={cn(
                        'p-4 rounded-2xl border-2 transition text-left',
                        design.id === d.id ? 'border-pink-500 scale-105' : 'border-border',
                      )}
                    >
                      <div className={`h-16 rounded-xl bg-gradient-to-br ${d.gradient} flex items-center justify-center mb-2 text-4xl`}>
                        {d.emoji}
                      </div>
                      <div className="font-black text-sm">{d.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                Choose amount
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {PRESET_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setAmount(a); setCustomAmount(''); }}
                    className={cn(
                      'h-14 rounded-xl border-2 text-sm font-black transition',
                      amount === a
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-700'
                        : 'border-border bg-surface hover:border-pink-300',
                    )}
                  >
                    {formatPrice(a)}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                placeholder="Or enter custom amount (PKR 100 - 100,000)"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setAmount(Number(e.target.value) || 0);
                }}
                leftIcon={<DollarSign className="h-4 w-4" />}
              />
            </div>

            {/* Recipient */}
            <Card className="p-5 space-y-3">
              <h3 className="font-black">Recipient details</h3>
              <Input
                label="Recipient name"
                placeholder="Who's the gift for?"
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                required
              />
              <Input
                label="Their phone number"
                placeholder="03001234567"
                value={form.recipientPhone}
                onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })}
                required
                hint="We'll SMS them the gift card code"
              />
              <div>
                <label className="block text-sm font-bold text-content mb-1.5">
                  Personal message (optional)
                </label>
                <textarea
                  placeholder="Happy birthday! Enjoy shopping..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 resize-none"
                />
              </div>
            </Card>

            {/* Preview */}
            <Card className={cn(
              `p-6 bg-gradient-to-br ${design.gradient} text-white border-0 relative overflow-hidden shadow-2xl`,
            )}>
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xs opacity-75 font-bold uppercase">Nafaa Gift Card</div>
                  <div className="text-4xl">{design.emoji}</div>
                </div>
                <div className="text-4xl md:text-5xl font-black tabular-nums mb-2">
                  {formatPrice(amount)}
                </div>
                {form.recipientName && (
                  <div className="text-sm opacity-90 mb-2">
                    For: <strong>{form.recipientName}</strong>
                  </div>
                )}
                {form.message && (
                  <div className="text-sm italic opacity-95 line-clamp-2">"{form.message}"</div>
                )}
              </div>
            </Card>

            <Button
              variant="gradient"
              size="lg"
              fullWidth
              disabled={amount < 100 || amount > 100000 || !form.recipientName || !form.recipientPhone}
              loading={purchaseMutation.isPending}
              onClick={() => purchaseMutation.mutate()}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Send gift · {formatPrice(amount)}
            </Button>
          </div>
        )}

        {tab === 'received' && (
          <div className="space-y-3">
            {!received?.length ? (
              <EmptyState icon={Gift} title="No gift cards received" description="When someone sends you a gift card, it'll appear here" />
            ) : (
              received.map((gc: any) => {
                const d = DESIGNS.find((d) => d.id === gc.designId) || DESIGNS[0];
                return (
                  <Card key={gc.id} className={cn(
                    `p-5 bg-gradient-to-br ${d.gradient} text-white border-0 relative overflow-hidden`,
                  )}>
                    <div className="text-2xs opacity-75 font-bold uppercase mb-2">From {gc.senderName}</div>
                    <div className="text-2xl font-black mb-1">{formatPrice(gc.amount)}</div>
                    {gc.message && <div className="text-sm italic opacity-95 mt-2">"{gc.message}"</div>}
                    <div className="text-2xs mt-3 opacity-75">{timeAgo(gc.createdAt)}</div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(gc.code);
                        toast.success('Code copied!');
                      }}
                      className="mt-3 h-9 px-3 rounded-lg bg-white/20 backdrop-blur hover:bg-white/30 text-xs font-black flex items-center gap-1.5 transition"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {gc.code}
                    </button>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {tab === 'sent' && (
          <div className="space-y-3">
            {!sent?.length ? (
              <EmptyState icon={Send} title="You haven't sent any gift cards yet" />
            ) : (
              sent.map((gc: any) => (
                <Card key={gc.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-black text-sm">To: {gc.recipientName}</div>
                      <div className="text-2xs text-content-muted">{gc.recipientPhone}</div>
                      <div className="text-2xs text-content-muted mt-1">{timeAgo(gc.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-brand-600">{formatPrice(gc.amount)}</div>
                      {gc.redeemedAt ? (
                        <Badge variant="success" size="sm">
                          <CheckCircle2 className="h-3 w-3" />
                          Redeemed
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">Not yet redeemed</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'redeem' && (
          <Card className="p-6 md:p-8 space-y-4">
            <div className="text-center">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center mb-3">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-black">Have a gift card code?</h2>
              <p className="text-sm text-content-muted mt-1">
                Enter it to add the balance to your Nafaa Wallet
              </p>
            </div>

            <Input
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              inputSize="lg"
              className="text-center font-mono tracking-wider"
            />

            <Button
              variant="gradient"
              size="lg"
              fullWidth
              disabled={redeemCode.length < 8}
              loading={redeemMutation.isPending}
              onClick={() => redeemMutation.mutate()}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Redeem to wallet
            </Button>
          </Card>
        )}
      </div>
    </>
  );
}
