'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // Simulated send (replace with real API)
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-10 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">Message Sent!</h3>
        <p className="mt-3 text-emerald-700 dark:text-emerald-400">
          Hum aap se 24 hours mein contact karenge. Shukriya!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Aap ka Naam</label>
          <input
            required
            type="text"
            className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="Ahmad Ali"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Email</label>
          <input
            required
            type="email"
            className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="ahmad@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Phone Number</label>
        <input
          required
          type="tel"
          className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder="+923001234567"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Business Type</label>
        <select className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 text-sm">
          <option>Bakery</option>
          <option>Kiryana Store</option>
          <option>Mobile Shop</option>
          <option>Pharmacy</option>
          <option>Restaurant</option>
          <option>Garments</option>
          <option>Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Aap ka Message</label>
        <textarea
          required
          rows={5}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder="Apna sawal ya zaroorat likhein..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-13 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 text-white font-bold text-base inline-flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30 hover:shadow-xl transition-all disabled:opacity-60"
      >
        {loading ? 'Sending...' : (
          <>
            Send Message <Send className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
