import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, AlertTriangle, Package, DollarSign, RefreshCw, MessageCircle,
  Upload, Camera,
} from 'lucide-react';
import { disputeApi } from '../api/dispute.api';
import { Button, Card, Input, Badge } from '@/ui';
import { toast } from 'sonner';
import { analytics } from '@/lib/analytics';
import { cn } from '@/lib/cn';

const REASONS = [
  { key: 'DAMAGED',       label: 'Item damaged',            icon: '💔' },
  { key: 'WRONG_ITEM',    label: 'Wrong item sent',         icon: '📦' },
  { key: 'MISSING',       label: 'Item missing',            icon: '❓' },
  { key: 'NOT_AS_DESC',   label: 'Not as described',        icon: '🤔' },
  { key: 'LATE',          label: 'Very late delivery',      icon: '⏰' },
  { key: 'QUALITY',       label: 'Quality issue',           icon: '📉' },
  { key: 'FAKE',          label: 'Suspected fake/counterfeit', icon: '🚫' },
  { key: 'OTHER',         label: 'Other',                   icon: '💬' },
];

const RESOLUTIONS = [
  { key: 'REFUND',         label: 'Full refund',       icon: DollarSign,  color: 'from-brand-500 to-emerald-600' },
  { key: 'REPLACEMENT',    label: 'Replacement',       icon: Package,     color: 'from-info to-blue-700' },
  { key: 'PARTIAL_REFUND', label: 'Partial refund',    icon: RefreshCw,   color: 'from-accent-500 to-orange-600' },
  { key: 'OTHER',          label: 'Discuss with shop', icon: MessageCircle, color: 'from-purple-500 to-pink-500' },
];

interface Props {
  orderId: string;
  orderNumber: string;
  items: Array<{ id: string; productName: string; imageUrl?: string | null; quantity: number }>;
  onClose: () => void;
}

export function CreateDisputeModal({ orderId, orderNumber, items, onClose }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState<any>('REFUND');
  const [photos, setPhotos] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: () => disputeApi.create(orderId, {
      reason,
      description,
      itemIds: Array.from(selectedItems),
      photos,
      resolution,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      analytics.track('dispute_created', { order_id: orderId, reason, resolution });
      toast.success('Dispute submitted. We\'ll respond within 24 hours.');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="max-w-lg w-full max-h-[95vh] overflow-y-auto p-5 space-y-4 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-warning to-orange-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Report an issue</h3>
              <p className="text-xs text-content-muted">Order #{orderNumber} · Step {step} of 3</p>
            </div>
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-full transition',
                s <= step ? 'bg-brand-500' : 'bg-border',
              )}
            />
          ))}
        </div>

        {/* Step 1: Reason + items */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                What's the issue?
              </div>
              <div className="grid grid-cols-2 gap-2">
                {REASONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setReason(r.key)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition',
                      reason === r.key
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                        : 'border-border bg-surface hover:border-brand-300',
                    )}
                  >
                    <div className="text-xl mb-1">{r.icon}</div>
                    <div className="text-xs font-black">{r.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                Which items?
              </div>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const isSelected = selectedItems.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition',
                        isSelected ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-border',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const next = new Set(selectedItems);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          setSelectedItems(next);
                        }}
                        className="h-4 w-4 accent-brand-600"
                      />
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-surface-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold line-clamp-1">{item.productName}</div>
                        <div className="text-2xs text-content-muted">Qty: {item.quantity}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <Button
              variant="gradient"
              size="lg"
              fullWidth
              disabled={!reason || selectedItems.size === 0}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Description + photos */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                Describe the issue
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe what went wrong..."
                rows={5}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none"
                maxLength={500}
              />
              <div className="text-2xs text-content-muted mt-1 text-right">
                {description.length}/500
              </div>
            </div>

            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                Add photos (optional but helps)
              </div>
              <button
                type="button"
                className="w-full h-24 rounded-2xl border-2 border-dashed border-border hover:border-brand-400 text-content-muted hover:text-brand-600 flex flex-col items-center justify-center gap-1 transition"
              >
                <Camera className="h-5 w-5" />
                <span className="text-xs font-bold">Tap to add photos</span>
                <span className="text-2xs">Max 5 photos, 10MB each</span>
              </button>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="lg" fullWidth onClick={() => setStep(1)}>Back</Button>
              <Button
                variant="gradient"
                size="lg"
                fullWidth
                disabled={description.length < 10}
                onClick={() => setStep(3)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Resolution */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                What resolution would you prefer?
              </div>
              <div className="space-y-2">
                {RESOLUTIONS.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.key}
                      onClick={() => setResolution(r.key)}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition',
                        resolution === r.key
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                          : 'border-border bg-surface',
                      )}
                    >
                      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center shrink-0`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-black text-sm">{r.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Card className="p-3 bg-info/10 border-info/30 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <div className="text-2xs text-content">
                We'll review your case within 24 hours. If we can't resolve directly with the shop,
                we'll escalate to our resolution team.
              </div>
            </Card>

            <div className="flex gap-2">
              <Button variant="ghost" size="lg" fullWidth onClick={() => setStep(2)}>Back</Button>
              <Button
                variant="gradient"
                size="lg"
                fullWidth
                loading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Submit dispute
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
