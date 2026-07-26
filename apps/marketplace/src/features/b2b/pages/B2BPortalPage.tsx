import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Building2, TrendingUp, CheckCircle2, DollarSign,
  Package, ShieldCheck, Award, Users, Zap, ArrowRight,
} from 'lucide-react';
import { Button, Card, Badge } from '@/ui';

export default function B2BPortalPage() {
  const navigate = useNavigate();

  const TIER_BENEFITS = [
    { name: 'Standard', discount: '0%', credit: 'PKR 0', color: 'from-slate-500 to-slate-700', features: ['Basic pricing', 'COD only'] },
    { name: 'Preferred', discount: '5%', credit: 'PKR 50k', color: 'from-blue-500 to-blue-700', features: ['5% discount', '7-day credit', 'Priority support'] },
    { name: 'Partner', discount: '10%', credit: 'PKR 200k', color: 'from-purple-500 to-purple-700', features: ['10% discount', '15-day credit', 'Dedicated manager', 'Bulk shipping'] },
    { name: 'VIP', discount: '15%', credit: 'PKR 500k', color: 'from-amber-500 to-orange-600', features: ['15% discount', '30-day credit', 'Custom pricing', 'API access'] },
  ];

  return (
    <>
      <Helmet><title>B2B Wholesale — Nafaa Bazaar</title></Helmet>

      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Hero */}
        <Card className="p-6 md:p-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-4">
              <Building2 className="h-3.5 w-3.5" />
              Shop-to-Shop wholesale
            </div>
            <h1 className="text-3xl md:text-5xl font-black leading-tight mb-3">
              B2B Wholesale Portal
            </h1>
            <p className="text-white/90 text-lg leading-relaxed">
              Dukaandar-to-dukaandar bulk trading. Better prices, credit terms, priority support.
            </p>
            <Button variant="glass" size="xl" className="mt-6" rightIcon={<ArrowRight className="h-5 w-5" />}>
              Apply for B2B account
            </Button>
          </div>
        </Card>

        {/* Benefits */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: DollarSign, label: 'Save up to 15%', desc: 'Bulk discounts' },
            { icon: TrendingUp, label: 'Credit terms', desc: 'Up to 30 days' },
            { icon: Package, label: 'Bulk shipping', desc: 'Free above PKR 50k' },
            { icon: ShieldCheck, label: 'Verified sellers', desc: 'Only Gold+ shops' },
          ].map((b, i) => {
            const Icon = b.icon;
            return (
              <Card key={i} className="p-4 text-center">
                <Icon className="h-6 w-6 text-brand-600 mx-auto mb-2" />
                <div className="font-black text-sm">{b.label}</div>
                <div className="text-2xs text-content-muted mt-0.5">{b.desc}</div>
              </Card>
            );
          })}
        </div>

        {/* Tiers */}
        <section>
          <h2 className="text-2xl md:text-3xl font-black text-center mb-2">Choose your tier</h2>
          <p className="text-content-muted text-center mb-6">Unlock better prices as you grow</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIER_BENEFITS.map((t, i) => (
              <Card key={i} className="p-5 relative overflow-hidden">
                <div className={`h-16 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-3`}>
                  <Award className="h-8 w-8 text-white" />
                </div>
                <div className="font-black text-lg">{t.name}</div>
                <div className="mt-2">
                  <div className="text-3xl font-black gradient-text">{t.discount}</div>
                  <div className="text-2xs text-content-muted font-bold uppercase">Discount</div>
                </div>
                <div className="text-xs text-content-muted mt-2">
                  Credit limit: <strong className="text-content">{t.credit}</strong>
                </div>
                <ul className="mt-3 space-y-1">
                  {t.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-brand-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>

        {/* Requirements */}
        <Card className="p-5">
          <h3 className="font-black text-lg mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            Requirements to apply
          </h3>
          <div className="space-y-2">
            {[
              'Active business (retail shop, restaurant, wholesaler)',
              'CNIC / NTN number for verification',
              'Business proof (electricity bill, shop registration)',
              'Bank account for credit terms',
            ].map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* CTA */}
        <Card className="p-6 md:p-8 text-center bg-gradient-brand text-white border-0">
          <h3 className="text-2xl font-black mb-2">Ready to save more?</h3>
          <p className="text-brand-50 mb-4">Apply now, get approved within 48 hours</p>
          <Button variant="glass" size="xl" rightIcon={<ArrowRight className="h-5 w-5" />}>
            Start B2B application
          </Button>
        </Card>
      </div>
    </>
  );
}
