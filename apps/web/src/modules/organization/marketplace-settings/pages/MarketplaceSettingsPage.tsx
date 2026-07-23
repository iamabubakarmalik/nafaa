import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Globe, Save, Store, MapPin, Truck, CreditCard, Sparkles, BarChart3,
  ChevronRight, Search, CheckCircle2, AlertCircle, ShoppingBag, Rocket,
} from 'lucide-react';
import { marketplaceSettingsApi, type MarketplaceProfile } from '../api/marketplace-settings.api';
import { Button } from '@core/ui/Button';

import BasicInfoSection from '../sections/BasicInfoSection';
import LocationSection from '../sections/LocationSection';
import DeliverySection from '../sections/DeliverySection';
import PaymentSection from '../sections/PaymentSection';
import FeaturesSection from '../sections/FeaturesSection';
import StatsSection from '../sections/StatsSection';

type SectionId = 'basic' | 'location' | 'delivery' | 'payment' | 'features' | 'stats';

interface SectionDef {
  id: SectionId; label: string; icon: any; color: string; desc: string; group: string;
}

const sections: SectionDef[] = [
  { id: 'basic',    label: 'Basic Info',         icon: Store,       color: 'emerald', desc: 'Name, tagline, logo',       group: 'Profile' },
  { id: 'location', label: 'Location & Contact', icon: MapPin,      color: 'blue',    desc: 'Address, phone, email',      group: 'Profile' },
  { id: 'delivery', label: 'Delivery',           icon: Truck,       color: 'amber',   desc: 'Fee, radius, time',          group: 'Business' },
  { id: 'payment',  label: 'Payment Methods',    icon: CreditCard,  color: 'violet',  desc: 'JazzCash, Card, COD',        group: 'Business' },
  { id: 'features', label: 'Advanced Features',  icon: Sparkles,    color: 'pink',    desc: 'Bargain, Group Buy',         group: 'Advanced' },
  { id: 'stats',    label: 'Stats & Level',      icon: BarChart3,   color: 'cyan',    desc: 'Ratings, verification',      group: 'Advanced' },
];

const colorMap: any = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-500' },
  blue:    { bg: 'bg-blue-600',    text: 'text-blue-700',    light: 'bg-blue-50',    border: 'border-blue-500'    },
  amber:   { bg: 'bg-amber-500',   text: 'text-amber-700',   light: 'bg-amber-50',   border: 'border-amber-500'   },
  violet:  { bg: 'bg-violet-600',  text: 'text-violet-700',  light: 'bg-violet-50',  border: 'border-violet-500'  },
  pink:    { bg: 'bg-pink-600',    text: 'text-pink-700',    light: 'bg-pink-50',    border: 'border-pink-500'    },
  cyan:    { bg: 'bg-cyan-600',    text: 'text-cyan-700',    light: 'bg-cyan-50',    border: 'border-cyan-500'    },
};

const groups = ['Profile', 'Business', 'Advanced'];

