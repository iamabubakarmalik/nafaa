'use client';

/** WhatsApp number or email sign-up, stored as a store customer with consent. */
import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { sf } from '@/lib/client/sf';
import { isPkMobile } from '@/lib/format';
import { useStore } from '../providers/StoreProvider';

export function NewsletterForm({ mode, source, dark, buttonLabel }: { mode: 'whatsapp' | 'email'; source: string; dark?: boolean; buttonLabel?: string }) {
  const { t } = useStore();
  const [v, setV] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'bad'>('idle');
  if (state === 'done') {
    return (
      <p className="flex items-center gap-2 text-[15px] font-medium">
        <Check size={18} /> {t('newsletter.done')}
      </p>
    );
  }
  return (
    <form
      className="flex w-full max-w-md gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = mode === 'whatsapp' ? isPkMobile(v) : /^\S+@\S+\.\S+$/.test(v);
        if (!ok) return setState('bad');
        setState('busy');
        try {
          await sf('subscribe', mode === 'whatsapp' ? { phone: v, source } : { email: v, source });
          setState('done');
        } catch {
          setState('bad');
        }
      }}
    >
      <input
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          if (state === 'bad') setState('idle');
        }}
        type={mode === 'whatsapp' ? 'tel' : 'email'}
        inputMode={mode === 'whatsapp' ? 'tel' : 'email'}
        placeholder={mode === 'whatsapp' ? t('newsletter.placeholderPhone') : t('newsletter.placeholderEmail')}
        aria-invalid={state === 'bad'}
        className={`field min-w-0 flex-1 ${dark ? '!border-fg/25 !bg-fg/10 placeholder:!text-fg/60' : ''}`}
      />
      <button type="submit" className="btn btn-primary" disabled={state === 'busy'}>
        {state === 'busy' ? <Loader2 size={18} className="animate-spin" /> : buttonLabel || t('newsletter.join')}
      </button>
    </form>
  );
}
