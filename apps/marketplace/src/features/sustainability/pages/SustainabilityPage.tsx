import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Leaf, TreePine, Recycle, Wind, Sun, Award,
  ShoppingBag, Package, Bike, Sparkles,
} from 'lucide-react';
import { marketplaceClient, unwrap } from '@/api/client';
import { Card, Badge, Button } from '@/ui';

export default function SustainabilityPage() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['sustainability-stats'],
    queryFn: () => marketplaceClient.get('/sustainability/mine').then(unwrap<any>),
  });

  return (
    <>
      <Helmet><title>My Impact — Sustainability | Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        {/* Hero */}
        <Card className="p-6 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-16 w-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Leaf className="h-8 w-8" />
              </div>
              <div>
                <div className="text-2xs opacity-90 font-black uppercase tracking-wider">Your green impact</div>
                <div className="text-4xl md:text-5xl font-black">{stats?.treesPlanted || 0} 🌳</div>
                <div className="text-sm opacity-90 mt-1">Trees planted through your purchases</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Impact stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { icon: TreePine, label: 'Trees planted', value: stats?.treesPlanted || 0, color: 'from-emerald-500 to-green-600', unit: '' },
            { icon: Wind, label: 'CO2 saved', value: stats?.co2SavedKg || 0, color: 'from-blue-500 to-cyan-600', unit: 'kg' },
            { icon: Recycle, label: 'Plastic saved', value: stats?.plasticSavedGrams || 0, color: 'from-teal-500 to-emerald-600', unit: 'g' },
            { icon: Package, label: 'Eco packages', value: stats?.ecoPackages || 0, color: 'from-amber-500 to-orange-600', unit: '' },
            { icon: Bike, label: 'Green deliveries', value: stats?.greenDeliveries || 0, color: 'from-purple-500 to-pink-600', unit: '' },
            { icon: Award, label: 'Impact score', value: stats?.impactScore || 0, color: 'from-yellow-500 to-amber-600', unit: 'pts' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="p-4 text-center">
                <div className={`h-11 w-11 mx-auto rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-2xl font-black">{s.value}{s.unit && <span className="text-sm text-content-muted ml-1">{s.unit}</span>}</div>
                <div className="text-2xs text-content-muted font-bold uppercase mt-0.5">{s.label}</div>
              </Card>
            );
          })}
        </div>

        {/* How it works */}
        <Card className="p-5">
          <h3 className="font-black text-lg mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            How it works
          </h3>
          <div className="space-y-3">
            {[
              { icon: '🌳', title: 'Plant a tree', desc: 'Add PKR 20 at checkout to plant one tree' },
              { icon: '📦', title: 'Eco packaging', desc: 'Choose shops that use biodegradable packaging (Leaf badge)' },
              { icon: '🚴', title: 'Green delivery', desc: 'Prefer shops with bicycle/EV riders' },
              { icon: '♻️', title: 'Recycle', desc: 'Return old packaging via our pickup program' },
            ].map((s, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="text-3xl">{s.icon}</div>
                <div>
                  <div className="font-black text-sm">{s.title}</div>
                  <div className="text-xs text-content-muted mt-0.5">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* CTA */}
        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🌱</div>
            <div className="flex-1">
              <div className="font-black text-sm">Shop with impact</div>
              <div className="text-xs text-content-muted mt-0.5">
                Look for the 🍃 Eco badge on products and shops
              </div>
            </div>
            <Button variant="gradient" size="sm" onClick={() => navigate('/search?ecoFriendly=true')}>
              Browse eco
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
