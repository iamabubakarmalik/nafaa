import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Store, TrendingUp, Users, ShieldCheck, Zap, Gift, CheckCircle2,
  ArrowRight, Award, DollarSign, Package, MessageCircle,
} from 'lucide-react';
import { Button, Card, Badge } from '@/ui';

export default function BecomeSellerPage() {
  return (
    <>
      <Helmet><title>Become a Seller — Nafaa Bazaar</title></Helmet>

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Hero */}
        <Card className="p-6 md:p-12 bg-gradient-to-br from-brand-600 via-emerald-600 to-teal-700 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent-400/20 blur-3xl translate-y-1/4 -translate-x-1/4" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-4">
              <Award className="h-3.5 w-3.5" />
              Join 10,000+ shops in Pakistan
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-[1.05] mb-4">
              Sell on Nafaa Bazaar
            </h1>
            <p className="text-brand-50 text-lg md:text-xl leading-relaxed">
              Reach millions of customers. Zero setup fee. Sell online in under 24 hours.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/register?type=seller">
                <Button variant="glass" size="xl" rightIcon={<ArrowRight className="h-5 w-5" />}>
                  Start selling free
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="ghost" size="xl" className="text-white hover:bg-white/15">
                  Learn more
                </Button>
              </a>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Users, label: '500k+', desc: 'Active buyers' },
            { icon: Package, label: '2M+', desc: 'Orders monthly' },
            { icon: DollarSign, label: 'PKR 5B+', desc: 'GMV per year' },
            { icon: TrendingUp, label: '85%', desc: 'Seller retention' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="p-4 text-center">
                <Icon className="h-6 w-6 text-brand-600 mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-black gradient-text">{s.label}</div>
                <div className="text-2xs text-content-muted font-bold uppercase mt-1">{s.desc}</div>
              </Card>
            );
          })}
        </div>

        {/* Features */}
        <section id="how-it-works" className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-black">Why sell on Nafaa?</h2>
            <p className="text-content-muted mt-2">Everything you need to grow your business</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Zap, title: 'Instant setup', desc: 'List products in minutes. No technical skills required.', color: 'from-brand-500 to-emerald-600' },
              { icon: Users, title: 'Massive reach', desc: 'Get discovered by 500k+ shoppers actively searching daily.', color: 'from-info to-blue-700' },
              { icon: ShieldCheck, title: 'Secure payments', desc: 'JazzCash, EasyPaisa, Card — we handle it all safely.', color: 'from-purple-500 to-pink-500' },
              { icon: MessageCircle, title: 'Bargain feature', desc: 'Convert browsers to buyers with negotiation — unique to Nafaa.', color: 'from-accent-500 to-orange-600' },
              { icon: Award, title: 'Verification badges', desc: 'Bronze → Silver → Gold → Platinum. Build trust fast.', color: 'from-amber-500 to-yellow-600' },
              { icon: Gift, title: 'Marketing tools', desc: 'Flash sales, group deals, promo codes, live shopping.', color: 'from-rose-500 to-pink-600' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <Card key={i} className="p-5 hover:shadow-soft-lg transition group">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 group-hover:scale-110 transition`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-black text-lg mb-1">{f.title}</h3>
                  <p className="text-sm text-content-muted">{f.desc}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Pricing */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-black">Simple, transparent pricing</h2>
            <p className="text-content-muted mt-2">No hidden fees. Pay as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Starter', price: 0, desc: 'Perfect for testing', features: ['Up to 100 products', 'Basic listing', 'Standard support', '5% commission per sale'], cta: 'Start free' },
              { name: 'Growth', price: 2999, desc: 'Most popular', features: ['Unlimited products', 'Featured placement', 'Priority support', '3% commission', 'Bargain + Group Buy', 'Analytics dashboard'], cta: 'Start 14-day trial', popular: true },
              { name: 'Enterprise', price: null, desc: 'For big businesses', features: ['Everything in Growth', 'Dedicated account manager', 'Custom integrations', 'Multi-branch support', '2% commission', 'API access'], cta: 'Contact sales' },
            ].map((p, i) => (
              <Card key={i} className={`p-6 ${p.popular ? 'border-2 border-brand-500 shadow-brand relative' : ''}`}>
                {p.popular && (
                  <Badge variant="brand" size="lg" className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-md">
                    ⭐ Most popular
                  </Badge>
                )}
                <div className="text-center">
                  <div className="text-lg font-black">{p.name}</div>
                  <div className="text-2xs text-content-muted mt-1">{p.desc}</div>
                  <div className="mt-4">
                    {p.price === null ? (
                      <div className="text-3xl font-black">Custom</div>
                    ) : p.price === 0 ? (
                      <div className="text-4xl font-black text-brand-600">Free</div>
                    ) : (
                      <div>
                        <span className="text-4xl font-black">PKR {p.price}</span>
                        <span className="text-sm text-content-muted">/month</span>
                      </div>
                    )}
                  </div>
                </div>
                <ul className="mt-6 space-y-2">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={p.popular ? 'gradient' : 'secondary'}
                  size="lg"
                  fullWidth
                  className="mt-6"
                >
                  {p.cta}
                </Button>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Card className="p-8 md:p-12 text-center bg-gradient-brand text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black mb-3">Ready to grow your business?</h2>
            <p className="text-brand-50 text-lg mb-6">
              Join thousands of successful sellers on Pakistan's #1 marketplace.
            </p>
            <Link to="/register?type=seller">
              <Button variant="glass" size="xl" rightIcon={<ArrowRight className="h-5 w-5" />}>
                Start selling free
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
