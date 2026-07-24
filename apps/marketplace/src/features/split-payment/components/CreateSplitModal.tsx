import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Users, Plus, Copy, Share2, Trash2 } from 'lucide-react';
import { splitPaymentApi } from '../api/split-payment.api';
import { Button, Card, Input } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';

interface Props {
  orderId: string;
  orderTotal: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface Participant {
  name: string;
  phone: string;
  shareAmount: number;
}

export function CreateSplitModal({ orderId, orderTotal, onClose, onSuccess }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([
    { name: '', phone: '', shareAmount: Math.round(orderTotal / 2) },
    { name: '', phone: '', shareAmount: Math.round(orderTotal / 2) },
  ]);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const totalShares = participants.reduce((s, p) => s + p.shareAmount, 0);
  const remaining = orderTotal - totalShares;

  const splitEvenly = () => {
    const each = Math.floor(orderTotal / participants.length);
    const rounding = orderTotal - each * participants.length;
    setParticipants(participants.map((p, i) => ({
      ...p, shareAmount: i === 0 ? each + rounding : each,
    })));
  };

  const createMutation = useMutation({
    mutationFn: () => splitPaymentApi.create({
      orderId,
      participants: participants.map((p) => ({
        phone: p.phone.replace(/\D/g, '').startsWith('92')
          ? '+' + p.phone.replace(/\D/g, '')
          : p.phone,
        name: p.name || undefined,
        shareAmount: p.shareAmount,
      })),
    }),
    onSuccess: (data) => {
      setShareLink(data.shareLink);
      toast.success('Split payment created! Share the link with friends');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const copyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    toast.success('Link copied!');
  };

  const shareVia = async () => {
    if (!shareLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Split payment on Nafaa',
          text: `Let's split this order! Total: ${formatPrice(orderTotal)}`,
          url: shareLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Split with friends</h3>
              <p className="text-xs text-content-muted">Total: {formatPrice(orderTotal)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!shareLink ? (
          <>
            <div className="space-y-3">
              {participants.map((p, i) => (
                <Card key={i} className="p-3 space-y-2 bg-surface-muted">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-content-muted uppercase">
                      Friend {i + 1}
                    </span>
                    {participants.length > 2 && (
                      <button
                        onClick={() => setParticipants(participants.filter((_, idx) => idx !== i))}
                        className="text-danger hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      inputSize="sm"
                      placeholder="Name"
                      value={p.name}
                      onChange={(e) => {
                        const next = [...participants];
                        next[i].name = e.target.value;
                        setParticipants(next);
                      }}
                    />
                    <Input
                      inputSize="sm"
                      placeholder="03001234567"
                      value={p.phone}
                      onChange={(e) => {
                        const next = [...participants];
                        next[i].phone = e.target.value;
                        setParticipants(next);
                      }}
                    />
                  </div>
                  <Input
                    inputSize="sm"
                    type="number"
                    placeholder="Their share"
                    value={p.shareAmount}
                    onChange={(e) => {
                      const next = [...participants];
                      next[i].shareAmount = Number(e.target.value);
                      setParticipants(next);
                    }}
                  />
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setParticipants([...participants, { name: '', phone: '', shareAmount: 0 }])}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add friend
              </Button>
              <Button variant="secondary" size="sm" fullWidth onClick={splitEvenly}>
                Split evenly
              </Button>
            </div>

            {/* Summary */}
            <Card className={`p-3 ${remaining !== 0 ? 'bg-danger/10 border-danger/30' : 'bg-brand-50 dark:bg-brand-950/30 border-brand-200'}`}>
              <div className="flex justify-between text-sm">
                <span className="text-content-muted">Order total</span>
                <span className="font-bold">{formatPrice(orderTotal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-content-muted">Sum of shares</span>
                <span className="font-bold">{formatPrice(totalShares)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1 pt-1 border-t border-border">
                <span className="font-black">Remaining</span>
                <span className={`font-black ${remaining !== 0 ? 'text-danger' : 'text-brand-600'}`}>
                  {formatPrice(remaining)}
                </span>
              </div>
            </Card>

            <Button
              variant="gradient"
              size="lg"
              fullWidth
              disabled={remaining !== 0 || participants.some((p) => !p.phone || p.shareAmount <= 0)}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create split payment
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <Card className="p-4 bg-brand-50 dark:bg-brand-950/30 border-brand-200 text-center">
              <div className="text-brand-600 font-black text-sm mb-2">✨ Split created!</div>
              <div className="text-xs text-content-muted mb-3">
                Share this link with your friends. SMS has been sent to their numbers.
              </div>
              <div className="p-2 rounded-lg bg-surface font-mono text-xs break-all">
                {shareLink}
              </div>
            </Card>

            <div className="flex gap-2">
              <Button variant="secondary" size="lg" fullWidth onClick={copyLink} leftIcon={<Copy className="h-4 w-4" />}>
                Copy link
              </Button>
              <Button variant="gradient" size="lg" fullWidth onClick={shareVia} leftIcon={<Share2 className="h-4 w-4" />}>
                Share
              </Button>
            </div>

            <Button variant="ghost" size="md" fullWidth onClick={() => { onSuccess(); onClose(); }}>
              Done
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
