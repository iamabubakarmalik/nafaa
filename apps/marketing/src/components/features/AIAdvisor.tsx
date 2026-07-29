'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: Array<{ label: string; path: string }>;
}

const responses = {
  bakery: {
    en: 'For a bakery, I recommend the Pro plan with these features: custom cake orders, ingredient inventory, expiry tracking, and Foodpanda integration for delivery. Setup takes about 15 minutes.',
    ur: 'بیکری کے لیے، میں پرو پلان تجویز کرتا ہوں: خصوصی کیک آرڈرز، اجزاء انوینٹری، ایکسپائری ٹریکنگ، اور فوڈ پانڈا انضمام۔',
    suggestions: [
      { label: 'Bakery guide', path: '/industries/bakery' },
      { label: 'Pricing', path: '/pricing' },
    ],
  },
  restaurant: {
    en: 'For a restaurant, Nafaa handles tables, KOT to kitchen, Foodpanda orders, and delivery riders. Multi-cashier support and split billing included from the Growth plan.',
    ur: 'ریسٹورنٹ کے لیے، نفع ٹیبلز، کچن کے او ٹی، فوڈ پانڈا، اور ڈیلیوری سنبھالتا ہے۔',
    suggestions: [
      { label: 'Restaurant features', path: '/industries/restaurant' },
      { label: 'Foodpanda setup', path: '/integrations/foodpanda' },
    ],
  },
  pharmacy: {
    en: 'For a pharmacy, you need DRAP compliance, batch and expiry tracking, and salt-based medicine search. All available on the Growth plan with Rs 2,500/month pricing.',
    ur: 'فارمیسی کے لیے، آپ کو ڈریپ تعمیل، بیچ ٹریکنگ، اور سالٹ کی بنیاد پر تلاش چاہیے۔',
    suggestions: [
      { label: 'Pharmacy software', path: '/industries/pharmacy' },
      { label: 'DRAP guide', path: '/blog/pharmacy-drap-compliance-guide' },
    ],
  },
  kiryana: {
    en: 'For a kiryana store, you get barcode POS, digital khata with WhatsApp reminders, multi-unit pricing (kg/gram/piece), and Excel bulk import — all in the free plan!',
    ur: 'کریانہ اسٹور کے لیے، آپ کو بار کوڈ پی او ایس، ڈجیٹل کھاتہ، متعدد یونٹ قیمتیں مفت پلان میں ملیں گی۔',
    suggestions: [
      { label: 'Kiryana features', path: '/industries/kiryana' },
      { label: 'Start free', path: '/pricing' },
    ],
  },
  price: {
    en: 'Nafaa has 4 plans: Starter (Free), Growth (Rs 2,500/mo), Pro (Rs 5,500/mo), and Enterprise (custom). All paid plans include a 30-day money-back guarantee.',
    ur: 'نفع کے ۴ پلان ہیں: مفت اسٹارٹر، گروتھ (۲۵۰۰ روپے)، پرو (۵۵۰۰ روپے)، اور انٹرپرائز۔',
    suggestions: [
      { label: 'See pricing', path: '/pricing' },
      { label: 'ROI calculator', path: '/roi-calculator' },
    ],
  },
  fbr: {
    en: 'FBR POS integration is included in Pro plan and above. Setup takes 12 minutes. Every sale submits real-time with QR codes on receipts. Fully compliant, audit-ready.',
    ur: 'ایف بی آر پی او ایس انضمام پرو پلان میں شامل ہے۔ ۱۲ منٹ میں سیٹ اپ، ہر سیل حقیقی وقت میں جمع۔',
    suggestions: [
      { label: 'FBR integration', path: '/integrations/fbr' },
      { label: 'Compliance guide', path: '/blog/fbr-pos-integration-guide-pakistan' },
    ],
  },
  default: {
    en: 'I can help you find the right Nafaa solution! Tell me about your business — what industry, how many shops, and I\'ll recommend the perfect setup.',
    ur: 'میں آپ کو صحیح نفع حل تلاش کرنے میں مدد کر سکتا ہوں! اپنے کاروبار کے بارے میں بتائیں۔',
    suggestions: [
      { label: 'See industries', path: '/industries' },
      { label: 'Compare plans', path: '/pricing' },
    ],
  },
};

function findResponse(query: string): typeof responses['default'] {
  const q = query.toLowerCase();
  if (q.includes('bakery') || q.includes('cake') || q.includes('بیکری')) return responses.bakery;
  if (q.includes('restaurant') || q.includes('food') || q.includes('ریسٹورنٹ')) return responses.restaurant;
  if (q.includes('pharma') || q.includes('medicine') || q.includes('فارمیسی')) return responses.pharmacy;
  if (q.includes('kiryana') || q.includes('grocery') || q.includes('کریانہ')) return responses.kiryana;
  if (q.includes('price') || q.includes('cost') || q.includes('قیمت')) return responses.price;
  if (q.includes('fbr') || q.includes('tax') || q.includes('ایف بی آر')) return responses.fbr;
  return responses.default;
}

