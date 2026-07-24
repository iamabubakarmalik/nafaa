import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Gift, Users, Share2, Copy, Sparkles, MessageCircle } from 'lucide-react';
import { profileApi } from '../api/profile.api';
import { Card, Button, Avatar, EmptyState, Badge } from '@/ui';
import { toast } from 'sonner';
import { timeAgo } from '@/lib/format';

export default function ReferralsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['referrals'], queryFn: profileApi.referrals });

  if (isLoading || !data) return <div className="skeleton h-96 rounded-3xl" />;

  const shareUrl = `${window.location.origin}/register?ref=${data.referralCode}`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(data.referralCode);
    toast.success('Code copied!');
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  };

  const shareVia = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Nafaa Bazaar',
          text: `Sign up with my code ${data.referralCode} and we'll both get ${data.bonusPerReferral} points!`,
          url: shareUrl,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const whatsappShare = () => {
    const text = encodeURIComponent(
      `🎉 Hey! Join Nafaa Bazaar with my code *${data.referralCode}* and we'll both get ${data.bonusPerReferral} loyalty points!\n\n${shareUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
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
        <Card className="p-6 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 text-white border-0 relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="h-16 w-16 mx-auto rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
              <Gift className="h-8 w-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Refer friends, earn rewards</h1>
            <p className="text-white/90 text-sm md:text-base mt-1">
              Both you and your friend get <b>{data.bonusPerReferral} points</b> when they order
            </p>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <Users className="h-6 w-6 text-brand-600 mx-auto mb-2" />
            <div className="text-2xl font-black">{data.totalReferrals}</div>
            <div className="text-2xs text-content-muted font-bold uppercase">Friends joined</div>
          </Card>
          <Card className="p-4 text-center">
            <Sparkles className="h-6 w-6 text-accent-500 mx-auto mb-2" />
            <div className="text-2xl font-black">{data.totalReferrals * data.bonusPerReferral}</div>
            <div className="text-2xs text-content-muted font-bold uppercase">Points earned</div>
          </Card>
        </div>

        {/* Referral code */}
        <Card className="p-5 text-center">
          <div className="text-2xs font-black text-content-muted uppercase tracking-wider mb-2">
            Your referral code
          </div>
          <button
            onClick={copyCode}
            className="inline-block px-6 py-3 rounded-2xl bg-gradient-brand text-white text-3xl font-black tracking-widest shadow-brand hover:scale-105 transition"
          >
            {data.referralCode}
          </button>
          <div className="text-2xs text-content-muted mt-2">Tap to copy</div>
        </Card>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={copyLink}
            leftIcon={<Copy className="h-4 w-4" />}
          >
            Copy link
          </Button>
          <button
            onClick={whatsappShare}
            className="h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </button>
          <Button
            variant="gradient"
            size="lg"
            onClick={shareVia}
            leftIcon={<Share2 className="h-4 w-4" />}
          >
            Share
          </Button>
        </div>

        {/* How it works */}
        <Card className="p-5">
          <h3 className="font-black text-lg mb-3">How it works</h3>
          <div className="space-y-3">
            {[
              { step: 1, title: 'Share your code', desc: 'Send your referral code to friends via WhatsApp, SMS, or social media' },
              { step: 2, title: 'They sign up', desc: 'Your friend creates an account using your code' },
              { step: 3, title: 'Both get points', desc: `You and your friend both get ${data.bonusPerReferral} loyalty points when they place their first order` },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 flex items-center justify-center font-black text-sm shrink-0">
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

        {/* Referred friends */}
        {data.referredCustomers?.length > 0 && (
          <div>
            <h3 className="text-lg font-black mb-3">Your referrals</h3>
            <Card className="divide-y divide-border">
              {data.referredCustomers.map((f: any) => (
                <div key={f.id} className="flex items-center gap-3 p-4">
                  <Avatar name={f.fullName} src={f.avatarUrl} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm">{f.fullName}</div>
                    <div className="text-2xs text-content-muted">Joined {timeAgo(f.createdAt)}</div>
                  </div>
                  <Badge variant="brand" size="sm">+{data.bonusPerReferral} pts</Badge>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
