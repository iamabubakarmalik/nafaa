'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { defaultLocale, localeDirs, type Locale } from '@/i18n/config';
import enMessages from '@/i18n/messages/en.json';
import urMessages from '@/i18n/messages/ur.json';

const messages: Record<Locale, any> = { en: enMessages, ur: urMessages };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function getNested(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem('nafaa-locale')) as Locale | null;
    if (stored && (stored === 'en' || stored === 'ur')) {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirs[locale];
    document.body.dir = localeDirs[locale];
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem('nafaa-locale', l);
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    let val = getNested(messages[locale], key);
    if (typeof val !== 'string') val = getNested(messages.en, key) ?? key;
    if (vars && typeof val === 'string') {
      Object.entries(vars).forEach(([k, v]) => {
        val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return val ?? key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, dir: localeDirs[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