export default function MarketplaceSettingsPage() {
  const qc = useQueryClient();
  const [active, setActive] = useState<SectionId>('basic');
  const [draft, setDraft] = useState<Partial<MarketplaceProfile>>({});
  const [search, setSearch] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['marketplace-profile'],
    queryFn: marketplaceSettingsApi.getProfile,
  });

  const updateMutation = useMutation({
    mutationFn: marketplaceSettingsApi.updateProfile,
    onSuccess: () => {
      toast.success('Marketplace settings save ho gayi ✅');
      qc.invalidateQueries({ queryKey: ['marketplace-profile'] });
      setDraft({});
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Save fail'),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      profile?.isListedOnMarketplace
        ? marketplaceSettingsApi.unpublishShop()
        : marketplaceSettingsApi.publishShop(),
    onSuccess: () => {
      toast.success(
        profile?.isListedOnMarketplace
          ? 'Shop unpublish ho gayi'
          : '🎉 Shop marketplace pe live ho gayi!',
      );
      qc.invalidateQueries({ queryKey: ['marketplace-profile'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });

  const merged = { ...profile, ...draft } as MarketplaceProfile;
  const hasChanges = Object.keys(draft).length > 0;

  const set = <K extends keyof MarketplaceProfile>(key: K, value: MarketplaceProfile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onSave = () => {
    if (!hasChanges) { toast.info('Koi changes nahi hain'); return; }
    updateMutation.mutate(draft);
  };

  const activeSection = sections.find((s) => s.id === active)!;
  const colors = colorMap[activeSection.color];

  const filteredSections = search
    ? sections.filter((s) =>
        s.label.toLowerCase().includes(search.toLowerCase()) ||
        s.desc.toLowerCase().includes(search.toLowerCase()),
      )
    : sections;

  const hideSaveBar = active === 'stats';

  if (isLoading || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-10 w-10 text-emerald-600 animate-pulse mx-auto" />
          <p className="mt-3 text-sm font-black text-slate-600">Loading marketplace profile...</p>
        </div>
      </div>
    );
  }

  const isPublished = profile.isListedOnMarketplace;

  return (
    <div className="space-y-6 pb-24">
      {/* Hero */}
      <section className={`rounded-3xl text-white p-6 shadow-2xl relative overflow-hidden ${
        isPublished
          ? 'bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700'
          : 'bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700'
      }`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Globe className="h-3.5 w-3.5" />
              {isPublished ? 'LIVE on Nafaa Bazaar' : 'Not Published Yet'}
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl font-black">Marketplace Settings</h2>
            <p className="mt-1 text-sm text-white/80 font-medium">
              {profile.publicName || 'Aap ki shop'} — Nafaa Bazaar pe apni dukan customize karein
            </p>
          </div>
          {hasChanges && !hideSaveBar && (
            <Button size="lg" onClick={onSave} loading={updateMutation.isPending} className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
              <Save className="h-4 w-4" />
              Save {Object.keys(draft).length} Change{Object.keys(draft).length > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </section>

      {/* Publish Banner */}
      <section className={`rounded-2xl p-5 border-2 shadow-sm ${
        isPublished
          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300'
          : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
      }`}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
            isPublished ? 'bg-emerald-500' : 'bg-amber-500'
          }`}>
            {isPublished ? <CheckCircle2 className="h-7 w-7 text-white" /> : <Rocket className="h-7 w-7 text-white" />}
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="font-black text-lg text-slate-900">
              {isPublished ? '✅ Aap ki shop live hai!' : '🚀 Publish karne ke liye tayyar?'}
            </div>
            <p className="text-sm text-slate-700 font-medium mt-1">
              {isPublished
                ? 'Customers Nafaa Bazaar pe aap ki shop dhoondh sakte hain. Product bhi individually publish karne honge.'
                : 'Neeche wali details fill karein, phir "Publish" karke aap ki shop marketplace pe live karein.'}
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => publishMutation.mutate()}
            loading={publishMutation.isPending}
            className={isPublished ? 'bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
          >
            {isPublished ? (
              <><AlertCircle className="h-4 w-4" />Unpublish</>
            ) : (
              <><Rocket className="h-4 w-4" />Publish to Marketplace</>
            )}
          </Button>
        </div>
      </section>

      {/* Layout */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-4 h-fit">
          <div className="rounded-3xl bg-white border-2 border-slate-100 p-3 shadow-sm">
            <div className="relative mb-3">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search settings..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border-2 border-slate-200 text-sm font-medium outline-none focus:border-emerald-500"
              />
            </div>

            {search ? (
              <div className="space-y-1">
                {filteredSections.map((s) => {
                  const Icon = s.icon;
                  const isActive = active === s.id;
                  const c = colorMap[s.color];
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActive(s.id)}
                      className={`w-full text-left rounded-xl p-2.5 flex items-center gap-2.5 transition ${
                        isActive ? `${c.light} ${c.text}` : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? c.bg + ' text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-xs font-black truncate">{s.label}</div>
                    </button>
                  );
                })}
                {filteredSections.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500 font-medium">
                    "{search}" ke liye kuch nahi mila
                  </div>
                )}
              </div>
            ) : (
              groups.map((group) => (
                <div key={group} className="mb-3 last:mb-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-1.5">{group}</div>
                  {sections.filter((s) => s.group === group).map((s) => {
                    const Icon = s.icon;
                    const isActive = active === s.id;
                    const c = colorMap[s.color];
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActive(s.id)}
                        className={`w-full text-left rounded-xl p-2.5 flex items-center gap-2.5 transition mb-1 ${
                          isActive ? `${c.light} ${c.text}` : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive ? c.bg + ' text-white shadow' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black truncate">{s.label}</div>
                          <div className="text-[10px] text-slate-500 truncate font-medium">{s.desc}</div>
                        </div>
                        {isActive && <ChevronRight className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}

            <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-start gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-black text-emerald-900">Tip</div>
                  <div className="text-emerald-700 font-medium mt-0.5">
                    Shop publish karne ke baad, har product ko alag se publish karna hoga
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main>
          <div className="rounded-3xl bg-slate-50/50 border-2 border-slate-100 overflow-hidden">
            <div className={`${colors.light} px-6 py-5 border-b-2 border-white flex items-center gap-3`}>
              <div className={`h-12 w-12 rounded-2xl ${colors.bg} text-white flex items-center justify-center shadow-md`}>
                <activeSection.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-900">{activeSection.label}</h3>
                <p className="text-sm text-slate-600 font-medium">{activeSection.desc}</p>
              </div>
            </div>

            <div className="p-6">
              {active === 'basic'    && <BasicInfoSection s={merged} set={set} />}
              {active === 'location' && <LocationSection s={merged} set={set} />}
              {active === 'delivery' && <DeliverySection s={merged} set={set} />}
              {active === 'payment'  && <PaymentSection s={merged} set={set} />}
              {active === 'features' && <FeaturesSection s={merged} set={set} />}
              {active === 'stats'    && <StatsSection s={merged} />}
            </div>
          </div>
        </main>
      </div>

      {/* Sticky save bar */}
      {hasChanges && !hideSaveBar && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border-2 border-emerald-500">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span className="text-sm font-black">
            {Object.keys(draft).length} unsaved change{Object.keys(draft).length > 1 ? 's' : ''}
          </span>
          <div className="w-px h-6 bg-emerald-400" />
          <button onClick={() => setDraft({})} className="text-xs font-black text-emerald-100 hover:text-white transition">
            Discard
          </button>
          <Button size="sm" onClick={onSave} loading={updateMutation.isPending} className="bg-white text-emerald-700 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Save All
          </Button>
        </div>
      )}
    </div>
  );
}
