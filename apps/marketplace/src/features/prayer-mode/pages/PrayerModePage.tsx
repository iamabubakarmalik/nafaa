import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  ArrowLeft, Moon, Sun, Clock, Calculator, TrendingUp,
  Sunrise, Sunset, Sparkles,
} from 'lucide-react';
import { prayerApi } from '../api/prayer.api';
import { useLocationStore } from '@/stores/location.store';
import { Button, Card, Input, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';

const PRAYER_ICONS: Record<string, any> = {
  Fajr: Sunrise,
  Dhuhr: Sun,
  Asr: Sun,
  Maghrib: Sunset,
  Isha: Moon,
  Jummah: Sparkles,
};

export default function PrayerModePage() {
  const navigate = useNavigate();
  const { city } = useLocationStore();
  const [tab, setTab] = useState<'times' | 'zakat'>('times');

  const { data: times } = useQuery({
    queryKey: ['prayer-times', city],
    queryFn: () => prayerApi.times(city || 'Lahore'),
    enabled: !!city,
  });

  return (
    <>
      <Helmet><title>Prayer & Ramzan Mode — Nafaa Bazaar</title></Helmet>

      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        {/* Hero */}
        <Card className="p-6 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              🕌 Islamic features
            </div>
            <h1 className="text-2xl md:text-3xl font-black leading-tight">
              Prayer & Ramzan Mode
            </h1>
            <p className="text-white/90 text-sm md:text-base mt-1">
              Prayer times, Zakat calculator, Sehri delivery slots
            </p>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {([
            { key: 'times', icon: Clock, label: 'Prayer times' },
            { key: 'zakat', icon: Calculator, label: 'Zakat calculator' },
          ] as const).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-3 text-sm font-black border-b-2 transition flex items-center gap-2 ${
                  tab === t.key
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-content-muted hover:text-content'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'times' && <PrayerTimes times={times} city={city} />}
        {tab === 'zakat' && <ZakatCalculator />}
      </div>
    </>
  );
}

function PrayerTimes({ times, city }: { times: any; city?: string | null }) {
  if (!times) {
    return (
      <Card className="p-8 text-center text-content-muted">
        Loading prayer times for {city || 'your city'}...
      </Card>
    );
  }

  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const isRamzan = times.isRamzan;

  return (
    <div className="space-y-3">
      {isRamzan && (
        <Card className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🌙</div>
            <div>
              <div className="font-black">Ramzan Mubarak!</div>
              <div className="text-xs opacity-90">Special Sehri delivery slots active</div>
            </div>
          </div>
        </Card>
      )}

      {times.hijriDate && (
        <Card className="p-3 text-center">
          <div className="text-xs text-content-muted">Hijri date</div>
          <div className="font-black text-content mt-1">{times.hijriDate}</div>
        </Card>
      )}

      <Card className="p-4">
        <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-3">
          Today's prayer times · {city}
        </div>
        <div className="space-y-2">
          {prayers.map((p) => {
            const Icon = PRAYER_ICONS[p];
            const time = times[p.toLowerCase()];
            return (
              <div key={p} className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-black">{p}</div>
                </div>
                <div className="font-black text-lg tabular-nums text-emerald-600 dark:text-emerald-400">
                  {time}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {times.sunrise && (
        <Card className="p-3 text-center bg-amber-50 dark:bg-amber-950/30">
          <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
            🌅 Sunrise: {times.sunrise}
          </div>
        </Card>
      )}
    </div>
  );
}

function ZakatCalculator() {
  const [form, setForm] = useState({
    cashAmount: '',
    goldGrams: '',
    silverGrams: '',
    investments: '',
    business: '',
    otherAssets: '',
    liabilities: '',
    goldRatePerGram: '25000',
  });
  const [result, setResult] = useState<any>(null);

  const calcMutation = useMutation({
    mutationFn: () => prayerApi.calculateZakat({
      cashAmount: Number(form.cashAmount) || 0,
      goldGrams: Number(form.goldGrams) || 0,
      silverGrams: Number(form.silverGrams) || 0,
      investments: Number(form.investments) || 0,
      business: Number(form.business) || 0,
      otherAssets: Number(form.otherAssets) || 0,
      liabilities: Number(form.liabilities) || 0,
      goldRatePerGram: Number(form.goldRatePerGram),
    }),
    onSuccess: (r) => {
      setResult(r);
      toast.success('Calculation complete');
    },
  });

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-start gap-2">
          <Calculator className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-black text-sm">Zakat Calculator</div>
            <div className="text-xs text-content-muted mt-1">
              Enter your assets & liabilities. Zakat is 2.5% of net wealth above Nisab.
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="text-xs font-black text-content-muted uppercase tracking-wider">
          💰 Assets
        </h3>

        <Input
          label="Cash on hand & bank (PKR)"
          type="number"
          placeholder="0"
          value={form.cashAmount}
          onChange={(e) => setForm({ ...form, cashAmount: e.target.value })}
        />
        <Input
          label="Gold (grams)"
          type="number"
          placeholder="0"
          value={form.goldGrams}
          onChange={(e) => setForm({ ...form, goldGrams: e.target.value })}
          hint={`Current rate: PKR ${Number(form.goldRatePerGram).toLocaleString()}/gram`}
        />
        <Input
          label="Silver (grams)"
          type="number"
          placeholder="0"
          value={form.silverGrams}
          onChange={(e) => setForm({ ...form, silverGrams: e.target.value })}
        />
        <Input
          label="Investments (PKR)"
          type="number"
          placeholder="0"
          value={form.investments}
          onChange={(e) => setForm({ ...form, investments: e.target.value })}
        />
        <Input
          label="Business assets (PKR)"
          type="number"
          placeholder="0"
          value={form.business}
          onChange={(e) => setForm({ ...form, business: e.target.value })}
        />
        <Input
          label="Other assets (PKR)"
          type="number"
          placeholder="0"
          value={form.otherAssets}
          onChange={(e) => setForm({ ...form, otherAssets: e.target.value })}
        />

        <h3 className="text-xs font-black text-content-muted uppercase tracking-wider mt-4">
          💳 Liabilities
        </h3>
        <Input
          label="Debts & liabilities (PKR)"
          type="number"
          placeholder="0"
          value={form.liabilities}
          onChange={(e) => setForm({ ...form, liabilities: e.target.value })}
        />

        <Input
          label="Gold rate per gram (PKR)"
          type="number"
          value={form.goldRatePerGram}
          onChange={(e) => setForm({ ...form, goldRatePerGram: e.target.value })}
        />

        <Button
          variant="gradient"
          size="lg"
          fullWidth
          loading={calcMutation.isPending}
          onClick={() => calcMutation.mutate()}
          leftIcon={<Calculator className="h-4 w-4" />}
        >
          Calculate Zakat
        </Button>
      </Card>

      {result && (
        <Card className={`p-5 border-2 ${
          result.isNisabMet
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-500'
        }`}>
          <div className="text-center">
            <div className="text-2xs font-black text-content-muted uppercase tracking-wider">
              Your Zakat
            </div>
            <div className="text-4xl md:text-5xl font-black gradient-text mt-2">
              {formatPrice(result.zakatDue)}
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-content-muted">Nisab threshold</span>
              <span className="font-bold">{formatPrice(result.nisabThreshold)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-muted">Your net wealth</span>
              <span className="font-bold">{formatPrice(result.paidAmount || 0)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-content-muted">Status</span>
              <Badge variant={result.isNisabMet ? 'success' : 'warning'}>
                {result.isNisabMet ? '✓ Nisab met' : 'Below Nisab'}
              </Badge>
            </div>
          </div>

          {!result.isNisabMet && (
            <div className="mt-3 p-3 rounded-xl bg-white/50 dark:bg-black/20 text-xs text-content-muted">
              Your wealth is below the Nisab threshold. Zakat is not obligatory this year.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
