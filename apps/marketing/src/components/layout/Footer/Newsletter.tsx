'use client';

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/LocaleProvider';
import { trackEvent } from '@/lib/analytics/events';
import { cn } from '@/lib/cn';

export function Newsletter() {
  const { t, locale } = useLocale();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const isUr = locale === 'ur';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(isUr ? 'درست ای میل درج کریں' : 'Please enter a valid email');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'FOOTER', sourceUrl: window.location.pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Subscribe failed');
      setOk(true);
      trackEvent('newsletter_signup', { source: 'footer', email_domain: email.split('@')[1] });
    toast.success(isUr ? 'شکریہ! جلد ملاقات ہوگی۔' : 'Thanks — see you soon.');
      setEmail('');
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : isUr ? 'مسئلہ ہوا — دوبارہ کوشش کریں' : 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-700 p-8 lg:p-10 text-white overflow-hidden relative">
      <div className="absolute -top-16 -right-16 h-64 w-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-64 w-64 bg-aurora-purple/20 rounded-full blur-3xl" />
      <div className="relative">
        <div className={`text-eyebrow font-mono text-white/70 ${isUr ? 'font-urdu text-sm' : ''}`}>
          {isUr ? 'خبرنامہ' : 'Newsletter'}
        </div>
        <h3 className={`mt-3 font-display font-extrabold text-2xl leading-tight ${isUr ? 'font-urdu text-3xl leading-snug' : ''}`}>
          {t('footer.newsletterTitle')}
        </h3>
        <p className={`mt-2 text-white/85 text-sm leading-relaxed ${isUr ? 'font-urdu text-base leading-loose' : ''}`}>
          {t('footer.newsletterSubtitle')}
        </p>
        <form onSubmit={submit} className="mt-5 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('footer.newsletterPlaceholder')}
            className={cn(
              'flex-1 h-12 px-4 rounded-xl bg-white/15 backdrop-blur-md text-white placeholder:text-white/60',
              'ring-1 ring-inset ring-white/25 focus:ring-white/50 outline-none transition',
              'text-sm font-medium',
            )}
            disabled={loading || ok}
          />
          <button
            type="submit"
            disabled={loading || ok}
            className={cn(
              'h-12 px-5 rounded-xl font-bold text-sm',
              'bg-white text-brand-700 hover:bg-white/90',
              'flex items-center gap-1.5 shrink-0',
              'transition-all disabled:opacity-70',
            )}
          >
            {ok ? <Check className="h-4 w-4" /> : loading ? (
              <span className="h-4 w-4 border-2 border-brand-700 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {t('footer.newsletterCta')}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
