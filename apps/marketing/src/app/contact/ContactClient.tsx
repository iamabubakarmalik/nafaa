'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessType: 'Kiryana Store',
    message: '',
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sourceUrl: window.location.href }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Send failed');
      setSubmitted(true);
      toast.success('Message received — we\'ll reply within 24 hours');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong — please try WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-10 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-display font-extrabold text-emerald-700 dark:text-emerald-300">
          Message received
        </h3>
        <p className="mt-2 text-emerald-700 dark:text-emerald-400">
          We\'ll reply within 24 hours. For urgent queries, WhatsApp us directly.
        </p>
      </div>
    );
  }

  const inputCls = 'w-full h-12 px-4 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-base';

  return (
    <form onSubmit={onSubmit} className="rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 shadow-lg space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2">Your name</label>
          <input name="name" value={form.name} onChange={onChange} required placeholder="Ahmad Ali" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2">Email</label>
          <input name="email" type="email" value={form.email} onChange={onChange} required placeholder="ahmad@company.pk" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2">Phone / WhatsApp</label>
        <input name="phone" value={form.phone} onChange={onChange} required placeholder="+92 300 1234567" className={inputCls} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2">Business type</label>
        <select name="businessType" value={form.businessType} onChange={onChange} className={inputCls}>
          <option>Kiryana Store</option>
          <option>Bakery</option>
          <option>Restaurant</option>
          <option>Pharmacy</option>
          <option>Mobile Shop</option>
          <option>Garments</option>
          <option>Salon</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2">How can we help?</label>
        <textarea name="message" value={form.message} onChange={onChange} required rows={5} placeholder="Tell us about your business and what you\'re looking for..." className={cn(inputCls, 'h-auto py-3 resize-none')} />
      </div>
      <Button type="submit" size="lg" fullWidth loading={loading} rightIcon={!loading && <Send className="h-4 w-4" />}>
        {loading ? 'Sending' : 'Send message'}
      </Button>
    </form>
  );
}
