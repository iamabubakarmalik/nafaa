import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Save, Store, MapPin, Truck, CreditCard, Sparkles, BarChart3, Search,
  CheckCircle2, AlertCircle, Rocket, Eye, EyeOff, PauseCircle, ChevronRight, Clock,
} from 'lucide-react';
import { shopProfileApi } from '../shared/marketplace.api';
import type { MarketplaceShopProfile } from '../shared/types';
import { Button } from '@core/ui/Button';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { getIndustryTheme } from '../shared/industry-themes';

import BasicInfoSection from './sections/BasicInfoSection';
import LocationSection from './sections/LocationSection';
import HoursSection from './sections/HoursSection';
import DeliverySection from './sections/DeliverySection';
import PaymentSection from './sections/PaymentSection';
import FeaturesSection from './sections/FeaturesSection';
import StatsSection from './sections/StatsSection';
import ShopPreviewCard from './sections/ShopPreviewCard';

type SectionId = 'basic' | 'location' | 'hours' | 'delivery' | 'payment' | 'features' | 'stats';

interface SectionDef {
  id: SectionId; label: string; icon: any; color: string; desc: string; group: string;
}

const sections: SectionDef[] = [
  { id: 'basic',    label: 'Basic Info',         icon: Store,      color: 'emerald', desc: 'Name, logo, description',    group: 'Profile' },
  { id: 'location', label: 'Location & Contact', icon: MapPin,     color: 'blue',    desc: 'Address, phone, email',       group: 'Profile' },
  { id: 'hours',    label: 'Working Hours',      icon: Clock,      color: 'indigo',  desc: 'When shop is open',           group: 'Profile' },
  { id: 'delivery', label: 'Delivery Options',   icon: Truck,      color: 'amber',   desc: 'Fee, radius, time',           group: 'Business' },
  { id: 'payment',  label: 'Payment Methods',    icon: CreditCard, color: 'violet',  desc: 'JazzCash, Card, COD',         group: 'Business' },
  { id: 'features', label: 'Advanced Features',  icon: Sparkles,   color: 'pink',    desc: 'Bargain, Group Buy',          group: 'Advanced' },
  { id: 'stats',    label: 'Stats & Level',      icon: BarChart3,  color: 'cyan',    desc: 'Ratings, verification',       group: 'Advanced' },
];

const colorMap: any = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-500' },
  blue:    { bg: 'bg-blue-600',    text: 'text-blue-700',    light: 'bg-blue-50',    border: 'border-blue-500'    },
  indigo:  { bg: 'bg-indigo-600',  text: 'text-indigo-700',  light: 'bg-indigo-50',  border: 'border-indigo-500'  },
  amber:   { bg: 'bg-amber-500',   text: 'text-amber-700',   light: 'bg-amber-50',   border: 'border-amber-500'   },
  violet:  { bg: 'bg-violet-600',  text: 'text-violet-700',  light: 'bg-violet-50',  border: 'border-violet-500'  },
  pink:    { bg: 'bg-pink-600',    text: 'text-pink-700',    light: 'bg-pink-50',    border: 'border-pink-500'    },
  cyan:    { bg: 'bg-cyan-600',    text: 'text-cyan-700',    light: 'bg-cyan-50',    border: 'border-cyan-500'    },
};

const groups = ['Profile', 'Business', 'Advanced'];

