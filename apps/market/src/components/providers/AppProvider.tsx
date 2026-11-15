'use client';
/**
 * App-wide client state: language and dictionary, the Market config (gates),
 * the customer's location, a toast line and the cart. Server pages pass the
 * initial values from the [lang] layout.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ClientError, isSignedIn, m } from '@/lib/client';
import { getDict, href as hrefFor, makeT, type TFn } from '@/lib/i18n';
import { LOC_COOKIE, type Loc } from '@/lib/location';
import type { Cart, GateDef, Lang } from '@/lib/types';

interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'error';
  action?: { label: string; href: string };
}

interface AppCtx {
  lang: Lang;
  t: TFn;
  href: (path: string) => string;
  gates: GateDef[];
  payments: string[];
  cities: string[];
  loc: Loc | null;
  setLoc: (l: Loc) => void;
  toast: (text: string, tone?: Toast['tone'], action?: Toast['action']) => void;
  /** Customer-safe message for a failed call. */
  errorText: (e: unknown) => string;
  signedIn: boolean;
  setSignedIn: (v: boolean) => void;
  cart: Cart | null;
  cartCount: number;
  setCart: (c: Cart | null) => void;
  refreshCart: () => Promise<void>;
  /** Sends a signed-out visitor to /login and returns false. */
  requireSignIn: () => boolean;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

export function AppProvider(props: { lang: Lang; gates: GateDef[]; payments: string[]; cities: string[]; loc: Loc | null; children: ReactNode }) {
  const { lang } = props;
  const router = useRouter();
  const t = useMemo(() => makeT(getDict(lang)), [lang]);
  const [loc, setLocState] = useState<Loc | null>(props.loc);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const seq = useRef(0);

  const toast = useCallback<AppCtx['toast']>((text, tone = 'ok', action) => {
    const id = ++seq.current;
    setToasts((x) => [...x.slice(-2), { id, text, tone, action }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3500);
  }, []);

  const errorText = useCallback(
    (e: unknown) => {
      if (e instanceof ClientError) {
        if (e.code === 'NETWORK' || e.status === 0 || e.status === 503) return t('common.networkError');
        if (e.userMessage) return e.userMessage;
      }
      return t('common.errorGeneric');
    },
    [t],
  );

  const refreshCart = useCallback(async () => {
    if (!isSignedIn()) {
      setCart(null);
      return;
    }
    try {
      setCart(await m<Cart>('cart'));
    } catch (e) {
      if (e instanceof ClientError && e.status === 401) setSignedIn(false);
    }
  }, []);

  useEffect(() => {
    const on = isSignedIn();
    setSignedIn(on);
    if (on) void refreshCart();
  }, [refreshCart]);

  const setLoc = useCallback(
    (l: Loc) => {
      setLocState(l);
      document.cookie = `${LOC_COOKIE}=${encodeURIComponent(JSON.stringify(l))}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      router.refresh();
    },
    [router],
  );

  const href = useCallback((p: string) => hrefFor(lang, p), [lang]);

  const requireSignIn = useCallback(() => {
    if (isSignedIn()) return true;
    const next = window.location.pathname + window.location.search;
    router.push(`${hrefFor(lang, '/login')}?next=${encodeURIComponent(next)}`);
    return false;
  }, [lang, router]);

  const value: AppCtx = {
    lang, t, href, gates: props.gates, payments: props.payments, cities: props.cities, loc, setLoc, toast, errorText,
    signedIn, setSignedIn, cart, cartCount: cart?.totalItems ?? 0, setCart, refreshCart, requireSignIn,
  };

  return (
    <Ctx.Provider value={value}>
      {props.children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-nav)+1rem)] z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((x) => (
          <div key={x.id} className={`pointer-events-auto flex max-w-md animate-slide-up items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-soft-lg ${x.tone === 'error' ? 'bg-red-600 text-white' : 'bg-ink-900 text-white'}`}>
            <span>{x.text}</span>
            {x.action && (
              <Link href={x.action.href} className="whitespace-nowrap font-bold text-brand-300 underline-offset-2 hover:underline">
                {x.action.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
