'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Sparkles } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { trackEvent } from '@/lib/analytics/events';
import { industries } from '@/lib/data/industries';
import { integrations } from '@/lib/data/integrations';
import { features } from '@/lib/data/features';
import { cn } from '@/lib/cn';

interface SpeechRecognitionEvent extends Event {
  results: any;
  resultIndex: number;
}

export function VoiceSearch() {
  const { locale } = useLocale();
  const router = useRouter();
  const [listening, setListening] = useState(false);
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isUr = locale === 'ur';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) setSupported(true);
  }, []);

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    trackEvent('voice_search', { locale });
    const rec = new SR();
    rec.lang = isUr ? 'ur-PK' : 'en-PK';
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setTranscript(text);
      if (e.results[e.results.length - 1].isFinal) {
        handleQuery(text);
      }
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setOpen(true);
    setTranscript('');
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleQuery = (text: string) => {
    const q = text.toLowerCase();

    // Industry match
    for (const ind of industries) {
      if (q.includes(ind.slug) || q.includes(ind.nameEn.toLowerCase())) {
        router.push(`/industries/${ind.slug}`);
        setOpen(false);
        return;
      }
    }
    // Integration match
    for (const it of integrations) {
      if (q.includes(it.slug) || q.includes(it.name.toLowerCase())) {
        router.push(`/integrations/${it.slug}`);
        setOpen(false);
        return;
      }
    }
    // Feature match
    for (const f of features) {
      if (q.includes(f.slug) || q.includes(f.nameEn.toLowerCase())) {
        router.push(`/product/${f.slug}`);
        setOpen(false);
        return;
      }
    }
    // Common keywords
    if (q.includes('price') || q.includes('cost') || q.includes('قیمت')) { router.push('/pricing'); setOpen(false); return; }
    if (q.includes('contact') || q.includes('رابطہ')) { router.push('/contact'); setOpen(false); return; }
    if (q.includes('marketplace') || q.includes('bazaar') || q.includes('بازار')) { router.push('/marketplace'); setOpen(false); return; }
    if (q.includes('download') || q.includes('ڈاؤن')) { router.push('/download'); setOpen(false); return; }

    // Default → blog search
    router.push('/blog');
    setOpen(false);
  };

  if (!supported) return null;

  return (
    <>
      <button
        onClick={start}
        aria-label={isUr ? 'آواز سے تلاش' : 'Voice search'}
        className={cn(
          'h-10 w-10 rounded-xl flex items-center justify-center transition-all',
          'bg-gradient-brand text-white shadow-brand-glow hover:scale-110',
        )}
      >
        <Mic className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-ink-950/80 backdrop-blur-sm"
              onClick={() => { stop(); setOpen(false); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[101] max-w-lg mx-auto rounded-3xl bg-white dark:bg-ink-900 p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest font-bold text-brand-600">
                  <Sparkles className="h-4 w-4" />
                  {isUr ? 'آواز سے تلاش' : 'Voice search'}
                </div>
                <button onClick={() => { stop(); setOpen(false); }} className="h-8 w-8 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="text-center py-8">
                <div className="relative inline-flex">
                  {listening && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-brand-500/30 animate-ping" />
                      <span className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" style={{ animationDelay: '0.5s' }} />
                    </>
                  )}
                  <div className={cn(
                    'relative h-20 w-20 rounded-full flex items-center justify-center transition-all',
                    listening ? 'bg-gradient-brand shadow-brand-glow' : 'bg-ink-100 dark:bg-ink-800',
                  )}>
                    {listening ? <Mic className="h-8 w-8 text-white" /> : <MicOff className="h-8 w-8 text-ink-500" />}
                  </div>
                </div>

                <div className={cn('mt-6 font-display font-bold text-lg', isUr && 'font-urdu text-xl')}>
                  {listening
                    ? (isUr ? 'سن رہا ہوں...' : 'Listening...')
                    : (isUr ? 'کچھ کہیں' : 'Say something')}
                </div>

                {transcript && (
                  <div className={cn('mt-4 p-4 rounded-xl bg-ink-50 dark:bg-ink-800 text-left', isUr && 'font-urdu text-lg')}>
                    {transcript}
                  </div>
                )}

                <div className={cn('mt-6 text-sm text-ink-500', isUr && 'font-urdu text-base')}>
                  {isUr ? 'مثال: "بیکری کے لیے سافٹ ویئر" یا "فوڈ پانڈا انضمام"' : 'Try: "bakery software" or "Foodpanda integration"'}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
