import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  ArrowLeft, CreditCard, Plus, Trash2, ShieldCheck, Star,
  Lock, X,
} from 'lucide-react';
import { profileApi } from '../api/profile.api';
import { Button, Card, Input, Badge, EmptyState } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const CARD_BRANDS: Record<string, { name: string; gradient: string; icon: string }> = {
  VISA:       { name: 'Visa',       gradient: 'from-blue-600 to-blue-800',       icon: '💳' },
  MASTERCARD: { name: 'Mastercard', gradient: 'from-orange-500 to-red-600',      icon: '💳' },
  AMEX:       { name: 'Amex',       gradient: 'from-emerald-500 to-teal-700',    icon: '💳' },
  DISCOVER:   { name: 'Discover',   gradient: 'from-amber-500 to-orange-600',    icon: '💳' },
  UNKNOWN:    { name: 'Card',       gradient: 'from-slate-500 to-slate-700',     icon: '💳' },
};

function detectBrand(cardNumber: string): keyof typeof CARD_BRANDS {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (/^4/.test(cleaned)) return 'VISA';
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'MASTERCARD';
  if (/^3[47]/.test(cleaned)) return 'AMEX';
  if (/^6/.test(cleaned)) return 'DISCOVER';
  return 'UNKNOWN';
}

function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const parts = cleaned.match(/.{1,4}/g) || [];
  return parts.join(' ').slice(0, 19);
}

export default function SavedCardsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: cards, isLoading } = useQuery({
    queryKey: ['saved-cards'],
    queryFn: profileApi.listCards,
  });

  return (
    <>
      <Helmet><title>Saved Cards — Nafaa Bazaar</title></Helmet>

      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <CreditCard className="h-7 w-7 text-brand-600" />
              Saved Cards
            </h1>
            <p className="text-sm text-content-muted mt-0.5">
              Cards saved for quick checkout
            </p>
          </div>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setShowAdd(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add card
          </Button>
        </div>

        <Card className="p-3 bg-info/10 border-info/30 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <div className="text-xs text-content">
            <strong>Bank-grade security:</strong> Card numbers are tokenized and never stored on our servers.
            PCI-DSS compliant with 3D Secure verification.
          </div>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-3xl" />
            ))}
          </div>
        ) : !cards?.length ? (
          <EmptyState
            icon={CreditCard}
            title="No saved cards"
            description="Add a card to save time at checkout"
            action={
              <Button variant="gradient" onClick={() => setShowAdd(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Add your first card
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {cards.map((card: any) => {
              const brand = CARD_BRANDS[card.brand?.toUpperCase()] || CARD_BRANDS.UNKNOWN;
              return (
                <SavedCard key={card.id} card={card} brand={brand} />
              );
            })}
          </div>
        )}
      </div>

      {showAdd && <AddCardModal onClose={() => setShowAdd(false)} />}
    </>
  );
}

function SavedCard({ card, brand }: { card: any; brand: any }) {
  const qc = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: () => profileApi.deleteCard(card.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-cards'] });
      toast.success('Card removed');
    },
  });

  return (
    <Card className={cn(
      `p-5 bg-gradient-to-br ${brand.gradient} text-white border-0 relative overflow-hidden shadow-lg`,
    )}>
      <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-2xs opacity-75 font-bold uppercase">{brand.name}</div>
            {card.isDefault && (
              <Badge variant="glass" size="sm" className="mt-1 backdrop-blur-md text-white">
                <Star className="h-3 w-3 fill-current" />
                Default
              </Badge>
            )}
          </div>
          <div className="text-3xl">{brand.icon}</div>
        </div>

        <div className="text-xl md:text-2xl font-mono font-black tabular-nums tracking-wider mb-4">
          •••• •••• •••• {card.last4}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xs opacity-75 font-bold uppercase">Cardholder</div>
            <div className="text-sm font-black mt-0.5">{card.holderName || 'CARD HOLDER'}</div>
          </div>
          <div className="text-right">
            <div className="text-2xs opacity-75 font-bold uppercase">Expires</div>
            <div className="text-sm font-black mt-0.5 font-mono">
              {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => removeMutation.mutate()}
            className="text-xs font-black text-white/80 hover:text-white flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        </div>
      </div>
    </Card>
  );
}

function AddCardModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    cardNumber: '',
    holderName: '',
    expMonth: '',
    expYear: '',
    cvv: '',
  });

  const brand = detectBrand(form.cardNumber);
  const brandInfo = CARD_BRANDS[brand];

  const addMutation = useMutation({
    mutationFn: () => profileApi.saveCard({
      cardNumber: form.cardNumber.replace(/\s/g, ''),
      holderName: form.holderName,
      expMonth: Number(form.expMonth),
      expYear: Number(form.expYear),
      cvv: form.cvv,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-cards'] });
      toast.success('Card added securely 🔒');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 animate-scale-in">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-black text-lg">Add new card</h3>
            <p className="text-xs text-content-muted">Secured with 3D Secure</p>
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview */}
        {form.cardNumber && (
          <Card className={cn(
            `p-4 bg-gradient-to-br ${brandInfo.gradient} text-white border-0 relative overflow-hidden`,
          )}>
            <div className="text-2xs opacity-75 font-bold uppercase mb-4">{brandInfo.name}</div>
            <div className="text-lg font-mono font-black tabular-nums tracking-wider">
              {form.cardNumber || '•••• •••• •••• ••••'}
            </div>
            <div className="mt-3 flex justify-between text-xs">
              <span className="font-bold">{form.holderName || 'CARDHOLDER NAME'}</span>
              <span className="font-mono">
                {form.expMonth || 'MM'}/{form.expYear.slice(-2) || 'YY'}
              </span>
            </div>
          </Card>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
          className="space-y-3"
        >
          <Input
            label="Card number"
            placeholder="1234 5678 9012 3456"
            value={form.cardNumber}
            onChange={(e) => setForm({ ...form, cardNumber: formatCardNumber(e.target.value) })}
            maxLength={19}
            inputSize="lg"
            leftIcon={<CreditCard className="h-4 w-4" />}
            required
          />
          <Input
            label="Cardholder name"
            placeholder="AHMAD KHAN"
            value={form.holderName}
            onChange={(e) => setForm({ ...form, holderName: e.target.value.toUpperCase() })}
            inputSize="lg"
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Month"
              placeholder="MM"
              value={form.expMonth}
              onChange={(e) => setForm({ ...form, expMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
              inputSize="lg"
              maxLength={2}
              required
            />
            <Input
              label="Year"
              placeholder="YYYY"
              value={form.expYear}
              onChange={(e) => setForm({ ...form, expYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              inputSize="lg"
              maxLength={4}
              required
            />
            <Input
              label="CVV"
              placeholder="123"
              type="password"
              value={form.cvv}
              onChange={(e) => setForm({ ...form, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              inputSize="lg"
              maxLength={4}
              leftIcon={<Lock className="h-3.5 w-3.5" />}
              required
            />
          </div>

          <div className="text-2xs text-content-muted flex items-start gap-1">
            <ShieldCheck className="h-3 w-3 shrink-0 mt-0.5 text-brand-600" />
            <span>Your card is tokenized and secured. We never store CVV.</span>
          </div>

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            fullWidth
            loading={addMutation.isPending}
            leftIcon={<Lock className="h-4 w-4" />}
          >
            Save card securely
          </Button>
        </form>
      </Card>
    </div>
  );
}
