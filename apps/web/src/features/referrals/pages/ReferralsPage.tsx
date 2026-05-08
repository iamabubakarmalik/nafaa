import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Gift, Users, TrendingUp, Wallet, Copy, Check, Share2,
  MessageCircle, Mail, Award,
} from 'lucide-react';
import { referralsApi } from '@/api/referrals.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(value));

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['referrals-me'],
    queryFn: referralsApi.myDashboard,
  });

  if (isLoading || !data) {
    return <div className="p-6 text-slate-500">Loading...</div>;
  }

  const code = data.tenant.referralCode || '';
  const shareUrl = `${window.location.origin}/register?ref=${code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied!');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied!');
  };

  const shareWhatsapp = () => {
    const text = `Mein Nafaa POS use kar raha hoon — Pakistan ka sab se aasaan shop management system. Mere code "${code}" se signup karo!\n\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = () => {
    const subject = 'Try Nafaa POS — Pakistan ka best shop management system';
    const body = `Salaam!\n\nMein Nafaa POS use kar raha hoon aur ye bohot zabardast hai. Aap bhi try karein.\n\nMera referral code use karein: ${code}\n\nSignup link: ${shareUrl}\n\nShukriya!`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-pink-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Gift className="h-3.5 w-3.5" />
              Referral Program
            </div>
            <h2 className="mt-3 text-3xl font-bold">Earn While You Share!</h2>
            <p className="mt-2 text-sm text-white/80 max-w-xl">
              Apne dosto, family aur business owners ko refer karein. Har successful signup pe Rs {data.stats.rewardAmount}+ kamayein.
            </p>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Referrals</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {data.stats.totalReferrals}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Successful</div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">
                {data.stats.convertedCount}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Earned</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatPKR(data.stats.totalEarned)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/80">Available Credit</div>
              <div className="mt-2 text-2xl font-bold">
                {formatPKR(data.stats.currentCredit)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-1">Aap ka Referral Code</h3>
        <p className="text-sm text-slate-500 mb-5">Share karein aur kamayein</p>

        <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-white border-2 border-pink-200 p-6">
          <div className="text-xs text-pink-700 font-semibold uppercase tracking-wider mb-2">
            Your Code
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="font-mono text-3xl font-bold text-slate-900 tracking-wider">
              {code}
            </div>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-2 rounded-xl bg-pink-600 text-white px-4 py-2 text-sm font-semibold hover:bg-pink-700 transition"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <div className="mt-5 pt-5 border-t border-pink-200">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">
              Share Link
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-mono text-sm text-slate-700 bg-white rounded-lg px-3 py-2 border border-slate-200 break-all flex-1 min-w-[260px]">
                {shareUrl}
              </div>
              <button
                onClick={copyLink}
                className="rounded-lg border border-slate-200 hover:bg-slate-50 p-2"
                title="Copy link"
              >
                <Copy className="h-4 w-4 text-slate-700" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={shareWhatsapp}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white px-4 py-3 text-sm font-semibold hover:opacity-90 transition"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
            <button
              onClick={shareEmail}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 text-sm font-semibold hover:bg-blue-700 transition"
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold hover:bg-slate-800 transition"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        <div className="mt-5 grid sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
            <div className="font-bold text-slate-900">1️⃣ Share</div>
            <p className="text-slate-600 mt-1 text-xs">Apna code dosto ko bhejein</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
            <div className="font-bold text-slate-900">2️⃣ They Subscribe</div>
            <p className="text-slate-600 mt-1 text-xs">Woh signup karke pay karein</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200">
            <div className="font-bold text-emerald-900">3️⃣ You Earn!</div>
            <p className="text-emerald-700 mt-1 text-xs">
              Rs {data.stats.rewardAmount}+ ya {data.stats.rewardPercentage}% — jo zyada ho
            </p>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">My Referrals</h3>
            <p className="text-xs text-slate-500">Jin ko aap ne refer kiya</p>
          </div>

          {data.referrals.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto" />
              <p className="mt-3 text-sm text-slate-500">Abhi koi referral nahi</p>
              <p className="text-xs text-slate-400 mt-1">Apna code share karein!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {data.referrals.map((r) => (
                <div key={r.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">{r.referee.name}</div>
                    <div className="text-xs text-slate-500">
                      Joined: {formatDate(r.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'CONVERTED' || r.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-700'
                        : r.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {r.status}
                    </span>
                    {r.rewardAmount > 0 && (
                      <div className="text-xs text-emerald-700 font-bold mt-1">
                        +{formatPKR(r.rewardAmount)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Credit History</h3>
            <p className="text-xs text-slate-500">Aap ke account credits</p>
          </div>

          {data.credits.length === 0 ? (
            <div className="p-8 text-center">
              <Wallet className="h-12 w-12 text-slate-300 mx-auto" />
              <p className="mt-3 text-sm text-slate-500">Koi credit nahi</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {data.credits.map((c) => (
                <div key={c.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 text-sm">
                      {c.note || c.type}
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(c.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${c.amount > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {c.amount > 0 ? '+' : ''}{formatPKR(c.amount)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Bal: {formatPKR(c.balanceAfter)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
