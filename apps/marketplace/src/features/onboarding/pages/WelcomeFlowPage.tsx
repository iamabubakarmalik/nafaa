import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, ArrowLeft, MapPin, Heart, Bell, Sparkles,
  CheckCircle2, ShoppingBag, Users, Zap,
} from 'lucide-react';
import { useLocationStore } from '@/stores/location.store';
import { profileApi } from '@/features/profile/api/profile.api';
import { Button, Card, Input } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const CATEGORIES = [
  { key: 'food', label: 'Food & Restaurants', emoji: '🍔' },
  { key: 'grocery', label: 'Groceries', emoji: '🛒' },
  { key: 'fashion', label: 'Fashion', emoji: '👗' },
  { key: 'electronics', label: 'Electronics', emoji: '📱' },
  { key: 'home', label: 'Home & Living', emoji: '🏠' },
  { key: 'beauty', label: 'Beauty', emoji: '💄' },
  { key: 'health', label: 'Health & Pharmacy', emoji: '💊' },
  { key: 'books', label: 'Books', emoji: '📚' },
];

export default function WelcomeFlowPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { requestGeolocation, city } = useLocationStore();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [phone, setPhone] = useState('');
  const [enableNotifs, setEnableNotifs] = useState(true);

  const next = () => setStep(step + 1);
  const prev = () => setStep(step - 1);
  const skip = () => navigate('/');
  const finish = () => {
    localStorage.setItem('welcome-completed', 'true');
    toast.success('Welcome to Nafaa Bazaar! 🎉');
    navigate('/');
  };

  const detectLocationMutation = useMutation({
    mutationFn: async () => {
      const ok = await requestGeolocation();
      if (!ok) throw new Error('Location denied');
      return ok;
    },
    onSuccess: () => toast.success('Location detected!'),
  });

  const toggleCategory = (key: string) => {
    const next = new Set(selectedCategories);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedCategories(next);
  };

  return (
    <>
      <Helmet><title>Welcome — Nafaa Bazaar</title></Helmet>

      <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4">
        <div className="w-full max-w-lg">
          {/* Progress */}
          <div className="flex gap-1.5 mb-6">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all',
                  s <= step ? 'bg-gradient-brand' : 'bg-surface-muted',
                )}
              />
            ))}
          </div>

          <Card className="p-6 md:p-8 shadow-soft-lg space-y-5">
            {step === 1 && (
              <>
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-bounce-soft">👋</div>
                  <h1 className="text-2xl md:text-3xl font-black">Welcome!</h1>
                  <p className="text-content-muted mt-2">
                    Let's personalize your experience in 30 seconds
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: ShoppingBag, label: '10,000+ shops' },
                    { icon: Users, label: '500k+ users' },
                    { icon: Zap, label: 'Fast delivery' },
                    { icon: Sparkles, label: 'Best prices' },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div key={i} className="p-3 rounded-xl bg-surface-muted flex items-center gap-2">
                        <Icon className="h-4 w-4 text-brand-600" />
                        <span className="text-xs font-black">{s.label}</span>
                      </div>
                    );
                  })}
                </div>

                <Button variant="gradient" size="lg" fullWidth onClick={next} rightIcon={<ArrowRight className="h-5 w-5" />}>
                  Get started
                </Button>
                <button onClick={skip} className="w-full text-xs text-content-muted hover:text-content font-bold">
                  Skip setup
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-brand flex items-center justify-center mb-4">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-black">Set your location</h1>
                  <p className="text-content-muted mt-2 text-sm">
                    So we can show you nearby shops with fast delivery
                  </p>
                </div>

                {city ? (
                  <Card className="p-4 bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-800 text-center">
                    <CheckCircle2 className="h-6 w-6 text-brand-600 mx-auto mb-1" />
                    <div className="font-black">{city}</div>
                    <div className="text-2xs text-content-muted mt-0.5">Location set</div>
                  </Card>
                ) : (
                  <Button
                    variant="gradient"
                    size="lg"
                    fullWidth
                    loading={detectLocationMutation.isPending}
                    onClick={() => detectLocationMutation.mutate()}
                    leftIcon={<MapPin className="h-5 w-5" />}
                  >
                    Detect my location
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button variant="ghost" size="lg" fullWidth onClick={prev} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                    Back
                  </Button>
                  <Button variant="gradient" size="lg" fullWidth onClick={next} rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Continue
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-to-br from-accent-500 to-orange-600 flex items-center justify-center mb-4">
                    <Heart className="h-8 w-8 text-white fill-white" />
                  </div>
                  <h1 className="text-2xl font-black">What do you love shopping?</h1>
                  <p className="text-content-muted mt-2 text-sm">
                    We'll personalize your feed (select any {selectedCategories.size > 0 ? `— ${selectedCategories.size} selected` : ''})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => {
                    const active = selectedCategories.has(c.key);
                    return (
                      <button
                        key={c.key}
                        onClick={() => toggleCategory(c.key)}
                        className={cn(
                          'p-3 rounded-2xl border-2 transition flex items-center gap-2 text-left',
                          active
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                            : 'border-border bg-surface hover:border-brand-300',
                        )}
                      >
                        <span className="text-2xl">{c.emoji}</span>
                        <span className={cn('text-xs font-black flex-1', active ? 'text-brand-700 dark:text-brand-400' : 'text-content')}>
                          {c.label}
                        </span>
                        {active && <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="lg" fullWidth onClick={prev} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                    Back
                  </Button>
                  <Button variant="gradient" size="lg" fullWidth onClick={next} rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Continue
                  </Button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 animate-bounce-soft">
                    <Bell className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-black">Stay updated</h1>
                  <p className="text-content-muted mt-2 text-sm">
                    Get notified about order updates, deals, and messages
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    { icon: '📦', label: 'Order updates', desc: 'Delivery tracking, status changes' },
                    { icon: '🎁', label: 'Deals & offers', desc: 'Flash sales, exclusive coupons' },
                    { icon: '💬', label: 'Messages', desc: 'From shops and support' },
                  ].map((n, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted">
                      <div className="text-2xl">{n.icon}</div>
                      <div className="flex-1">
                        <div className="text-xs font-black">{n.label}</div>
                        <div className="text-2xs text-content-muted">{n.desc}</div>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-brand-600" />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="lg" fullWidth onClick={prev} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                    Back
                  </Button>
                  <Button variant="gradient" size="lg" fullWidth onClick={finish} rightIcon={<CheckCircle2 className="h-4 w-4" />}>
                    Finish setup
                  </Button>
                </div>
              </>
            )}
          </Card>

          <div className="text-center mt-4">
            <button onClick={skip} className="text-xs text-content-muted hover:text-content font-bold">
              Skip and go to home →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
