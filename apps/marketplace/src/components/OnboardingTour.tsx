import { useEffect, useState } from 'react';
import {
  X, ArrowRight, ArrowLeft, Sparkles, MessageCircle,
  Bot, Mic, Users, Video,
} from 'lucide-react';
import { Button, Card } from '@/ui';
import { cn } from '@/lib/cn';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to Nafaa Bazaar! 🎉',
    body: 'Pakistan\'s most complete marketplace. Let us show you around in 30 seconds.',
    color: 'from-brand-500 to-emerald-600',
  },
  {
    icon: MessageCircle,
    title: 'Bargain like in the bazaar',
    body: 'See products with the "Bargain" badge? Make your offer and negotiate with shops just like traditional shopping.',
    color: 'from-accent-500 to-orange-600',
  },
  {
    icon: Users,
    title: 'Save more with group deals',
    body: 'Join Group Buys with your neighbors and unlock massive discounts. More people = lower price.',
    color: 'from-info to-blue-700',
  },
  {
    icon: Video,
    title: 'Watch live shopping shows',
    body: 'Shop hosts go live and showcase products. Ask questions in real-time chat, and buy featured items instantly.',
    color: 'from-rose-500 to-pink-600',
  },
  {
    icon: Mic,
    title: 'Voice search in Urdu',
    body: 'Say "do kilo aloo chahiye" — we understand Urdu, Roman Urdu, and English. Tap the mic anywhere.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Bot,
    title: 'AI Shopping Assistant',
    body: 'Tell our AI what you need — "shaadi ke kapre budget 15000" — and get instant curated results.',
    color: 'from-purple-500 to-pink-500',
  },
];

const STORAGE_KEY = 'onboarding-completed';

export function OnboardingTour() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Show after 3 seconds so it doesn't overwhelm on first load
    const t = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const complete = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setShow(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else complete();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!show) return null;

  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <Card className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up border-0 shadow-2xl">
        {/* Hero */}
        <div className={`p-8 bg-gradient-to-br ${s.color} text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <button
            onClick={complete}
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative z-10">
            <div className="h-16 w-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 animate-bounce-soft">
              <Icon className="h-8 w-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black leading-tight">{s.title}</h2>
            <p className="text-white/90 text-sm md:text-base mt-2 leading-relaxed">{s.body}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-8 bg-brand-600' : i < step ? 'w-1.5 bg-brand-400' : 'w-1.5 bg-border',
                )}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 ? (
              <Button variant="ghost" size="lg" fullWidth onClick={prev} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
            ) : (
              <Button variant="ghost" size="lg" fullWidth onClick={complete}>
                Skip
              </Button>
            )}
            <Button
              variant="gradient"
              size="lg"
              fullWidth
              onClick={next}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {step === STEPS.length - 1 ? 'Get started' : 'Next'}
            </Button>
          </div>

          <div className="text-center text-2xs text-content-muted">
            Step {step + 1} of {STEPS.length}
          </div>
        </div>
      </Card>
    </div>
  );
}
