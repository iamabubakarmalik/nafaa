'use client';

import { useState } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';

type FormState = {
  name: string;
  email: string;
  phone: string;
  businessType: string;
  message: string;
};

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    businessType: 'Bakery',
    message: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // simulate API
    await new Promise((r) => setTimeout(r, 1200));

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-10 text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
          Message Sent Successfully
        </h3>
        <p className="mt-2 text-emerald-700 dark:text-emerald-400">
          Hum 24 hours ke andar aap ko reply karenge.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xl space-y-5"
    >
      {/* Name + Email */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Aap ka Naam
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Ahmad Ali"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Email
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="ahmad@example.com"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Phone Number
        </label>
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
          placeholder="+923001234567"
          className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Business Type */}
      <div>
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Business Type
        </label>
        <select
          name="businessType"
          value={form.businessType}
          onChange={handleChange}
          className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option>Bakery</option>
          <option>Kiryana Store</option>
          <option>Mobile Shop</option>
          <option>Pharmacy</option>
        </select>
      </div>

      {/* Message */}
      <div>
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Message
        </label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          required
          rows={5}
          placeholder="Apna sawal ya zaroorat likhein..."
          className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 text-white font-bold py-3 flex items-center justify-center gap-2 hover:scale-[1.02] transition disabled:opacity-60"
      >
        {loading ? (
          <>
            Sending <Loader2 className="h-4 w-4 animate-spin" />
          </>
        ) : (
          <>
            Send Message <Send className="h-4 w-4" />
          </>
        )}
      </button>

      {/* WhatsApp fallback */}
      <a
        href="https://wa.me/923241772933"
        target="_blank"
        className="flex items-center justify-center gap-2 text-sm font-semibold text-green-600 hover:underline"
      >
        <MessageCircle size={16} />
        Ya WhatsApp par direct baat karein
      </a>
    </form>
  );
}
