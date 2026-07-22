import { useCallback } from 'react';
import { useLocaleStore } from '@/store/locale.store';
import en from './messages/en.json';
import ur from './messages/ur.json';

const messages = { en, ur } as const;

type Messages = typeof en;
type Locale = keyof typeof messages;

function get(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale) as Locale;
  const isRTL = useLocaleStore((s) => s.isRTL);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const dict = messages[locale] || messages.en;
      let value = get(dict, key);
      if (value == null) {
        value = get(messages.en, key) ?? key;
      }
      if (vars && typeof value === 'string') {
        return value.replace(/\{\{(\w+)\}\}/g, (_, k) =>
          vars[k] != null ? String(vars[k]) : `{{${k}}}`,
        );
      }
      return value as string;
    },
    [locale],
  );

  return { t, locale, isRTL };
}

export type TranslationKey = keyof Messages;