export function AIAdvisor() {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [visible, setVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUr = locale === 'ur';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: isUr
          ? 'السلام علیکم! میں نفع کا اے آئی معاون ہوں۔ اپنے کاروبار کے بارے میں پوچھیں — بیکری، فارمیسی، کریانہ، ریسٹورنٹ، جو بھی۔'
          : 'Hi! I\'m Nafaa\'s AI Business Advisor. Ask me about your business — bakery, pharmacy, kiryana, restaurant, anything.',
        suggestions: [
          { label: isUr ? 'میں بیکری کھول رہا ہوں' : 'I run a bakery', path: '' },
          { label: isUr ? 'ریسٹورنٹ کے لیے مدد' : 'Help me with restaurant', path: '' },
          { label: isUr ? 'قیمتیں بتائیں' : 'What are the prices?', path: '' },
        ],
      }]);
    }
  }, [open, isUr, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const q = text || input;
    if (!q.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setInput('');
    setThinking(true);

    await new Promise((r) => setTimeout(r, 800));

    const resp = findResponse(q);
    setMessages((prev) => [...prev, {
      role: 'assistant',
      content: isUr ? resp.ur : resp.en,
      suggestions: resp.suggestions.map((s) => ({ label: s.label, path: s.path })),
    }]);
    setThinking(false);
  };

  return (
    <>
      <AnimatePresence>
        {visible && !open && (
          <motion.button
            initial={{ opacity: 0, scale: 0, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={() => setOpen(true)}
            className={cn(
              'fixed bottom-24 right-6 rtl:left-6 rtl:right-auto z-[75]',
              'h-14 px-5 rounded-full bg-gradient-to-r from-aurora-purple via-aurora-pink to-sunset',
              'text-white font-bold text-sm shadow-2xl',
              'flex items-center gap-2 hover:scale-105 transition-transform',
            )}
          >
            <Sparkles className="h-5 w-5" />
            {isUr ? 'اے آئی سے پوچھیں' : 'Ask AI'}
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[89] bg-ink-950/60 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              className={cn(
                'fixed bottom-6 right-6 rtl:left-6 rtl:right-auto z-[90]',
                'w-[calc(100vw-3rem)] max-w-md h-[600px] max-h-[80vh]',
                'rounded-3xl bg-white dark:bg-ink-900 shadow-2xl ring-1 ring-inset ring-ink-200 dark:ring-ink-700',
                'flex flex-col overflow-hidden',
              )}
            >
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-aurora-purple to-aurora-pink text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/25 flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display font-extrabold">
                      {isUr ? 'نفع اے آئی معاون' : 'Nafaa AI Advisor'}
                    </div>
                    <div className="text-[10px] opacity-90 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      {isUr ? 'آن لائن' : 'Online'}
                    </div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={cn('flex gap-2', m.role === 'user' && 'flex-row-reverse')}>
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                      m.role === 'user' ? 'bg-brand-500' : 'bg-gradient-to-br from-aurora-purple to-aurora-pink',
                    )}>
                      {m.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                    </div>
                    <div className={cn('max-w-[80%] flex flex-col gap-2', m.role === 'user' && 'items-end')}>
                      <div className={cn(
                        'rounded-2xl p-3 text-sm leading-relaxed',
                        m.role === 'user'
                          ? 'bg-brand-500 text-white rounded-tr-sm'
                          : 'bg-ink-100 dark:bg-ink-800 text-ink-900 dark:text-white rounded-tl-sm',
                        isUr && 'font-urdu text-base',
                      )}>
                        {m.content}
                      </div>
                      {m.suggestions && m.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.suggestions.map((s) => (
                            s.path
                              ? <a key={s.label} href={s.path} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-200 dark:ring-brand-800/50 hover:bg-brand-100 dark:hover:bg-brand-950 transition">{s.label}</a>
                              : <button key={s.label} onClick={() => send(s.label)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700 transition">{s.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-aurora-purple to-aurora-pink flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="rounded-2xl bg-ink-100 dark:bg-ink-800 p-3 flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-ink-400 animate-bounce" />
                      <span className="h-2 w-2 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="h-2 w-2 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-4 border-t border-ink-100 dark:border-ink-800 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isUr ? 'اپنا سوال لکھیں...' : 'Type your question...'}
                  className={cn(
                    'flex-1 h-11 px-4 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none',
                    'focus:ring-2 focus:ring-brand-500 text-sm',
                    isUr && 'font-urdu text-base',
                  )}
                />
                <button type="submit" disabled={!input.trim() || thinking}
                  className="h-11 w-11 rounded-xl bg-gradient-to-r from-aurora-purple to-aurora-pink text-white flex items-center justify-center disabled:opacity-50 hover:-translate-y-0.5 transition">
                  {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
