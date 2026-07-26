import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Users, Gift, Copy, Check, Share2, Sparkles,
  TrendingUp, DollarSign,
} from 'lucide-react';
import { marketplaceClient, unwrap } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { Card, Button, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';

export default function ReferralsPage() {
  const navigate = useNavigate();
  const customer = useAuthStore((s) => s.customer) as any;
  const [copied, setCopied] = useState(false);

  const { data } = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      try {
        return await marketplaceClient.get('/profile/referrals').then(unwrap<any>);
      } catch {
        return { code: customer?.referralCode, referred: [], earnedPoints: 0, earnedAmount: 0 };
      }
    },
    enabled: !!customer,
    retry: false,
  });

  const code = data?.code || customer?.referralCode || '';
  const shareUrl = `${window.location.origin}/register?ref=${code}`;
  const shareText = `Join Nafaa Bazaar — Pakistan's #1 marketplace! Use my code ${code} to get 100 loyalty points 🎁`;

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOn = {
    whatsapp: () => window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`, '_blank'),
    facebook: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank'),
    twitter: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank'),
    native: async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Nafaa Bazaar', text: shareText, url: shareUrl });
        } catch {}
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied!');
      }
    },
  };

  return (
    <>
      <Helmet><title>Refer & Earn — Nafaa Bazaar</title></Helmet>

      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        {/* Hero */}
        <Card className="p-6 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              Refer & Earn
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Invite friends, earn rewards</h1>
            <p className="text-white/90 text-sm md:text-base mt-1">
              You get <strong>100 points</strong>, they get <strong>100 points</strong> — everyone wins!
            </p>
          </div>
        </Card>

        {/* Referral Code */}
        <Card className="p-5">
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
            Your referral code
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-14 rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/30 dark:to-emerald-950/30 border-2 border-dashed border-brand-400 flex items-center justify-center font-black text-2xl tracking-wider text-brand-700 dark:text-brand-400">
              {code || 'Loading...'}
            </div>
            <Button
              variant="gradient"
              size="lg"
              onClick={copy}
              leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="mt-3 text-2xs text-content-muted font-bold">
            Share link:{' '}
            <span className="text-content font-mono break-all">{shareUrl}</span>
          </div>
        </Card>

        {/* Share buttons */}
        <Card className="p-5">
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-3">
            Share with friends
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { key: 'whatsapp', label: 'WhatsApp', emoji: '💬', color: 'from-emerald-500 to-green-600', fn: shareOn.whatsapp },
              { key: 'facebook', label: 'Facebook', emoji: '📘', color: 'from-blue-600 to-blue-800', fn: shareOn.facebook },
              { key: 'twitter', label: 'Twitter', emoji: '🐦', color: 'from-sky-400 to-sky-600', fn: shareOn.twitter },
              { key: 'more', label: 'More', emoji: '📤', color: 'from-slate-500 to-slate-700', fn: shareOn.native },
            ].map((s) => (
              <button
                key={s.key}
                onClick={s.fn}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition`}>
                  {s.emoji}
                </div>
                <span className="text-2xs font-black text-content-muted">{s.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: 'Referred', value: (data as any)?.referred?.length || 0, color: 'from-purple-500 to-pink-600' },
            { icon: Sparkles, label: 'Points earned', value: (data as any)?.earnedPoints || 0, color: 'from-brand-500 to-emerald-600' },
            { icon: DollarSign, label: 'Cashback', value: formatPrice((data as any)?.earnedAmount || 0), color: 'from-accent-500 to-orange-600' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="p-4 text-center">
                <div className={`h-10 w-10 mx-auto rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-lg font-black">{s.value}</div>
                <div className="text-2xs text-content-muted font-bold uppercase mt-0.5">{s.label}</div>
              </Card>
            );
          })}
        </div>

        {/* Referred friends list */}
        {(data as any)?.referred?.length > 0 && (
          <Card className="p-5">
            <h3 className="font-black text-lg mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-600" />
              Friends who joined ({(data as any).referred.length})
            </h3>
            <div className="divide-y divide-border">
              {(data as any).referred.map((r: any) => (
                <div key={r.id} className="py-2.5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-black">
                    {r.fullName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{r.fullName || 'Anonymous'}</div>
                    <div className="text-2xs text-content-muted">
                      Joined {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {r.hasFirstOrder ? (
                    <Badge variant="brand" size="sm">
                      <Check className="h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">Pending</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* How it works */}
        <Card className="p-5 bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/30 dark:to-emerald-950/30 border-brand-200 dark:border-brand-800">
          <h3 className="font-black text-lg mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            How it works
          </h3>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Share your code', desc: 'Send it to friends via WhatsApp, SMS, or social media' },
              { step: '2', title: 'Friend signs up & shops', desc: 'They use your code and place their first order' },
              { step: '3', title: 'Both earn rewards', desc: 'You get 100 points + they get 100 points 🎉' },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-brand flex items-center justify-center text-white font-black shrink-0">
                  {s.step}
                </div>
                <div>
                  <div className="font-black text-sm">{s.title}</div>
                  <div className="text-xs text-content-muted mt-0.5">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
