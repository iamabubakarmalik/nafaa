'use client';

/** Shown while the store is in password mode (not launched yet). */
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { sf } from '@/lib/client/sf';
import { useStore } from '../providers/StoreProvider';

export function PasswordPage({ message, logoUrl }: { message: string | null; logoUrl: string | null }) {
  const { t, shop } = useStore();
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="w-full max-w-md rounded-card bg-bg p-8 text-center shadow-card">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={shop.name} className="mx-auto mb-5 max-h-14" />
        ) : (
          <p className="h-display mb-5 font-heading text-3xl font-semibold">{shop.name}</p>
        )}
        <h1 className="text-xl font-semibold">{t('password.title')}</h1>
        <p className="mt-2 text-[15px] text-muted">{message || t('password.text')}</p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setBad(false);
            try {
              await sf('unlock', { password: pw });
              router.refresh();
            } catch {
              setBad(true);
              setBusy(false);
            }
          }}
        >
          <div className="relative flex-1">
            <Lock size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input type="password" className="field ps-10" placeholder={t('password.label')} value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={bad} />
          </div>
          <button className="btn btn-primary" disabled={busy || !pw}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : t('password.enter')}
          </button>
        </form>
        {bad && <p className="mt-2 text-[13px] text-sale">{t('password.wrong')}</p>}
        <p className="mt-8 text-[12.5px] text-muted">{t('password.owner')}</p>
      </div>
    </main>
  );
}
