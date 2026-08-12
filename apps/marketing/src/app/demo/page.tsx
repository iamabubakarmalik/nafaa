import type { Metadata } from 'next';
import { DemoForm } from './DemoClient';

export const metadata: Metadata = {
  title: 'Book a Free Demo — Nafaa',
  description: 'See Nafaa POS in action. Book a free 30-minute demo in English or Urdu.',
};

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-ink-0 dark:bg-ink-900 py-16 lg:py-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="text-eyebrow font-mono text-brand-600 dark:text-brand-400">Free Demo</div>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-ink-900 dark:text-white">
            See Nafaa in action
          </h1>
          <p className="mt-3 text-ink-600 dark:text-ink-300">
            30 minutes · English or Urdu · No commitment — hum aapko sab kuch live dikhayenge.
          </p>
        </div>
        <DemoForm />
      </div>
    </main>
  );
}
