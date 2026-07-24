import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Heart, Users, ShieldCheck, Zap, Sparkles,
  Store, MessageCircle, Video, Bot,
} from 'lucide-react';
import { Card } from '@/ui';

export default function AboutPage() {
  return (
    <>
      <Helmet><title>About Us — Nafaa Bazaar</title></Helmet>
      <div className="max-w-3xl mx-auto space-y-5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card className="p-6 md:p-10 bg-gradient-brand text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="text-6xl mb-4">🇵🇰</div>
            <h1 className="text-3xl md:text-5xl font-black mb-3">About Nafaa Bazaar</h1>
            <p className="text-brand-50 text-lg">
              Pakistan's most complete marketplace — connecting neighborhoods,
              shops, and shoppers with innovation and trust.
            </p>
          </div>
        </Card>

        <Card className="p-6 md:p-8 space-y-5">
          <div>
            <h2 className="text-xl font-black mb-2">Our story</h2>
            <p className="text-content-muted text-sm leading-relaxed">
              Nafaa Bazaar started with a simple idea: bring the traditional
              Pakistani <em>bazaar</em> experience online, but with modern conveniences.
              We built a platform where you can bargain like in the old days,
              join group deals with your neighbors, bid in auctions, watch live
              shopping shows, and chat with an AI assistant — all in Urdu or English.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black mb-3">What makes us different</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: MessageCircle, title: 'Bargain feature', desc: 'inDrive-style negotiation with shops', color: 'from-accent-500 to-orange-600' },
                { icon: Users, title: 'Group buy', desc: 'Unlock discounts by joining others', color: 'from-info to-blue-700' },
                { icon: Zap, title: 'Live auctions', desc: 'Bid on unique items in real-time', color: 'from-amber-500 to-red-500' },
                { icon: Video, title: 'Live shopping', desc: 'Watch shops livestream and buy instantly', color: 'from-rose-500 to-pink-600' },
                { icon: Bot, title: 'AI assistant', desc: 'Chat in Urdu — "shaadi ke kapre chahiye"', color: 'from-purple-500 to-pink-500' },
                { icon: Zap, title: '30-min delivery', desc: 'Emergency delivery with money-back guarantee', color: 'from-red-500 to-orange-600' },
                { icon: Users, title: 'Split payment', desc: 'Pay with friends via shareable links', color: 'from-purple-500 to-indigo-600' },
                { icon: ShieldCheck, title: 'Ramzan mode', desc: 'Prayer times, Zakat calculator, Sehri slots', color: 'from-emerald-500 to-teal-600' },
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="flex gap-3 p-3 rounded-2xl bg-surface-muted">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-black text-sm">{f.title}</div>
                      <div className="text-2xs text-content-muted mt-0.5">{f.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black mb-2">Our values</h2>
            <div className="space-y-2">
              {[
                { icon: '🤝', title: 'Trust', desc: 'Verified shops with Bronze/Silver/Gold/Platinum badges' },
                { icon: '🌍', title: 'Local first', desc: 'Empowering neighborhood shops across Pakistan' },
                { icon: '💚', title: 'Fair prices', desc: 'Bargain, group deals, and price comparisons' },
                { icon: '🕌', title: 'Cultural respect', desc: 'Prayer times, Ramzan mode, Zakat calculator' },
              ].map((v, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="text-2xl">{v.icon}</div>
                  <div>
                    <div className="font-black text-sm">{v.title}</div>
                    <div className="text-xs text-content-muted">{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border text-center">
            <p className="text-sm text-content-muted">
              Built with <Heart className="h-4 w-4 inline text-danger fill-danger" /> in Pakistan · 2026
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
