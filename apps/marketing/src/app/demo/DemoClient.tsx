'use client';

import { useState } from 'react';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';

export function DemoForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    industry: 'Kiryana Store',
    preferredDate: '',
    preferredTime: '14:00',
    message: '',
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sourceUrl: window.location.href }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Booking failed');
      setSubmitted(true);
      toast.success('Demo booked — we\'ll confirm on WhatsApp shortly');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-10 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-display font-extrabold text-emerald-700 dark:text-emerald-300">
          Demo booked
        </h3>
        <p className="mt-2 text-emerald-700 dark:text-emerald-400">
          Our team will confirm your slot on WhatsApp within a few hours.
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
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2">Business type</label>
          <select name="industry" value={form.industry} onChange={onChange} className={inputCls}>
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
          <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2">Preferred time</label>
          <select name="preferredTime" value={form.preferredTime} onChange={onChange} className={inputCls}>
            <option value="11:00">11:00 AM</option>
            <option value="14:00">2:00 PM</option>
            <option value="17:00">5:00 PM</option>
            <option value="20:00">8:00 PM</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2">Preferred date</label>
        <input name="preferredDate" type="date" value={form.preferredDate} onChange={onChange} className={inputCls} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2">What would you like to see?</label>
        <textarea name="message" value={form.message} onChange={onChange} rows={4} placeholder="e.g. Inventory, khata/udhaar, reports..." className={cn(inputCls, 'h-auto py-3 resize-none')} />
      </div>
      <Button type="submit" size="lg" fullWidth loading={loading} rightIcon={!loading && <CalendarCheck className="h-4 w-4" />}>
        {loading ? 'Booking' : 'Book my free demo'}
      </Button>
    </form>
  );
}