export default function ShopProfilePage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const industryTheme = getIndustryTheme(industry?.id);

  const [active, setActive] = useState<SectionId>('basic');
  const [draft, setDraft] = useState<Partial<MarketplaceShopProfile>>({});
  const [search, setSearch] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['marketplace-shop-profile'],
    queryFn: shopProfileApi.get,
  });

  const updateMutation = useMutation({
    mutationFn: shopProfileApi.update,
    onSuccess: () => {
      toast.success('Profile save ho gayi ✅');
      qc.invalidateQueries({ queryKey: ['marketplace-shop-profile'] });
      qc.invalidateQueries({ queryKey: ['marketplace-dashboard'] });
      setDraft({});
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Save fail'),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      profile?.isListedOnMarketplace ? shopProfileApi.unpublish() : shopProfileApi.publish(),
    onSuccess: () => {
      toast.success(
        profile?.isListedOnMarketplace
          ? 'Shop unpublish ho gayi'
          : '🎉 Shop marketplace pe live ho gayi!',
      );
      qc.invalidateQueries({ queryKey: ['marketplace-shop-profile'] });
      qc.invalidateQueries({ queryKey: ['marketplace-dashboard'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });

  const merged = { ...profile, ...draft } as MarketplaceShopProfile;
  const hasChanges = Object.keys(draft).length > 0;

  const set = <K extends keyof MarketplaceShopProfile>(key: K, value: MarketplaceShopProfile[K]) => {
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

  // Completion score
  const completionScore = (() => {
    if (!profile) return 0;
    let score = 0;
    if (merged.publicName) score += 10;
    if (merged.tagline) score += 5;
    if (merged.description) score += 10;
    if (merged.logoUrl) score += 10;
    if (merged.coverUrl) score += 10;
    if (merged.city) score += 10;
    if (merged.addressLine1) score += 10;
    if (merged.publicPhone || merged.contactPhone) score += 10;
    if (merged.workingHours) score += 10;
    if (merged.offersDelivery || merged.offersPickup) score += 5;
    if (merged.acceptsCod || merged.acceptsCard || merged.acceptsJazzcash) score += 10;
    return Math.min(100, score);
  })();

  if (isLoading || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-10 w-10 text-emerald-600 animate-pulse mx-auto" />
          <p className="mt-3 text-sm font-black text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const isPublished = profile.isListedOnMarketplace;
  const isPaused = profile.isPaused;

  return (
    <div className="space-y-6 pb-24 min-h-screen">
      {/* HERO */}
      <section className={`rounded-3xl text-white p-6 shadow-2xl relative overflow-hidden bg-gradient-to-br ${industryTheme.gradient}`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <span>{industryTheme.emoji}</span> Shop Profile
              {isPublished ? (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px]">LIVE</span>
              ) : (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-500 text-white text-[9px]">DRAFT</span>
              )}
              {isPaused && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px]">PAUSED</span>
              )}
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-black">Marketplace Profile</h1>
            <p className="mt-1 text-sm text-white/85 font-medium">
              {profile.publicName || 'Aap ki shop'} — customers ko dikhne wali details customize karein
            </p>

            {/* Completion bar */}
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-xs font-black mb-1">
                <span>Profile Completion</span>
                <span>{completionScore}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: `${completionScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur text-white font-black text-xs border border-white/20"
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            {hasChanges && !hideSaveBar && (
              <Button size="lg" onClick={onSave} loading={updateMutation.isPending} className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
                <Save className="h-4 w-4" />
                Save {Object.keys(draft).length} Change{Object.keys(draft).length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Publish Banner */}
      <section className={`rounded-2xl p-5 border-2 shadow-sm ${
        isPublished
          ? isPaused
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
            : 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300'
          : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
      }`}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
            isPublished && !isPaused ? 'bg-emerald-500' : 'bg-amber-500'
          }`}>
            {isPublished && !isPaused ? (
              <CheckCircle2 className="h-7 w-7 text-white" />
            ) : isPaused ? (
              <PauseCircle className="h-7 w-7 text-white" />
            ) : (
              <Rocket className="h-7 w-7 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="font-black text-lg text-slate-900">
              {isPublished && !isPaused
                ? '✅ Aap ki shop live hai!'
                : isPaused
                  ? '⏸️ Shop temporarily paused'
                  : '🚀 Publish karne ke liye tayyar?'}
            </div>
            <p className="text-sm text-slate-700 font-medium mt-1">
              {isPublished && !isPaused
                ? 'Customers Nafaa Bazaar pe aap ki shop dhoondh sakte hain. Products bhi individually publish karne honge.'
                : isPaused
                  ? `Reason: ${profile.pausedReason || 'Manually paused'}. Customers ko show hoga but orders nahi le rahi.`
                  : 'Neeche wali details fill karein, phir "Publish" karke shop marketplace pe live karein.'}
            </p>
            {completionScore < 60 && !isPublished && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-800 font-bold">
                <AlertCircle className="h-3.5 w-3.5" />
                Publish karne se pehle profile 60% complete karein (currently {completionScore}%)
              </div>
            )}
          </div>
          <Button
            size="lg"
            onClick={() => publishMutation.mutate()}
            loading={publishMutation.isPending}
            disabled={!isPublished && completionScore < 60}
            className={isPublished ? 'bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
          >
            {isPublished ? (
              <><EyeOff className="h-4 w-4" />Unpublish</>
            ) : (
              <><Rocket className="h-4 w-4" />Publish to Marketplace</>
            )}
          </Button>
        </div>
      </section>

      {/* Layout with optional preview */}
      <div className={`grid gap-6 items-start ${showPreview ? 'lg:grid-cols-[280px_1fr_340px]' : 'lg:grid-cols-[300px_1fr]'}`}>
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
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0">
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
              {active === 'basic'    && <BasicInfoSection s={merged} set={set} industry={industry?.id} />}
              {active === 'location' && <LocationSection s={merged} set={set} />}
              {active === 'hours'    && <HoursSection s={merged} set={set} />}
              {active === 'delivery' && <DeliverySection s={merged} set={set} />}
              {active === 'payment'  && <PaymentSection s={merged} set={set} />}
              {active === 'features' && <FeaturesSection s={merged} set={set} />}
              {active === 'stats'    && <StatsSection s={merged} />}
            </div>
          </div>
        </main>

        {/* Live Preview */}
        {showPreview && (
          <aside className="lg:sticky lg:top-4 h-fit">
            <div className="rounded-3xl bg-white border-2 border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">Live Preview</span>
                <span className="ml-auto text-[9px] font-black bg-emerald-500 px-1.5 py-0.5 rounded">Customer View</span>
              </div>
              <div className="p-4">
                <ShopPreviewCard s={merged} theme={industryTheme} />
              </div>
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[10px] font-bold text-slate-500 text-center">
                Ye customers ko marketplace pe dikhega
              </div>
            </div>
          </aside>
        )}
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
